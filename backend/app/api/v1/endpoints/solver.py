from fastapi import APIRouter, HTTPException, status
from app.schemas.project import SolveRequest, SolveResult
from app.core.fea_engine import FEAEngine
import numpy as np
import logging

# Khởi tạo logger để theo dõi quá trình tính toán
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/solve", response_model=SolveResult)
async def solve_problem(payload: SolveRequest):
    """
    Endpoint tiếp nhận thông số từ Frontend, thực hiện chia lưới (Meshing) 
     và giải bài toán Phần tử hữu hạn (FEA) để trả về chuyển vị.
    """
    try:
        logger.info(f"Bắt đầu xử lý bài toán FEA cho dự án: {payload.geometry.elementType}")

        # 1. Khởi tạo lõi FEA với các thông số từ Request
        # Chú ý: Đảm bảo class FEAEngine trong app.core.fea_engine đã được cập nhật Sparse Matrix
        engine = FEAEngine(
            geometry=payload.geometry,
            mesh_cfg=payload.mesh,
            physical=payload.physical,
            loads=payload.loads
        )

        # 2. Thực hiện giải thuật tính toán
        # engine.solve() sẽ trả về dict chứa: nodes, elements, displacements, max_displacement
        result = engine.solve(
            plane_state=payload.physical.planeState, 
            bc_type=payload.geometry.bcType
        )

        # 3. Chuẩn bị dữ liệu trả về theo định dạng SolveResult Schema
        # Convert dictionary displacements sang format string key cho JSON response
        formatted_displacements = {
            str(i): d for i, d in enumerate(result["displacements"])
        }

        logger.info("Tính toán hoàn tất thành công.")

        return SolveResult(
            job_id=f"job_{np.random.randint(1000, 9999)}",
            status="completed",
            displacements=formatted_displacements,
            max_displacement=result["max_displacement"],
            warnings=[]
        )

    except ValueError as ve:
        # Requirement 3: Bắt các lỗi toán học (Ma trận suy biến, thiếu ngàm...)
        logger.error(f"Lỗi logic toán học: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi dữ liệu đầu vào hoặc hệ thống cơ học: {str(ve)}"
        )

    except Exception as e:
        # Bắt các lỗi hệ thống không xác định khác (Runtime, OOM...)
        logger.error(f"Lỗi hệ thống nghiêm trọng: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Đã xảy ra lỗi không xác định trên máy chủ: {str(e)}"
        )

@router.get("/health")
async def solver_health():
    """Kiểm tra trạng thái sẵn sàng của module Solver"""
    return {"status": "online", "engine": "FEAEngine_v2_Sparse"}