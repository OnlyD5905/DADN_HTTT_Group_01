from pydantic import BaseModel, Field
from typing import Literal, Optional, List


class GeometryRequest(BaseModel):
    d1: float = Field(gt=0, description="Domain length in x-direction (m)")
    d2: float = Field(gt=0, description="Domain height in y-direction (m)")
    elementType: Literal["D2QU4N", "D2TR3N"] = Field(default="D2QU4N", description="Finite element type")
    bcType: Literal["FIXED", "HINGE_ROLLER", "BEAM_SUPPORT"] = Field(default="FIXED", description="Boundary condition type")


class MeshRequest(BaseModel):
    p: int = Field(ge=1, le=10000, description="Number of elements in x-direction")
    m: int = Field(ge=1, le=10000, description="Number of elements in y-direction")


class PhysicalRequest(BaseModel):
    E: float = Field(gt=0, description="Young's modulus (Pa)")
    nu: float = Field(ge=0, lt=0.5, description="Poisson's ratio")
    planeState: Literal["PLANE_STRESS", "PLANE_STRAIN"] = Field(default="PLANE_STRESS", description="Plane stress or plane strain assumption")


class LoadsRequest(BaseModel):
    loadVal: float = Field(description="Total traction load (N/m)")
    loadDirection: Literal["x", "y"] = Field(default="y", description="Direction of applied load")


class SolveRequest(BaseModel):
    geometry: GeometryRequest
    mesh: MeshRequest
    physical: PhysicalRequest
    loads: LoadsRequest
    scaleFactor: float = Field(default=100, ge=0.001, le=10000, description="Displacement visualization scale factor")


class SolveResult(BaseModel):
    job_id: str = Field(description="Unique job identifier")
    status: Literal["pending", "running", "completed", "failed"] = Field(default="completed", description="Job status")
    computation_time_seconds: Optional[float] = Field(default=None, description="Wall-clock computation time")
    displacements: dict[str, list[float]] = Field(default_factory=dict, description="Nodal displacements {node_idx: [ux, uy]}")
    max_displacement: Optional[float] = Field(default=None, description="Maximum absolute displacement")
    nodes: Optional[list[list[float]]] = Field(default=None, description="Generated mesh node coordinates [[x, y], ...]")
    elements: Optional[list[list[int]]] = Field(default=None, description="Element connectivity [[n1, n2, n3, n4], ...]")
    stresses: Optional[dict[str, list[float]]] = Field(default=None, description="Element stresses {element_idx: [sx, sy, txy]}")
    reactions: Optional[dict[str, list[float]]] = Field(default=None, description="Nodal reaction forces")
    warnings: list[str] = Field(default_factory=list, description="Computation warnings")


# BoundaryConditions schema cho Projects API
class BoundaryConditions(BaseModel):
    """Cấu trúc dữ liệu điều kiện biên - Frontend gửi riêng để lưu vào DB."""
    d1: float = Field(gt=0, description="Chiều dài theo x")
    d2: float = Field(gt=0, description="Chiều cao theo y")
    p: int = Field(ge=1, description="Số phần tử theo x")
    m: int = Field(ge=1, description="Số phần tử theo y")
    element_type: Literal["D2QU4N", "D2TR3N"]
    bc_type: Literal["FIXED", "HINGE_ROLLER", "BEAM_SUPPORT"] = "FIXED"
    plane_state: Literal["PLANE_STRESS", "PLANE_STRAIN"] = "PLANE_STRESS"
    load_val: float = Field(description="Giá trị tải trọng")
    load_dir: Literal["x", "y"] = "y"
    E: float = Field(gt=0, description="Mô đun Young (Pa)")
    nu: float = Field(ge=0, lt=0.5, description="Hệ số Poisson")
