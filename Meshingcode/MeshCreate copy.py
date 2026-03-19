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
        
    return NL, EL

if __name__ == "__main__":
    print("--- NHAP THONG SO TAO LUOI (UNIFORM MESH) ---")
    d1 = float(input("Nhap chieu dai d1 (truc x, vi du: 1.0): "))
    d2 = float(input("Nhap chieu dai d2 (truc y, vi du: 1.0): "))
    p = int(input("Nhap so phan tu p (truc x, vi du: 4): "))
    m = int(input("Nhap so phan tu m (truc y, vi du: 3): "))
    element_type = input("Nhap loai phan tu ('D2QU4N' hoac 'D2TR3N'): ").strip().upper()
    
    NL, EL = uniform_mesh(d1, d2, p, m, element_type)
    
    fig, ax = plt.subplots(figsize=(8, 6))
    
    for i, (x, y) in enumerate(NL):
        ax.plot(x, y, 'ro', markersize=4)
        ax.text(x, y, str(i + 1), color='black', fontsize=10, ha='right', va='bottom')
        
    if element_type == 'D2QU4N':
        for i, el in enumerate(EL):
            pts = np.array([NL[el[0]-1], NL[el[1]-1], NL[el[2]-1], NL[el[3]-1], NL[el[0]-1]])
            ax.plot(pts[:, 0], pts[:, 1], 'b-', linewidth=1)
            cx = np.mean(pts[:-1, 0])
            cy = np.mean(pts[:-1, 1])
            ax.text(cx, cy, str(i + 1), color='red', fontsize=11, ha='center', va='center', weight='bold')
    elif element_type == 'D2TR3N':
        for i, el in enumerate(EL):
            pts = np.array([NL[el[0]-1], NL[el[1]-1], NL[el[2]-1], NL[el[0]-1]])
            ax.plot(pts[:, 0], pts[:, 1], 'g-', linewidth=1)
            cx = np.mean(pts[:-1, 0])
            cy = np.mean(pts[:-1, 1])
            ax.text(cx, cy, str(i + 1), color='red', fontsize=9, ha='center', va='center', weight='bold')
            
    ax.set_title(f"Uniform Mesh: {element_type}")
    ax.axis('equal')
    plt.show()