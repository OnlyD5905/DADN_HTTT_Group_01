from pydantic import BaseModel
from typing import Optional

class NodeBase(BaseModel):
    x: float
    y: float
    z: Optional[float] = 0.0

class NodeCreate(NodeBase):
    pass

class NodeUpdate(BaseModel):
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None

class NodeInDB(NodeBase):
    id: int
    project_id: int

    class Config:
        from_attributes = True

class Node(NodeInDB):
    pass
