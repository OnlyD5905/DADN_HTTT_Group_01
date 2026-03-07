import numpy as np
import math
import matplotlib.pyplot as plt
from scipy.spatial import Delaunay

class Triangle:
    def __init__(self, a, b, c):
        self.a = np.array(a)
        self.b = np.array(b)
        self.c = np.array(c)

    def vertices(self):
        return [self.a, self.b, self.c]

def distance(p, q):
    return np.linalg.norm(p - q)

def triangle_angles(tri):
    A, B, C = tri.vertices()
    a = distance(B, C)
    b = distance(A, C)
    c = distance(A, B)
    
    valA = max(-1.0, min(1.0, (b*b + c*c - a*a)/(2*b*c)))
    valB = max(-1.0, min(1.0, (a*a + c*c - b*b)/(2*a*c)))
    valC = max(-1.0, min(1.0, (a*a + b*b - c*c)/(2*a*b)))
    
    return [math.degrees(math.acos(valA)), 
            math.degrees(math.acos(valB)), 
            math.degrees(math.acos(valC))]

def is_skinny(tri, min_angle=20.7):
    angles = triangle_angles(tri)
    return min(angles) < min_angle

def circumcenter(tri):
    A, B, C = tri.vertices()
    ax, ay = A
    bx, by = B
    cx, cy = C
    d = 2*(ax*(by-cy) + bx*(cy-ay) + cx*(ay-by))
    
    if abs(d) < 1e-8:
        return (A + B + C) / 3.0

    ux = ((ax**2+ay**2)*(by-cy) + (bx**2+by**2)*(cy-ay) + (cx**2+cy**2)*(ay-by)) / d
    uy = ((ax**2+ay**2)*(cx-bx) + (bx**2+by**2)*(ax-cx) + (cx**2+cy**2)*(bx-ax)) / d
    return np.array([ux, uy])

def split_triangle(tri, p):
    A, B, C = tri.vertices()
    return [Triangle(A, B, p), Triangle(B, C, p), Triangle(C, A, p)]

def delaunay_refine(mesh, iterations=3):
    for _ in range(iterations):
        new_mesh = []
        refined = False
        for tri in mesh:
            if is_skinny(tri):
                p = circumcenter(tri)
                new_mesh.extend(split_triangle(tri, p))
                refined = True
            else:
                new_mesh.append(tri)
        mesh = new_mesh
        if not refined:
            break
    return mesh

def generate_nodes(x_min, x_max, y_min, y_max, nx, ny):
    x = np.linspace(x_min, x_max, nx)
    y = np.linspace(y_min, y_max, ny)
    xv, yv = np.meshgrid(x, y)
    return np.vstack([xv.ravel(), yv.ravel()]).T

def generate_quad_elements(nx, ny):
    elements = []
    for j in range(ny - 1):
        for i in range(nx - 1):
            n1 = j * nx + i
            n2 = j * nx + i + 1
            n3 = (j + 1) * nx + i + 1
            n4 = (j + 1) * nx + i
            elements.append([n1, n2, n3, n4])
    return np.array(elements)

if __name__ == "__main__":
    print("--- NHAP THONG SO TAO LUOI ---")
    x_min = float(input("Nhap toa do x_min (vi du: 0): "))
    x_max = float(input("Nhap toa do x_max (vi du: 10): "))
    y_min = float(input("Nhap toa do y_min (vi du: 0): "))
    y_max = float(input("Nhap toa do y_max (vi du: 5): "))
    
    nx = int(input("Nhap so luong diem theo truc x (nx, vi du: 6): "))
    ny = int(input("Nhap so luong diem theo truc y (ny, vi du: 4): "))
    
    iters = int(input("Nhap so lan lap tinh chinh Refinement (iterations, vi du: 1): "))
    
    Node = generate_nodes(x_min, x_max, y_min, y_max, nx, ny)
    Elem_Quad = generate_quad_elements(nx, ny)
    
    tri = Delaunay(Node)
    Elem_Tri = tri.simplices

    custom_mesh = []
    for el in Elem_Tri:
        t = Triangle(Node[el[0]], Node[el[1]], Node[el[2]])
        custom_mesh.append(t)

    refined_mesh = delaunay_refine(custom_mesh, iterations=iters)

    fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(18, 5))

    for el in Elem_Quad:
        poly = np.vstack([Node[el], Node[el[0]]])
        ax1.plot(poly[:, 0], poly[:, 1], 'b-', linewidth=1)
    ax1.plot(Node[:, 0], Node[:, 1], 'ro', markersize=3)
    ax1.set_title("Buoc 1: Tao luoi (Quad Mesh)")
    ax1.axis('equal')

    ax2.triplot(Node[:, 0], Node[:, 1], Elem_Tri, 'b-', linewidth=1)
    ax2.plot(Node[:, 0], Node[:, 1], 'ro', markersize=3)
    ax2.set_title(f"Buoc 2: Luoi Delaunay ({len(Elem_Tri)} tam giac)")
    ax2.axis('equal')

    for t in refined_mesh:
        pts = np.array([t.a, t.b, t.c, t.a])
        ax3.plot(pts[:, 0], pts[:, 1], 'b-', linewidth=1)
        ax3.plot(pts[:, 0], pts[:, 1], 'ro', markersize=2)
    ax3.set_title(f"Buoc 3: Sau khi Refine ({len(refined_mesh)} tam giac)")
    ax3.axis('equal')

    plt.tight_layout()
    plt.show()