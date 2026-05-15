from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship

from ..db.base import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)

    # Geometry & Boundary coordinates
    d1 = Column(Float, nullable=True)   # Length (x-direction)
    d2 = Column(Float, nullable=True)   # Height (y-direction)

    # Mesh parameters
    p = Column(Integer, nullable=True)  # Elements in X
    m = Column(Integer, nullable=True)  # Elements in Y

    # BoundaryConditions & Solver parameters (saved when FE sends BCs)
    element_type = Column(String, nullable=True)   # "D2QU4N" | "D2TR3N"
    bc_type      = Column(String, nullable=True)   # "FIXED" | "HINGE_ROLLER" | "BEAM_SUPPORT"
    plane_state  = Column(String, nullable=True)   # "PLANE_STRESS" | "PLANE_STRAIN"
    load_val     = Column(Float,  nullable=True)   # Magnitude of applied load
    load_dir     = Column(String, nullable=True)   # "x" | "y"
    E            = Column(Float,  nullable=True)   # Young's Modulus
    nu           = Column(Float,  nullable=True)   # Poisson's Ratio

    # Results: written back after solve
    # Format: JSON string  { "0": [ux, uy], "1": [ux, uy], ... }
    displacements    = Column(String, nullable=True)
    max_displacement = Column(Float,  nullable=True)

    # Relationships
    nodes = relationship("Node", back_populates="project", cascade="all, delete-orphan")
    materials = relationship("Material", back_populates="project", cascade="all, delete-orphan")
    sections = relationship("Section", back_populates="project", cascade="all, delete-orphan")
    elements = relationship("Element", back_populates="project", cascade="all, delete-orphan")
