from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship

from ..db.base import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)

    # Relationships
    nodes = relationship("Node", back_populates="project", cascade="all, delete-orphan")
    materials = relationship("Material", back_populates="project", cascade="all, delete-orphan")
    sections = relationship("Section", back_populates="project", cascade="all, delete-orphan")
    elements = relationship("Element", back_populates="project", cascade="all, delete-orphan")
