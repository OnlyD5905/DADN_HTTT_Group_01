from typing import Dict, List, Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/solver", tags=["solver"])


class GeometryParams(BaseModel):
    d1: float = Field(gt=0)
    d2: float = Field(gt=0)
    elementType: Literal["D2QU4N", "D2TR3N"]


class MeshConfig(BaseModel):
    p: int = Field(ge=1)
    m: int = Field(ge=1)


class PhysicalProperties(BaseModel):
    E: float = Field(gt=0)
    nu: float = Field(ge=0, lt=0.5)


class LoadParams(BaseModel):
    loadVal: float
    loadDirection: Literal["x", "y"]


class SolveRequest(BaseModel):
    geometry: GeometryParams
    mesh: MeshConfig
    physical: PhysicalProperties
    loads: LoadParams
    scaleFactor: float = Field(gt=0)


class SolveResponse(BaseModel):
    job_id: str
    status: Literal["pending", "running", "completed", "failed"]
    estimated_duration_seconds: Optional[float] = None
    _links: Dict[str, str]


class SolveResult(BaseModel):
    job_id: str
    status: Literal["pending", "running", "completed", "failed"]
    completed_at: Optional[str] = None
    computation_time_seconds: Optional[float] = None
    displacements: Dict[str, List[float]] = {}
    stresses: Dict[str, List[float]] = {}
    reactions: Dict[str, List[float]] = {}
    max_displacement: Optional[float] = None
    warnings: List[str] = []


@router.post("/solve", response_model=SolveResponse, status_code=202)
async def solve(payload: SolveRequest):
    return SolveResponse(
        job_id="solv_demo_001",
        status="pending",
        estimated_duration_seconds=2.0,
        _links={
            "self": "/api/v1/solver/jobs/solv_demo_001",
            "result": "/api/v1/solver/jobs/solv_demo_001/result",
        },
    )


@router.get("/jobs/{job_id}", response_model=SolveResponse)
async def job_status(job_id: str):
    return SolveResponse(
        job_id=job_id,
        status="completed",
        _links={
            "self": f"/api/v1/solver/jobs/{job_id}",
            "result": f"/api/v1/solver/jobs/{job_id}/result",
        },
    )


@router.get("/jobs/{job_id}/result", response_model=SolveResult)
async def job_result(job_id: str):
    return SolveResult(
        job_id=job_id,
        status="completed",
        completed_at="2026-03-21T00:00:00Z",
        computation_time_seconds=1.23,
        displacements={"0": [0.0, 0.0], "1": [0.0, -0.0012]},
        stresses={"0": [0.0, 0.0, 0.0]},
        reactions={"0": [0.0, 10.0]},
        max_displacement=0.0012,
        warnings=[],
    )
