from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
import json

from ....db.session import get_db
from .... import models
from .... import schemas
from ....schemas.project import BoundaryConditions
from ....core.fea_engine import FEAEngine

router = APIRouter(prefix="/projects", tags=["projects"])


# ----------------- PROJECTS CRUD -----------------

@router.post("/", response_model=schemas.Project, status_code=status.HTTP_201_CREATED)
async def create_project(project: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    """Tạo mới một bài toán (project)."""
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    await db.commit()
    
    # Re-fetch with relationships to avoid lazy-loading error during serialization
    result = await db.execute(
        select(models.Project)
        .options(
            selectinload(models.Project.nodes),
            selectinload(models.Project.elements),
            selectinload(models.Project.materials),
            selectinload(models.Project.sections)
        )
        .where(models.Project.id == db_project.id)
    )
    return result.scalars().first()


@router.get("/", response_model=List[schemas.Project])
async def read_projects(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả các bài toán."""
    result = await db.execute(select(models.Project).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{project_id}", response_model=schemas.Project)
async def read_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Lấy toàn bộ dữ liệu của một bài toán (bao gồm Nodes, Elements, ...)."""
    result = await db.execute(
        select(models.Project)
        .options(
            selectinload(models.Project.nodes),
            selectinload(models.Project.elements),
            selectinload(models.Project.materials),
            selectinload(models.Project.sections)
        )
        .where(models.Project.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ----------------- BOUNDARY CONDITIONS -----------------

@router.put("/{project_id}/boundary-conditions", response_model=schemas.Project)
async def set_boundary_conditions(
    project_id: int,
    bc: BoundaryConditions,
    db: AsyncSession = Depends(get_db)
):
    """
    Nhận cấu trúc BoundaryConditions từ Frontend và lưu vào DB.
    Bao gồm: kích thước hình học, thông số lưới, loại phần tử,
    điều kiện biên, trạng thái phẳng, tải trọng và thông số vật liệu.
    Đây là bước BẮT BUỘC trước khi gọi POST /{project_id}/solve.
    """
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.d1           = bc.d1
    project.d2           = bc.d2
    project.p            = bc.p
    project.m            = bc.m
    project.element_type = bc.element_type
    project.bc_type      = bc.bc_type
    project.plane_state  = bc.plane_state
    project.load_val     = bc.load_val
    project.load_dir     = bc.load_dir
    project.E            = bc.E
    project.nu           = bc.nu

    await db.commit()
    
    # Re-fetch with relationships
    result = await db.execute(
        select(models.Project)
        .options(
            selectinload(models.Project.nodes),
            selectinload(models.Project.elements),
            selectinload(models.Project.materials),
            selectinload(models.Project.sections)
        )
        .where(models.Project.id == project.id)
    )
    return result.scalars().first()


# ----------------- NODES -----------------

@router.post("/{project_id}/nodes", response_model=List[schemas.Node], status_code=status.HTTP_201_CREATED)
async def create_nodes(project_id: int, nodes: List[schemas.NodeCreate], db: AsyncSession = Depends(get_db)):
    db_nodes = []
    for node in nodes:
        db_node = models.Node(**node.model_dump(), project_id=project_id)
        db.add(db_node)
        db_nodes.append(db_node)
    await db.commit()
    for n in db_nodes:
        await db.refresh(n)
    return db_nodes


# ----------------- ELEMENTS -----------------

@router.post("/{project_id}/elements", response_model=List[schemas.Element], status_code=status.HTTP_201_CREATED)
async def create_elements(project_id: int, elements: List[schemas.ElementCreate], db: AsyncSession = Depends(get_db)):
    db_elements = []
    for element in elements:
        db_element = models.Element(**element.model_dump(), project_id=project_id)
        db.add(db_element)
        db_elements.append(db_element)
    await db.commit()
    for e in db_elements:
        await db.refresh(e)
    return db_elements


# ----------------- MATERIALS -----------------

@router.post("/{project_id}/materials", response_model=List[schemas.Material], status_code=status.HTTP_201_CREATED)
async def create_materials(project_id: int, materials: List[schemas.MaterialCreate], db: AsyncSession = Depends(get_db)):
    db_materials = []
    for mat in materials:
        db_material = models.Material(**mat.model_dump(), project_id=project_id)
        db.add(db_material)
        db_materials.append(db_material)
    await db.commit()
    for m in db_materials:
        await db.refresh(m)
    return db_materials


# ----------------- SECTIONS -----------------

@router.post("/{project_id}/sections", response_model=List[schemas.Section], status_code=status.HTTP_201_CREATED)
async def create_sections(project_id: int, sections: List[schemas.SectionCreate], db: AsyncSession = Depends(get_db)):
    db_sections = []
    for sec in sections:
        db_section = models.Section(**sec.model_dump(), project_id=project_id)
        db.add(db_section)
        db_sections.append(db_section)
    await db.commit()
    for s in db_sections:
        await db.refresh(s)
    return db_sections


# ----------------- SOLVER INTEGRATION -----------------

@router.post("/{project_id}/solve")
async def solve_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """
    Đọc BoundaryConditions đã lưu trong DB, chạy lõi FEA,
    rồi ghi kết quả displacements ngược lại vào bảng projects.
    """
    result = await db.execute(select(models.Project).where(models.Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Kiểm tra đã có đủ thông số BCs chưa
    required_fields = ["d1", "d2", "p", "m", "element_type", "bc_type", "E", "nu"]
    missing = [f for f in required_fields if getattr(project, f) is None]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Thieu thong so: {missing}. Hay goi PUT /boundary-conditions truoc."
        )

    # Tạo mock param objects tương thích với FEAEngine
    class _P:
        def __init__(self, **kw):
            for k, v in kw.items():
                setattr(self, k, v)

    try:
        engine = FEAEngine(
            geometry=_P(d1=project.d1, d2=project.d2, elementType=project.element_type),
            mesh_cfg=_P(p=project.p, m=project.m),
            physical=_P(E=project.E, nu=project.nu),
            loads=_P(loadVal=project.load_val or 0.0, loadDirection=project.load_dir or "y"),
        )
        fea_result = engine.solve(
            plane_state=project.plane_state or "PLANE_STRESS",
            bc_type=project.bc_type or "FIXED",
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loi he thong: {str(e)}")

    # Ghi kết quả ngược lại vào DB
    formatted = {str(i): d for i, d in enumerate(fea_result["displacements"])}
    project.displacements    = json.dumps(formatted)
    project.max_displacement = fea_result["max_displacement"]
    await db.commit()

    return {
        "status": "success",
        "project_id": project.id,
        "max_displacement": fea_result["max_displacement"],
        "node_count": len(fea_result["nodes"]),
        "element_count": len(fea_result["elements"]),
        "displacements": formatted,
    }
