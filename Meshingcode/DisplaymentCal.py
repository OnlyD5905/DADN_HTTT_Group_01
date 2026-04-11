import numpy as np
import matplotlib.pyplot as plt

def uniform_mesh(d1, d2, p, m, element_type):
    problem_dimension = 2
    num_nodes = (p + 1) * (m + 1)
    
    if element_type == 'D2QU4N':
        nodes_per_element = 4
    elif element_type == 'D2TR3N':
        nodes_per_element = 4 
        
    num_elements = p * m
    NL = np.zeros((num_nodes, problem_dimension))
    a = d1 / p
    b = d2 / m
    n = 0
    for i in range(1, m + 2):
        for j in range(1, p + 2):
            NL[n, 0] = (j - 1) * a
            NL[n, 1] = (i - 1) * b
            n += 1
            
    EL = np.zeros((num_elements, nodes_per_element))
    for i in range(1, m + 1):
        for j in range(1, p + 1):
            idx = (i - 1) * p + j - 1
            if j == 1:
                EL[idx, 0] = (i - 1) * (p + 1) + j
                EL[idx, 1] = EL[idx, 0] + 1
                EL[idx, 3] = EL[idx, 0] + p + 1
                EL[idx, 2] = EL[idx, 3] + 1
            else:
                EL[idx, 0] = EL[idx - 1, 1]
                EL[idx, 3] = EL[idx - 1, 2]
                EL[idx, 1] = EL[idx, 0] + 1
                EL[idx, 2] = EL[idx, 3] + 1
                
    if element_type == 'D2TR3N':
        nel_new = 2 * num_elements
        EL_new = np.zeros((nel_new, 3))
        for i in range(1, num_elements + 1):
            EL_new[(i - 1) * 2, 0] = EL[i - 1, 0]
            EL_new[(i - 1) * 2, 1] = EL[i - 1, 1]
            EL_new[(i - 1) * 2, 2] = EL[i - 1, 2]
            
            EL_new[(i - 1) * 2 + 1, 0] = EL[i - 1, 0]
            EL_new[(i - 1) * 2 + 1, 1] = EL[i - 1, 2]
            EL_new[(i - 1) * 2 + 1, 2] = EL[i - 1, 3]
            
        EL = EL_new.astype(int)
    else:
        EL = EL.astype(int)
        
    return NL, EL - 1

def shape_function_derivatives_q4(xi, eta):
    return 0.25 * np.array([
        [-(1 - eta),  (1 - eta), (1 + eta), -(1 + eta)],
        [-(1 - xi), -(1 + xi), (1 + xi),  (1 - xi)]
    ])

def solve_fea(NL, EL, E, nu, load_val, element_type, plane_state, bc_type):
    num_nodes = len(NL)
    
    if plane_state == 'PLANE_STRESS':
        C = (E / (1 - nu**2)) * np.array([
            [1, nu, 0],
            [nu, 1, 0],
            [0, 0, (1 - nu) / 2]
        ])
    elif plane_state == 'PLANE_STRAIN':
        C = (E / ((1 + nu) * (1 - 2 * nu))) * np.array([
            [1 - nu, nu, 0],
            [nu, 1 - nu, 0],
            [0, 0, (1 - 2 * nu) / 2]
        ])
    else:
        raise ValueError("Trạng thái vật lý không hợp lệ!")
    
    K_global = np.zeros((2 * num_nodes, 2 * num_nodes))
    F_global = np.zeros((2 * num_nodes, 1))
    
    if element_type == 'D2TR3N':
        for el in EL:
            n1, n2, n3 = el
            x1, y1 = NL[n1]
            x2, y2 = NL[n2]
            x3, y3 = NL[n3]
            
            A = 0.5 * abs(x1*(y2 - y3) + x2*(y3 - y1) + x3*(y1 - y2))
            
            B = (1 / (2 * A)) * np.array([
                [y2 - y3, 0, y3 - y1, 0, y1 - y2, 0],
                [0, x3 - x2, 0, x1 - x3, 0, x2 - x1],
                [x3 - x2, y2 - y3, x1 - x3, y3 - y1, x2 - x1, y1 - y2]
            ])
            
            K_e = B.T @ C @ B * A
            
            dofs = [2*n1, 2*n1+1, 2*n2, 2*n2+1, 2*n3, 2*n3+1]
            for i in range(6):
                for j in range(6):
                    K_global[dofs[i], dofs[j]] += K_e[i, j]
                    
    elif element_type == 'D2QU4N':
        gauss_pts = [-1/np.sqrt(3), 1/np.sqrt(3)]
        for el in EL:
            node_coords = NL[el, :]
            K_e = np.zeros((8, 8))
            
            for xi in gauss_pts:
                for eta in gauss_pts:
                    dN_dxi = shape_function_derivatives_q4(xi, eta)
                    J = dN_dxi @ node_coords
                    detJ = np.linalg.det(J)
                    invJ = np.linalg.inv(J)
                    dN_dx = invJ @ dN_dxi
                    
                    B = np.zeros((3, 8))
                    B[0, 0::2] = dN_dx[0, :]
                    B[1, 1::2] = dN_dx[1, :]
                    B[2, 0::2] = dN_dx[1, :]
                    B[2, 1::2] = dN_dx[0, :]
                    
                    K_e += B.T @ C @ B * detJ
                    
            dofs = [2*el[0], 2*el[0]+1, 2*el[1], 2*el[1]+1, 2*el[2], 2*el[2]+1, 2*el[3], 2*el[3]+1]
            for i in range(8):
                for j in range(8):
                    K_global[dofs[i], dofs[j]] += K_e[i, j]
            
    fixed_dofs = [] 
    
    if bc_type == 'FIXED':
        fixed_nodes = np.where(np.isclose(NL[:, 0], 0))[0] 
        for node in fixed_nodes:
            fixed_dofs.extend([2*node, 2*node+1])
            
    elif bc_type == 'HINGE_ROLLER':
        fixed_nodes = np.where(np.isclose(NL[:, 0], 0))[0]
        for node in fixed_nodes:
            if np.isclose(NL[node, 1], 0):
                fixed_dofs.extend([2*node, 2*node+1])
            else:
                fixed_dofs.append(2*node)
                
    elif bc_type == 'BEAM_SUPPORT':
        bottom_left = np.where((np.isclose(NL[:, 0], 0)) & (np.isclose(NL[:, 1], 0)))[0]
        if len(bottom_left) > 0:
            n_idx = bottom_left[0]
            fixed_dofs.extend([2*n_idx, 2*n_idx+1])
            
        bottom_right = np.where((np.isclose(NL[:, 0], np.max(NL[:, 0]))) & (np.isclose(NL[:, 1], 0)))[0]
        if len(bottom_right) > 0:
            n_idx = bottom_right[0]
            fixed_dofs.append(2*n_idx + 1)
    
    fixed_dofs = np.unique(fixed_dofs).astype(int)
    
    load_nodes = np.where(np.isclose(NL[:, 0], np.max(NL[:, 0])))[0]
    for node in load_nodes:
        F_global[2*node, 0] += load_val / len(load_nodes)
        
    all_dofs = np.arange(2 * num_nodes)
    free_dofs = np.setdiff1d(all_dofs, fixed_dofs)
    
    K_ff = K_global[np.ix_(free_dofs, free_dofs)]
    F_f = F_global[free_dofs]
    
    U_f = np.linalg.solve(K_ff, F_f)
    
    U_global = np.zeros((2 * num_nodes, 1))
    U_global[free_dofs] = U_f
    
    F_reaction = K_global @ U_global
    
    return K_global, U_global, F_reaction

if __name__ == "__main__":
    print("--- 1. NHẬP THÔNG SỐ TẠO LƯỚI ---")
    element_type = input("Nhập loại phần tử (D2QU4N hoặc D2TR3N): ").strip().upper()
    
    if element_type not in ['D2QU4N', 'D2TR3N']:
        print("Không hợp lệ! Tự động chọn D2QU4N.")
        element_type = 'D2QU4N'
        
    d1 = float(input("Nhập chiều dài d1: "))
    d2 = float(input("Nhập chiều cao d2: "))
    p = int(input("Nhập số phần tử dọc d1 (p): "))
    m = int(input("Nhập số phần tử dọc d2 (m): "))
    
    print("\n--- 2. LỰA CHỌN TRẠNG THÁI CƠ HỌC ---")
    print("1. Plane Stress (Ứng suất phẳng)")
    print("2. Plane Strain (Biến dạng phẳng)")
    state_choice = input("Chọn (1 hoặc 2) [Mặc định: 1]: ").strip()
    plane_state = 'PLANE_STRAIN' if state_choice == '2' else 'PLANE_STRESS'

    print("\n--- 3. LỰA CHỌN ĐIỀU KIỆN BIÊN ---")
    print("1. FIXED: Ngàm cố định cạnh trái")
    print("2. HINGE_ROLLER: Gối bản lề tại gốc và con lăn cạnh trái")
    print("3. BEAM_SUPPORT: Dầm 2 gối tựa")
    bc_choice = input("Chọn (1, 2 hoặc 3) [Mặc định: 1]: ").strip()
    if bc_choice == '2':
        bc_type = 'HINGE_ROLLER'
    elif bc_choice == '3':
        bc_type = 'BEAM_SUPPORT'
    else:
        bc_type = 'FIXED'
        
    print("\n--- 4. NHẬP VẬT LIỆU & TẢI TRỌNG ---")
    E = float(input("Nhập Young's Modulus (E): "))
    nu = float(input("Nhập Poisson's Ratio (nu): "))
    load_val = float(input("Nhập Tổng lực P kéo ở cạnh phải: "))
    
    NL, EL = uniform_mesh(d1, d2, p, m, element_type=element_type)
    
    K, U, F = solve_fea(NL, EL, E, nu, load_val, element_type, plane_state, bc_type)
    
    print(f"\n=========================================")
    print(f"Trạng thái: {plane_state} | BC: {bc_type}")
    print("Kích thước ma trận K:", K.shape)
    print("=========================================\n")
    
    np.set_printoptions(precision=4, suppress=True)
    print("--- VECTOR CHUYỂN VỊ U (10 giá trị đầu) ---")
    print(U[:10].T)
    print("\n--- VECTOR PHẢN LỰC/TẢI TRỌNG F (10 giá trị đầu) ---")
    print(F[:10].T)
    
    scale_factor = float(input("\nNhập hệ số phóng đại chuyển vị để vẽ đồ thị (VD: 100): "))
    NL_def = NL.copy()
    NL_def[:, 0] += U[0::2, 0] * scale_factor
    NL_def[:, 1] += U[1::2, 0] * scale_factor
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 5))
    
    for el in EL:
        pts = np.vstack((NL[el], NL[el[0]]))
        ax1.plot(pts[:, 0], pts[:, 1], 'g-', linewidth=1)
    ax1.plot(NL[:, 0], NL[:, 1], 'ro', markersize=3)
    ax1.set_title(f"Bước 1: Lưới ban đầu ({element_type})")
    ax1.axis('equal')
    
    for el in EL:
        pts = np.vstack((NL[el], NL[el[0]]))
        ax2.plot(pts[:, 0], pts[:, 1], 'k--', alpha=0.3, linewidth=1)
        
        pts_def = np.vstack((NL_def[el], NL_def[el[0]]))
        ax2.plot(pts_def[:, 0], pts_def[:, 1], 'b-', linewidth=1.5)
    ax2.plot(NL_def[:, 0], NL_def[:, 1], 'ro', markersize=3)
    ax2.set_title(f"Bước 2: Sau biến dạng ({plane_state})\nPhóng đại: {scale_factor}")
    ax2.axis('equal')
    
    plt.tight_layout()
    plt.show()