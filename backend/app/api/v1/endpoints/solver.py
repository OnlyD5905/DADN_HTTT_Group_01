import time
from fastapi import APIRouter, HTTPException, status
from ....schemas.solver import SolveRequest, SolveResult
from ....core.fea_engine import FEAEngine
import numpy as np
import logging

# Khởi tạo logger để theo dõi quá trình tính toán
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/solve", response_model=SolveResult)
async def solve_problem(payload: SolveRequest):
    """
    Endpoint tiếp nhận thông số từ Frontend, thực hiện chia lưới (Meshing)
     và giải bài toán Phần tử hữu hạn (FEA) để trả về chuyển vị, ứng suất và lưới.
    """
    start_time = time.perf_counter()
    try:
        logger.info(f"Bắt đầu xử lý bài toán FEA cho dự án: {payload.geometry.elementType}")

        # 1. Khởi tạo lõi FEA với các thông số từ Request
        engine = FEAEngine(
            geometry=payload.geometry,
            mesh_cfg=payload.mesh,
            physical=payload.physical,
            loads=payload.loads
        )

        # 2. Thực hiện giải thuật tính toán
        result = engine.solve(
            plane_state=payload.physical.planeState,
            bc_type=payload.geometry.bcType
        )

        computation_time = time.perf_counter() - start_time

        # 3. Chuẩn bị dữ liệu trả về theo định dạng SolveResult Schema
        formatted_displacements = {
            str(i): d for i, d in enumerate(result["displacements"])
        }
        formatted_stresses = {
            str(i): s for i, s in enumerate(result.get("stresses", []))
        } if result.get("stresses") else None

        logger.info(f"Tính toán hoàn tất thành công trong {computation_time:.3f}s.")

        return SolveResult(
            job_id=f"job_{np.random.randint(1000, 9999)}",
            status="completed",
            computation_time_seconds=round(computation_time, 3),
            displacements=formatted_displacements,
            max_displacement=result["max_displacement"],
            nodes=result.get("nodes"),
            elements=result.get("elements"),
            stresses=formatted_stresses,
            warnings=[]
        )

    except ValueError as ve:
        logger.error(f"Lỗi logic toán học: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi dữ liệu đầu vào hoặc hệ thống cơ học: {str(ve)}"
        )

    except Exception as e:
        logger.error(f"Lỗi hệ thống nghiêm trọng: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Đã xảy ra lỗi không xác định trên máy chủ: {str(e)}"
        )

@router.get("/health")
async def solver_health():
    """Kiểm tra trạng thái sẵn sàng của module Solver"""
    return {"status": "online", "engine": "FEAEngine_v2_Sparse"}
