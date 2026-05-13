import numpy as np
from scipy.sparse import lil_matrix, csr_matrix
from scipy.sparse.linalg import spsolve

class FEAEngine:
    def __init__(self, geometry, mesh_cfg, physical, loads):
        self.d1 = geometry.d1
        self.d2 = geometry.d2
        self.element_type = geometry.elementType
        self.p = mesh_cfg.p
        self.m = mesh_cfg.m
        self.E = physical.E
        self.nu = physical.nu
        self.load_val = loads.loadVal
        self.load_dir = loads.loadDirection

    def generate_mesh(self):
        num_nodes = (self.p + 1) * (self.m + 1)
        a, b = self.d1 / self.p, self.d2 / self.m
        NL = np.zeros((num_nodes, 2))
        n = 0
        for i in range(self.m + 1):
            for j in range(self.p + 1):
                NL[n, 0], NL[n, 1] = j * a, i * b
                n += 1
        
        num_elements = self.p * self.m
        EL = []
        for i in range(self.m):
            for j in range(self.p):
                n1 = i * (self.p + 1) + j
                n2, n3, n4 = n1 + 1, n1 + self.p + 2, n1 + self.p + 1
                EL.append([n1, n2, n3, n4])
        
        return NL, np.array(EL)

    def solve(self, plane_state='PLANE_STRESS', bc_type='FIXED'):
        NL, EL = self.generate_mesh()
        num_nodes = len(NL)
        
        # Thiết lập ma trận C (Vật liệu)
        if plane_state == 'PLANE_STRESS':
            C = (self.E / (1 - self.nu**2)) * np.array([[1, self.nu, 0], [self.nu, 1, 0], [0, 0, (1 - self.nu)/2]])
        else:
            C = (self.E / ((1 + self.nu)*(1 - 2*self.nu))) * np.array([[1-self.nu, self.nu, 0], [self.nu, 1-self.nu, 0], [0, 0, (1-2*self.nu)/2]])

        # Requirement 2: Sử dụng Ma trận thưa (Sparse Matrix)
        K_global = lil_matrix((2 * num_nodes, 2 * num_nodes))
        F_global = np.zeros((2 * num_nodes, 1))

        # Assembly (Lắp ghép ma trận) - Logic Q4
        gauss_pts = [-1/np.sqrt(3), 1/np.sqrt(3)]
        for el in EL:
            node_coords = NL[el, :]
            K_e = np.zeros((8, 8))
            for xi in gauss_pts:
                for eta in gauss_pts:
                    # Shape function derivatives
                    dN_dxi = 0.25 * np.array([[-(1-eta), (1-eta), (1+eta), -(1+eta)], [-(1-xi), -(1+xi), (1+xi), (1-xi)]])
                    J = dN_dxi @ node_coords
                    detJ = np.linalg.det(J)
                    invJ = np.linalg.inv(J)
                    dN_dx = invJ @ dN_dxi
                    B = np.zeros((3, 8))
                    B[0, 0::2], B[1, 1::2] = dN_dx[0, :], dN_dx[1, :]
                    B[2, 0::2], B[2, 1::2] = dN_dx[1, :], dN_dx[0, :]
                    K_e += B.T @ C @ B * detJ
            
            dofs = []
            for node in el: dofs.extend([2*node, 2*node+1])
            for i in range(8):
                for j in range(8):
                    K_global[dofs[i], dofs[j]] += K_e[i, j]

        # Áp dụng Điều kiện biên (BCs)
        fixed_dofs = []
        if bc_type == 'FIXED':
            fixed_nodes = np.where(np.isclose(NL[:, 0], 0))[0]
            for n in fixed_nodes: fixed_dofs.extend([2*n, 2*n+1])
        
        # Áp dụng Tải trọng (Loads)
        load_nodes = np.where(np.isclose(NL[:, 0], np.max(NL[:, 0])))[0]
        for n in load_nodes:
            idx = 2*n if self.load_dir == 'x' else 2*n+1
            F_global[idx, 0] += self.load_val / len(load_nodes)

        # Giải hệ phương trình (Khử bậc tự do)
        all_dofs = np.arange(2 * num_nodes)
        free_dofs = np.setdiff1d(all_dofs, fixed_dofs)
        
        K_ff = K_global[np.ix_(free_dofs, free_dofs)].tocsr() # Chuyển sang CSR để giải nhanh
        F_f = F_global[free_dofs]
        
        # Requirement 3: Bắt lỗi ma trận suy biến
        try:
            U_f = spsolve(K_ff, F_f)
        except Exception:
            raise ValueError("Ma trận độ cứng bị suy biến (Singular Matrix). Hãy kiểm tra lại điều kiện biên!")

        U_global = np.zeros(2 * num_nodes)
        U_global[free_dofs] = U_f
        
        return {
            "displacements": U_global.reshape(-1, 2).tolist(),
            "max_displacement": float(np.max(np.abs(U_global))),
            "nodes": NL.tolist(),
            "elements": EL.tolist()
        }