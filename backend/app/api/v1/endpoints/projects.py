from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from ....db.session import get_db
from .... import models
from .... import schemas

router = APIRouter(prefix="/projects", tags=["projects"])

# ----------------- PROJECTS -----------------
@router.post("/", response_model=schemas.Project, status_code=status.HTTP_201_CREATED)
async def create_project(project: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.get("/", response_model=List[schemas.Project])
async def read_projects(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{project_id}", response_model=schemas.Project)
async def read_project(project_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
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
    from sqlalchemy.orm import selectinload
    # 1. Lấy dữ liệu bài toán từ DB
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

    # 2. Xử lý dữ liệu định dạng JSON chuẩn bị đưa vào Lõi sinh (Algorithm Core / Solver)
    # Ví dụ: chuyển Object Node thành dạng dict để pass vào hàm FEA solver.
    nodes_data = [{"id": n.id, "x": n.x, "y": n.y, "z": n.z} for n in project.nodes]
    elements_data = [
        {
            "id": e.id, 
            "start_node": e.start_node_id, 
            "end_node": e.end_node_id, 
            "material_id": e.material_id, 
            "section_id": e.section_id
        } 
        for e in project.elements
    ]

    # TODO: Gọi hàm Lõi cấu trúc (FEA Algorithm Core) ở đây
    # Ví dụ: results = core_solver.run(nodes_data, elements_data)
    
    # 3. MOCK KẾT QUẢ TRẢ VỀ CHO FRONTEND
    return {
        "status": "success",
        "message": "Data retrieved and sent to solver successfully",
        "project_id": project.id,
        "input_summary": {
            "node_count": len(nodes_data),
            "element_count": len(elements_data)
        },
        "displacements": {
            "node_1": {"dx": 0.01, "dy": -0.05, "dz": 0.0},
            "node_2": {"dx": 0.0, "dy": 0.0, "dz": 0.0}
        }
    }
