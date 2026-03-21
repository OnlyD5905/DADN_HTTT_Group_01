from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from ..db.base import Base

class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String, nullable=False)
    # Young's Modulus
    elasticity_modulus = Column(Float, nullable=False)
    # Poisson's ratio
    poisson_ratio = Column(Float, nullable=True)
    # Target mass density
    density = Column(Float, nullable=True)

    # Relationship
    project = relationship("Project", back_populates="materials")
    elements = relationship("Element", back_populates="material")
