from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base

class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String, nullable=False)
    area = Column(Float, nullable=False)
    moment_of_inertia_z = Column(Float, nullable=True)
    moment_of_inertia_y = Column(Float, nullable=True)
    torsional_constant = Column(Float, nullable=True)

    # Relationship
    project = relationship("Project", back_populates="sections")
    elements = relationship("Element", back_populates="section")
