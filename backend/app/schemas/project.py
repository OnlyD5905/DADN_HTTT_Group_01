from pydantic import BaseModel
from typing import Optional, List
from .node import Node
from .element import Element
from .material import Material
from .section import Section

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

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
