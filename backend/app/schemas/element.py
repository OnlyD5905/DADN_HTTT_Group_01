from pydantic import BaseModel
from typing import Optional

class ElementBase(BaseModel):
    start_node_id: int
    end_node_id: int
    material_id: int
    section_id: int

class ElementCreate(ElementBase):
    pass

class ElementUpdate(BaseModel):
    start_node_id: Optional[int] = None
    end_node_id: Optional[int] = None
    material_id: Optional[int] = None
    section_id: Optional[int] = None

class ElementInDB(ElementBase):
    id: int
    project_id: int

    class Config:
        from_attributes = True

class Element(ElementInDB):
    pass
