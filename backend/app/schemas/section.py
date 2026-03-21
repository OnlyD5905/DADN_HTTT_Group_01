from pydantic import BaseModel
from typing import Optional

class SectionBase(BaseModel):
    name: str
    area: float
    moment_of_inertia_z: Optional[float] = None
    moment_of_inertia_y: Optional[float] = None
    torsional_constant: Optional[float] = None

class SectionCreate(SectionBase):
    pass

class SectionUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[float] = None
    moment_of_inertia_z: Optional[float] = None
    moment_of_inertia_y: Optional[float] = None
    torsional_constant: Optional[float] = None

class SectionInDB(SectionBase):
    id: int
    project_id: int

    class Config:
        from_attributes = True

class Section(SectionInDB):
    pass
