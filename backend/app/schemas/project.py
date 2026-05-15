from pydantic import BaseModel
from typing import Optional, List
from .node import Node
from .element import Element
from .material import Material
from .section import Section

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    d1: Optional[float] = None
    d2: Optional[float] = None
    p: Optional[int] = None
    m: Optional[int] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    d1: Optional[float] = None
    d2: Optional[float] = None
    p: Optional[int] = None
    m: Optional[int] = None
    element_type: Optional[str] = None
    bc_type: Optional[str] = None
    plane_state: Optional[str] = None
    load_val: Optional[float] = None
    load_dir: Optional[str] = None
    E: Optional[float] = None
    nu: Optional[float] = None
    displacements: Optional[str] = None
    max_displacement: Optional[float] = None

class ProjectInDB(ProjectBase):
    id: int

    class Config:
        from_attributes = True

class Project(ProjectInDB):
    nodes: List[Node] = []
    elements: List[Element] = []
    materials: List[Material] = []
    sections: List[Section] = []

    class Config:
        from_attributes = True

# --- Solver API Schemas ---
from pydantic import Field
from typing import Dict, Literal

class GeometryParams(BaseModel):
    d1: float = Field(gt=0)
    d2: float = Field(gt=0)
    elementType: Literal["D2QU4N", "D2TR3N"]
    bcType: Literal["FIXED", "HINGE_ROLLER", "BEAM_SUPPORT"] = "FIXED"

class MeshConfig(BaseModel):
    p: int = Field(ge=1)
    m: int = Field(ge=1)

class PhysicalProperties(BaseModel):
    E: float = Field(gt=0)
    nu: float = Field(ge=0, lt=0.5)
    planeState: Literal["PLANE_STRESS", "PLANE_STRAIN"] = "PLANE_STRESS"

class LoadParams(BaseModel):
    loadVal: float
    loadDirection: Literal["x", "y"]

class BoundaryConditions(BaseModel):
    """Cau truc du lieu dieu kien bien - Frontend gui rieng de luu vao DB."""
    d1: float = Field(gt=0, description="Chieu dai theo x")
    d2: float = Field(gt=0, description="Chieu cao theo y")
    p: int = Field(ge=1, description="So phan tu theo x")
    m: int = Field(ge=1, description="So phan tu theo y")
    element_type: Literal["D2QU4N", "D2TR3N"]
    bc_type: Literal["FIXED", "HINGE_ROLLER", "BEAM_SUPPORT"] = "FIXED"
    plane_state: Literal["PLANE_STRESS", "PLANE_STRAIN"] = "PLANE_STRESS"
    load_val: float = Field(description="Gia tri tai trong")
    load_dir: Literal["x", "y"] = "y"
    E: float = Field(gt=0, description="Mo dun Young (Pa)")
    nu: float = Field(ge=0, lt=0.5, description="He so Poisson")

class SolveRequest(BaseModel):
    geometry: GeometryParams
    mesh: MeshConfig
    physical: PhysicalProperties
    loads: LoadParams
    scaleFactor: float = Field(gt=0, default=1.0)

class SolveResult(BaseModel):
    job_id: str
    status: str
    displacements: Dict[str, List[float]]
    max_displacement: float
    warnings: List[str] = []
