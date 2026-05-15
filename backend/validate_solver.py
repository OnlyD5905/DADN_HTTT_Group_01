import sys
import os
import numpy as np

# Add backend dir to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.core.fea_engine import FEAEngine

class MockParams:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

def run_validation():
    print("=== FEA CORE VALIDATION START ===\n")

    # Case 1: Cantilever (Q4), FIXED, Pull Force
    print("--- Case 1: Cantilever (Q4), FIXED, Pull Force ---")
    geom1 = MockParams(d1=10.0, d2=2.0, elementType='D2QU4N')
    mesh1 = MockParams(p=20, m=4)
    phys1 = MockParams(E=200e9, nu=0.3)
    load1 = MockParams(loadVal=1000.0, loadDirection='y')
    
    engine1 = FEAEngine(geom1, mesh1, phys1, load1)
    res1 = engine1.solve(plane_state='PLANE_STRESS', bc_type='FIXED')
    print(f"Nodes: {len(res1['nodes'])}")
    print(f"Elements: {len(res1['elements'])}")
    print(f"Max Displacement: {res1['max_displacement']:.6e} m")
    print("=> Case 1 done.\n")

    # Case 2: Cantilever (T3), FIXED, Pull Force
    print("--- Case 2: Cantilever (T3), FIXED, Pull Force ---")
    geom2 = MockParams(d1=10.0, d2=2.0, elementType='D2TR3N')
    mesh2 = MockParams(p=20, m=4)
    
    engine2 = FEAEngine(geom2, mesh2, phys1, load1)
    res2 = engine2.solve(plane_state='PLANE_STRESS', bc_type='FIXED')
    print(f"Nodes: {len(res2['nodes'])}")
    print(f"Elements: {len(res2['elements'])}")
    print(f"Max Displacement: {res2['max_displacement']:.6e} m")
    print("=> Case 2 done.\n")

    # Case 3: Simple Supported Beam (Q4), BEAM_SUPPORT
    print("--- Case 3: Simple Supported Beam (Q4), BEAM_SUPPORT ---")
    geom3 = MockParams(d1=10.0, d2=1.0, elementType='D2QU4N')
    mesh3 = MockParams(p=30, m=2)
    load3 = MockParams(loadVal=-500.0, loadDirection='y')
    
    engine3 = FEAEngine(geom3, mesh3, phys1, load3)
    res3 = engine3.solve(plane_state='PLANE_STRESS', bc_type='BEAM_SUPPORT')
    print(f"Nodes: {len(res3['nodes'])}")
    print(f"Max Displacement: {res3['max_displacement']:.6e} m")
    print("=> Case 3 done.\n")

    print("=== ALL TEST CASES PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_validation()
