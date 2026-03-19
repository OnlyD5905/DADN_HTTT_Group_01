import numpy as np
import matplotlib.pyplot as plt

def uniform_mesh(d1, d2, p, m, element_type='D2TR3N'):
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

def solve_fea_triangle(NL, EL, E, nu, load_val):
    num_nodes = len(NL)
    
    C = (E / ((1 + nu) * (1 - 2 * nu))) * np.array([
        [1 - nu, nu, 0],
        [nu, 1 - nu, 0],
        [0, 0, (1 - 2 * nu) / 2]
    ])
    
    K_global = np.zeros((2 * num_nodes, 2 * num_nodes))
    F_global = np.zeros((2 * num_nodes, 1))
    
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
                
    fixed_nodes = np.where(NL[:, 0] == 0)[0]
    load_nodes = np.where(NL[:, 0] == np.max(NL[:, 0]))[0]
    
    for node in load_nodes:
        F_global[2*node, 0] = load_val / len(load_nodes)
        
    all_dofs = np.arange(2 * num_nodes)
    fixed_dofs = np.empty(0, dtype=int)
    for node in fixed_nodes:
        fixed_dofs = np.append(fixed_dofs, [2*node, 2*node+1])
        
    free_dofs = np.setdiff1d(all_dofs, fixed_dofs)
    
    K_ff = K_global[np.ix_(free_dofs, free_dofs)]
    F_f = F_global[free_dofs]
    
    U_f = np.linalg.solve(K_ff, F_f)
    
    U_global = np.zeros((2 * num_nodes, 1))
    U_global[free_dofs] = U_f
    
    F_reaction = K_global @ U_global
    
    return K_global, U_global, F_reaction

if __name__ == "__main__":
    print("--- NHAP THONG SO TAO LUOI (D2TR3N) ---")
    d1 = float(input("Nhap chieu dai d1: "))
    d2 = float(input("Nhap chieu dai d2 : "))
    p = int(input("Nhap so phan tu p : "))
    m = int(input("Nhap so phan tu m : "))
    
    print("\n--- NHAP THONG SO VAT LIEU & TAI TRONG ---")
    E = float(input("Nhap Young's Modulus (E, vi du: 200e9): "))
    nu = float(input("Nhap Poisson's Ratio (nu, vi du: 0.3): "))
    load_val = float(input("Nhap Tong luc keo ngang o canh phai (Load, vi du: 10000): "))
    
    NL, EL = uniform_mesh(d1, d2, p, m, element_type='D2TR3N')
    
    K, U, F = solve_fea_triangle(NL, EL, E, nu, load_val)
    
    print("\n=========================================")
    print("Kich thuoc ma tran K:", K.shape)
    print("Kich thuoc vector U:", U.shape)
    print("Kich thuoc vector F:", F.shape)
    print("=========================================\n")
    
    np.set_printoptions(precision=4, suppress=True)
    
    print("--- 1. MA TRAN DO CUNG K (5 hang x 5 cot dau tien) ---")
    print(K[:5, :5])
    
    print("\n--- 2. VECTOR CHUYEN VI U (10 gia tri dau tien) ---")
    print(U[:10])
    
    print("\n--- 3. VECTOR LUC F (Gom phan luc va tai trong, 10 gia tri dau) ---")
    print(F[:10])
    
    scale_factor = float(input("\nNhap he so phong dai chuyen vi de ve do thi : "))
    NL_def = NL.copy()
    NL_def[:, 0] += U[0::2, 0] * scale_factor
    NL_def[:, 1] += U[1::2, 0] * scale_factor
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 5))
    
    for el in EL:
        pts = np.array([NL[el[0]], NL[el[1]], NL[el[2]], NL[el[0]]])
        ax1.plot(pts[:, 0], pts[:, 1], 'g-', linewidth=1)
    ax1.plot(NL[:, 0], NL[:, 1], 'ro', markersize=3)
    ax1.set_title("Buoc 1: Luoi tam giac ban dau (D2TR3N)")
    ax1.axis('equal')
    
    for el in EL:
        pts = np.array([NL[el[0]], NL[el[1]], NL[el[2]], NL[el[0]]])
        ax2.plot(pts[:, 0], pts[:, 1], 'k--', alpha=0.3, linewidth=1)
        
        pts_def = np.array([NL_def[el[0]], NL_def[el[1]], NL_def[el[2]], NL_def[el[0]]])
        ax2.plot(pts_def[:, 0], pts_def[:, 1], 'b-', linewidth=1.5)
    ax2.plot(NL_def[:, 0], NL_def[:, 1], 'ro', markersize=3)
    ax2.set_title(f"Buoc 2: Luoi sau khi tinh toan (He so phong dai: {scale_factor})")
    ax2.axis('equal')
    
    plt.tight_layout()
    plt.show()