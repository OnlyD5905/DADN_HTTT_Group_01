from pydantic import BaseModel
from typing import Optional

class MaterialBase(BaseModel):
    name: str
    elasticity_modulus: float
    poisson_ratio: Optional[float] = None
    density: Optional[float] = None

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    elasticity_modulus: Optional[float] = None
    poisson_ratio: Optional[float] = None
    density: Optional[float] = None

class MaterialInDB(MaterialBase):
    id: int
    project_id: int

    class Config:
        from_attributes = True

class Material(MaterialInDB):
    pass
