from fastapi import APIRouter

from .endpoints import health, solver, projects

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(solver.router)
api_router.include_router(projects.router)
