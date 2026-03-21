from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base

class Element(Base):
    __tablename__ = "elements"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    start_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    end_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="elements")
    material = relationship("Material", back_populates="elements")
    section = relationship("Section", back_populates="elements")
    
    start_node = relationship("Node", foreign_keys=[start_node_id])
    end_node = relationship("Node", foreign_keys=[end_node_id])
