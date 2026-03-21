from fastapi import APIRouter

from .endpoints import health, solver

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(solver.router)
