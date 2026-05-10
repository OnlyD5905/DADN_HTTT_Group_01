# Tài Liệu Tích Hợp Frontend-Backend - FEA Solver

**Ngày:** 2026-05-10  
**Phiên bản:** 1.0  
**Ngôn ngữ:** Tiếng Việt (Tài liệu kỹ thuật giữ nguyên tiếng Anh)

---

## Tóm Tắt

Tài liệu này cung cấp hướng dẫn toàn diện cho việc tích hợp giữa Frontend (React) và Backend (FastAPI) của hệ thống FEA Solver. Mục tiêu là thay thế `test_backend` (port 8001) bằng backend chính thức (port 8000) mà không cần thay đổi code frontend.

---

## 1. Kiến Trúc Hệ Thống

```
┌─────────────────┐     HTTP/REST API      ┌──────────────────┐
│                 │ ◄────────────────────► │                  │
│    Frontend     │    Port 8000           │     Backend      │
│   (React 18)    │                        │   (FastAPI)      │
│  localhost:3000 │                        │  localhost:8000  │
│                 │                        │                  │
└────────┬────────┘                        └────────┬─────────┘
         │                                          │
         │                                          │
         │          ┌──────────────────┐            │
         │          │   PostgreSQL     │            │
         └─────────►│   (Database)     │◄───────────┘
                    └──────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │   Meshingcode/   │
                    │  (Python Core -  │
                    │   Giải thuật FEA) │
                    └──────────────────┘
```

---

## 2. Phân Chia Trách Nhiệm

### 2.1 Đội Frontend (React + TypeScript)

**File chính:**
- `frontend/src/pages/FEASolver.tsx` - Form nhập liệu
- `frontend/src/services/solverApi.ts` - Gọi API
- `frontend/src/types/fea.ts` - Định nghĩa kiểu dữ liệu

**Nguyên tắc:**
- Không nhúng logic tính toán vào UI
- Gọi API qua `solverApi.ts`, không dùng fetch trực tiếp
- Hiển thị kết quả tại trang `/results`
- Responsive design với TailwindCSS

**Cấu hình kết nối:**
```bash
# File: frontend/.env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

### 2.2 Đội Backend (FastAPI + SQLAlchemy)

**File chính:**
- `backend/app/api/v1/endpoints/solver.py` - Xử lý giải toán
- `backend/app/models/` - Database models
- `backend/app/schemas/` - Pydantic schemas

**Nguyên tắc:**
- API versioning: `/api/v1/*`
- Async endpoints với SQLAlchemy 2.0
- CORS cho phép `localhost:3000`
- Pydantic validation cho mọi input

### 2.3 Đội Python Core (Meshingcode/)

**File chính:**
- `Meshingcode/MeshCreate.py` - Tạo lưới
- `Meshingcode/DisplaymentCal.py` - Tính toán chuyển vị

**Nguyên tắc:**
- Tách biệt hoàn toàn logic tính toán
- Nhận input thuần Python (dict/list)
- Trả về kết quả dạng serializable
- Không chứa code liên quan đến HTTP/API

---

## 3. Luồng Dữ Liệu Tích Hợp

### 3.1 Quy Trình Giải Toán

```
Ngườii dùng
    │
    ▼
┌──────────────┐
│ FEASolver.tsx│ ◄── Nhập: geometry, mesh, physical, loads
└──────┬───────┘
       │ POST /api/v1/solver/solve
       │
       ▼
┌──────────────┐
│  Backend     │ ◄── Tạo job_id, lưu DB, bắt đầu tính toán nền
│  (FastAPI)   │
└──────┬───────┘
       │ 202 Accepted
       │ {job_id, status: "pending"}
       ▼
┌──────────────┐
│   Frontend   │ ◄── Hiển thị: "Đang xử lý..."
└──────┬───────┘
       │ Poll: GET /api/v1/solver/jobs/{job_id}
       │ (mỗi 1-2 giây)
       ▼
┌──────────────┐
│   Backend    │ ◄── Trả status: pending → running → completed
└──────┬───────┘
       │ status: "completed"
       ▼
┌──────────────┐
│   Frontend   │ ◄── GET /api/v1/solver/jobs/{job_id}/result
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Results.tsx  │ ◄── Hiển thị: displacements, stresses, reactions
└──────────────┘
```

### 3.2 Dữ Liệu Mong Đợi Từ Frontend

Frontend gửi yêu cầu giải toán với cấu trúc:

```typescript
// frontend/src/types/fea.ts

interface GeometryParams {
  d1: number;        // Chiều dài theo x (m)
  d2: number;        // Chiều cao theo y (m)
  elementType: 'D2QU4N' | 'D2TR3N';  // Loại phần tử
}

interface MeshConfig {
  p: number;         // Số phần tử theo x
  m: number;         // Số phần tử theo y
}

interface PhysicalProperties {
  E: number;         // Mô đun Young (Pa)
  nu: number;        // Hệ số Poisson
}

interface LoadParams {
  loadVal: number;   // Giá trị tải trọng (N/m)
  loadDirection: 'x' | 'y';  // Hướng tải
}

interface FEASolverInput {
  geometry: GeometryParams;
  mesh: MeshConfig;
  physical: PhysicalProperties;
  loads: LoadParams;
  scaleFactor: number;  // Hệ số phóng đại chuyển vị
}
```

### 3.3 Dữ Liệu Trả Về Cho Frontend

Backend phải trả về đúng định dạng sau:

**Bước 1: Submit Job (202 Accepted)**
```json
{
  "job_id": "solv_abc123def456",
  "status": "pending",
  "estimated_duration_seconds": 2.5,
  "_links": {
    "self": "/api/v1/solver/jobs/solv_abc123def456",
    "result": "/api/v1/solver/jobs/solv_abc123def456/result"
  }
}
```

**Bước 2: Check Status (200 OK)**
```json
{
  "job_id": "solv_abc123def456",
  "status": "completed",
  "_links": {
    "self": "/api/v1/solver/jobs/solv_abc123def456",
    "result": "/api/v1/solver/jobs/solv_abc123def456/result"
  }
}
```

**Bước 3: Get Results (200 OK)**
```json
{
  "job_id": "solv_abc123def456",
  "status": "completed",
  "completed_at": "2026-05-10T14:30:00Z",
  "computation_time_seconds": 1.23,
  "displacements": {
    "0": [0.0, -0.0012],
    "1": [0.0001, -0.0011],
    "2": [0.0002, -0.0010]
  },
  "stresses": {
    "0": [100.5, 50.2, -10.3],
    "1": [95.0, 48.1, -9.8]
  },
  "reactions": {
    "0": [0.0, 500.0],
    "10": [0.0, 500.0]
  },
  "max_displacement": 0.0012,
  "warnings": []
}
```

**Yêu cầu quan trọng về định dạng:**
- `displacements`: Key là string (index node), value là mảng `[dx, dy]`
- `stresses`: Key là string, value là mảng `[σx, σy, τxy]` (3 thành phần)
- `reactions`: Chỉ chứa các node biên, value là `[Fx, Fy]`
- `max_displacement`: Độ lớn chuyển vị lớn nhất (sqrt(dx² + dy²))

---

## 4. Hướng Dẫn Triển Khai Backend

### 4.1 Trạng Thái Hiện Tại

| Thành phần | Trạng thái | Ghi chú |
|------------|------------|---------|
| Solver endpoints | ❌ Hardcoded | Trả về data tĩnh |
| Job persistence | ❌ Chưa có | Cần tạo DB table |
| FEA computation | ❌ Mock data | Cần tích hợp Meshingcode/ |
| Project linkage | ⚠️ Partial | TODO tại `projects.py:129` |

### 4.2 Các Bước Triển Khai

#### Bước 1: Tạo Database Schema

File mới: `backend/app/models/solve_job.py`

```python
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..db.base import Base

class SolveJob(Base):
    __tablename__ = "solve_jobs"
    
    id = Column(String, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    computation_time_seconds = Column(Float, nullable=True)
    
    # Input parameters
    input_geometry = Column(JSON)
    input_mesh = Column(JSON)
    input_physical = Column(JSON)
    input_loads = Column(JSON)
    scale_factor = Column(Float)
    
    # Results
    results_displacements = Column(JSON, nullable=True)
    results_stresses = Column(JSON, nullable=True)
    results_reactions = Column(JSON, nullable=True)
    results_max_displacement = Column(Float, nullable=True)
    results_warnings = Column(JSON, default=list)
    
    # Error info
    error_message = Column(String, nullable=True)
    
    project = relationship("Project", back_populates="solve_jobs")
```

Thêm vào `backend/app/models/project.py`:
```python
solve_jobs = relationship("SolveJob", back_populates="project")
```

#### Bước 2: Tạo Pydantic Schemas

File mới: `backend/app/schemas/solve_job.py`

```python
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime

class SolveJobBase(BaseModel):
    status: str
    computation_time_seconds: Optional[float] = None
    results_max_displacement: Optional[float] = None

class SolveJobCreate(BaseModel):
    project_id: Optional[int] = None
    input_geometry: dict
    input_mesh: dict
    input_physical: dict
    input_loads: dict
    scale_factor: float

class SolveJobInDB(SolveJobBase):
    id: str
    project_id: Optional[int]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class SolveJobResult(BaseModel):
    job_id: str
    status: str
    completed_at: Optional[str]
    computation_time_seconds: Optional[float]
    displacements: Dict[str, List[float]]
    stresses: Dict[str, List[float]]
    reactions: Dict[str, List[float]]
    max_displacement: Optional[float]
    warnings: List[str]
```

#### Bước 3: Cập Nhật Solver Endpoints

Thay thế toàn bộ `backend/app/api/v1/endpoints/solver.py`:

```python
import uuid
import time
import math
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from ....db.session import get_db
from ....models.solve_job import SolveJob

router = APIRouter(prefix="/solver", tags=["solver"])

# Pydantic Models
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

# Endpoints
@router.post("/solve", response_model=SolveResponse, status_code=202)
async def solve(
    payload: SolveRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    job_id = f"solv_{uuid.uuid4().hex[:12]}"
    
    job = SolveJob(
        id=job_id,
        status="pending",
        input_geometry=payload.geometry.model_dump(),
        input_mesh=payload.mesh.model_dump(),
        input_physical=payload.physical.model_dump(),
        input_loads=payload.loads.model_dump(),
        scale_factor=payload.scaleFactor,
    )
    db.add(job)
    await db.commit()
    
    background_tasks.add_task(run_fea_solver, job_id, payload, db)
    
    return SolveResponse(
        job_id=job_id,
        status="pending",
        estimated_duration_seconds=estimate_duration(payload.mesh),
        _links={
            "self": f"/api/v1/solver/jobs/{job_id}",
            "result": f"/api/v1/solver/jobs/{job_id}/result",
        },
    )

@router.get("/jobs/{job_id}", response_model=SolveResponse)
async def job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await db.get(SolveJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    return SolveResponse(
        job_id=job_id,
        status=job.status,
        estimated_duration_seconds=estimate_remaining(job),
        _links={
            "self": f"/api/v1/solver/jobs/{job_id}",
            "result": f"/api/v1/solver/jobs/{job_id}/result",
        },
    )

@router.get("/jobs/{job_id}/result", response_model=SolveResult)
async def job_result(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await db.get(SolveJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    if job.status == "failed":
        raise HTTPException(status_code=500, detail=f"Job failed: {job.error_message}")
    
    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Job not completed. Status: {job.status}")
    
    return SolveResult(
        job_id=job_id,
        status=job.status,
        completed_at=job.completed_at.isoformat() + "Z" if job.completed_at else None,
        computation_time_seconds=job.computation_time_seconds,
        displacements=job.results_displacements or {},
        stresses=job.results_stresses or {},
        reactions=job.results_reactions or {},
        max_displacement=job.results_max_displacement,
        warnings=job.results_warnings or [],
    )

# Helper Functions
def estimate_duration(mesh: MeshConfig) -> float:
    total_elements = mesh.p * mesh.m
    return max(0.5, total_elements * 0.001)

def estimate_remaining(job: SolveJob) -> Optional[float]:
    if job.started_at and job.status == "running":
        elapsed = (datetime.utcnow() - job.started_at).total_seconds()
        estimated = estimate_duration(MeshConfig(**job.input_mesh))
        return max(0, estimated - elapsed)
    return None

async def run_fea_solver(job_id: str, payload: SolveRequest, db: AsyncSession):
    start_time = time.time()
    
    try:
        # Update status
        job = await db.get(SolveJob, job_id)
        job.status = "running"
        job.started_at = datetime.utcnow()
        await db.commit()
        
        # Tính toán (tạm thời dùng mock, sau này thay bằng Meshingcode/)
        results = compute_fea_results(payload)
        
        # Update results
        job.status = "completed"
        job.completed_at = datetime.utcnow()
        job.computation_time_seconds = time.time() - start_time
        job.results_displacements = results["displacements"]
        job.results_stresses = results["stresses"]
        job.results_reactions = results["reactions"]
        job.results_max_displacement = results["max_displacement"]
        job.results_warnings = results["warnings"]
        await db.commit()
        
    except Exception as e:
        job = await db.get(SolveJob, job_id)
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.utcnow()
        await db.commit()

def compute_fea_results(payload: SolveRequest) -> dict:
    """
    Tính toán kết quả FEA.
    
    TODO: Thay thế bằng tích hợp với Meshingcode/
    """
    num_nodes = (payload.mesh.p + 1) * (payload.mesh.m + 1)
    
    displacements = {}
    stresses = {}
    reactions = {}
    max_disp = 0.0
    
    for i in range(num_nodes):
        node_x = (i % (payload.mesh.p + 1)) / payload.mesh.p
        node_y = (i // (payload.mesh.p + 1)) / payload.mesh.m
        
        load_factor = abs(payload.loads.loadVal) / 1000.0
        pos_factor = math.sqrt(node_x**2 + node_y**2)
        
        if payload.loads.loadDirection == 'x':
            dx = load_factor * pos_factor * random.uniform(0.8, 1.2) * payload.scaleFactor
            dy = load_factor * pos_factor * 0.1 * random.uniform(-0.5, 0.5) * payload.scaleFactor
        else:
            dx = load_factor * pos_factor * 0.1 * random.uniform(-0.5, 0.5) * payload.scaleFactor
            dy = -load_factor * pos_factor * random.uniform(0.8, 1.2) * payload.scaleFactor
        
        displacements[str(i)] = [round(dx, 6), round(dy, 6)]
        
        disp_mag = math.sqrt(dx**2 + dy**2)
        if disp_mag > max_disp:
            max_disp = disp_mag
        
        stress_mag = load_factor * random.uniform(0.5, 1.5)
        stresses[str(i)] = [
            round(stress_mag * random.uniform(0.8, 1.2), 4),
            round(stress_mag * random.uniform(0.8, 1.2), 4),
            round(stress_mag * random.uniform(-0.5, 0.5), 4),
        ]
        
        # Boundary nodes
        if i < (payload.mesh.p + 1) or i >= num_nodes - (payload.mesh.p + 1) or \
           i % (payload.mesh.p + 1) == 0 or i % (payload.mesh.p + 1) == payload.mesh.p:
            reactions[str(i)] = [
                round(load_factor * random.uniform(-0.2, 0.2), 4),
                round(load_factor * random.uniform(-0.2, 0.2), 4),
            ]
    
    warnings = []
    if payload.mesh.p > 20 or payload.mesh.m > 20:
        warnings.append("Large mesh size may impact performance")
    
    return {
        "displacements": displacements,
        "stresses": stresses,
        "reactions": reactions,
        "max_displacement": round(max_disp, 6),
        "warnings": warnings,
    }
```

#### Bước 4: Tích Hợp Với Meshingcode/

Khi Python Core đã sẵn sàng, thay thế hàm `compute_fea_results()`:

```python
def compute_fea_results(payload: SolveRequest) -> dict:
    """
    Tích hợp với Meshingcode/ để tính toán thực.
    """
    from Meshingcode.MeshCreate import create_mesh
    from Meshingcode.DisplaymentCal import solve_fea_system
    
    # 1. Tạo lưới
    mesh_data = create_mesh(
        width=payload.geometry.d1,
        height=payload.geometry.d2,
        nx=payload.mesh.p,
        ny=payload.mesh.m,
        element_type=payload.geometry.elementType
    )
    
    # 2. Giải hệ phương trình
    results = solve_fea_system(
        nodes=mesh_data["nodes"],
        elements=mesh_data["elements"],
        E=payload.physical.E,
        nu=payload.physical.nu,
        load_value=payload.loads.loadVal,
        load_direction=payload.loads.loadDirection
    )
    
    # 3. Chuyển đổi về định dạng API
    return convert_to_api_format(results)
```

---

## 5. Quy Trình Phát Triển

### 5.1 Quy Tắc Tránh Xung Đột

| Thành phần | Phạm vi chỉnh sửa | Không được đụng vào |
|------------|-------------------|---------------------|
| Frontend | `frontend/src/pages/*`, `frontend/src/services/*` | `backend/`, `Meshingcode/` |
| Backend | `backend/app/api/v1/*`, `backend/app/models/*` | `frontend/`, `Meshingcode/` (logic) |
| Python Core | `Meshingcode/*` | `frontend/`, `backend/` (API) |

### 5.2 Thay Đổi API Schema

**Bắt buộc phải làm:**
1. Thông báo trước cho team liên quan
2. Cập nhật Backend schema trước
3. Cập nhật Frontend types sau
4. Test tích hợp trước khi merge

### 5.3 Lộ Trình Phát Triển

**Giai đoạn 1: Tích hợp Cơ bản (Hiện tại)**
- [ ] Tạo database schema cho SolveJob
- [ ] Triển khai solver endpoints với background tasks
- [ ] Dùng mock results từ test_backend
- [ ] Frontend chuyển sang port 8000

**Giai đoạn 2: Tính Toán Thực (Sprint tiếp theo)**
- [ ] Tích hợp Meshingcode/ FEA solver
- [ ] Thay mock bằng tính toán thực
- [ ] Thêm progress tracking cho job chạy lâu
- [ ] Tối ưu hiệu năng với mesh lớn

**Giai đoạn 3: Tích Hợp Project (Tương lai)**
- [ ] Liên kết solve jobs với projects
- [ ] Lưu nodes/elements vào database
- [ ] Pre-compute và cache kết quả
- [ ] Versioning cho kết quả

---

## 6. Hướng Dẫn Chạy Môi Trường

### 6.1 Khởi Động Backend (Port 8000)

```bash
# 1. Setup môi trường
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# 2. Cài dependencies
pip install -r requirements.txt

# 3. Chạy server
uvicorn app.main:app --reload --port 8000

# API sẵn sàng tại: http://127.0.0.1:8000
# Swagger UI: http://127.0.0.1:8000/docs
```

### 6.2 Khởi Động Frontend (Port 3000)

```bash
# 1. Cài dependencies
cd frontend
npm install

# 2. Cấu hình API URL
echo "VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1" > .env

# 3. Chạy dev server
npm run dev

# Frontend sẵn sàng tại: http://localhost:3000
```

### 6.3 Test Tích Hợp

```bash
# Terminal 1: Start backend
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2: Start frontend
cd frontend && npm run dev

# Test API manually:
curl -X POST http://127.0.0.1:8000/api/v1/solver/solve \
  -H "Content-Type: application/json" \
  -d '{
    "geometry": {"d1": 10, "d2": 10, "elementType": "D2QU4N"},
    "mesh": {"p": 4, "m": 4},
    "physical": {"E": 200e9, "nu": 0.3},
    "loads": {"loadVal": 1000, "loadDirection": "y"},
    "scaleFactor": 100
  }'
```

---

## 7. Checklist Kiểm Tra Tích Hợp

Trước khi tuyên bố hoàn thành, kiểm tra:

- [ ] `POST /api/v1/solver/solve` trả về 202 với job_id hợp lệ
- [ ] `GET /api/v1/solver/jobs/{job_id}` trả về đúng trạng thái
- [ ] `GET /api/v1/solver/jobs/{job_id}/result` trả về kết quả sau khi hoàn thành
- [ ] Định dạng response khớp hoàn toàn với test_backend
- [ ] Mesh lớn (20x20+) hoàn thành không timeout
- [ ] Job lỗi trả về thông báo lỗi rõ ràng
- [ ] Frontend hiển thị kết quả đúng không cần thay đổi code
- [ ] Database lưu trữ jobs qua các lần restart server
- [ ] CORS hoạt động từ `http://localhost:3000`

---

## 8. Xử Lý Lỗi Thường Gặp

### Lỗi CORS
```
Access-Control-Allow-Origin header missing
```
**Giải pháp:** Kiểm tra `main.py` đã bao gồm `localhost:3000` trong `allow_origins`

### Lỗi Database
```
sqlalchemy.exc.OperationalError: table solve_jobs does not exist
```
**Giải pháp:** Restart server để lifespan handler tạo bảng mới

### Lỗi Format Response
```
TypeError: Cannot read property 'displacements' of undefined
```
**Giải pháp:** Kiểm tra response JSON đúng định dạng, key là string (không phải number)

---

## 9. Liên Hệ Hỗ Trợ

**Frontend Team:**
- API contract clarifications
- Frontend testing support
- Integration debugging

**Backend Team:**
- Database schema questions
- Performance optimization
- Python Core integration

**Python Core Team:**
- FEA algorithm questions
- Meshingcode/ integration
- Result format conversion

---

## Phụ Lục: So Sánh test_backend và Production

| Tính năng | test_backend | Production Backend |
|-----------|--------------|-------------------|
| Port | 8001 | 8000 |
| Database | In-memory | PostgreSQL |
| Persistence | Mất khi restart | Lưu vĩnh viễn |
| Tính toán | Mock/random | Thực (Meshingcode/) |
| Xác thực | Không | JWT (tương lai) |
| Projects API | Không | Full CRUD |

---

**Lưu ý quan trọng:** Mọi thay đổi về API contract phải được thông báo trước cho cả hai team để đảm bảo tích hợp liên tục.
