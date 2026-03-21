# Tài liệu Hướng dẫn Đội ngũ Phát triển FEA Solver

Dự án hiện được chia thành hai khu vực vận hành chính:

- **Frontend**: React + TypeScript + Vite + TailwindCSS (tại thư mục `frontend/`).
- **Backend/Core**: Hệ thống FastAPI (tại `backend/`) và các script giải toán Python (tại `Meshingcode/`).

**Mục tiêu:** Đảm bảo các thành viên phụ trách Frontend, Backend và Visualization có thể làm việc song song, tối ưu năng suất và hạn chế tối đa xung đột (conflict) mã nguồn.

---

## 1. Quy trình vận hành tổng quát

Luồng trải nghiệm người dùng (User Flow) được thiết kế như sau:

1. Người dùng đăng nhập hoặc đăng ký tài khoản.
2. Tại form Solver, người dùng nhập các thông số: hình học (geometry), lưới (mesh), vật liệu, tải trọng và hệ số tỷ lệ.
3. Gửi yêu cầu giải toán (solve request) tới Backend API.
4. Hệ thống hiển thị trạng thái công việc và trả kết quả tại trang Results.
5. **Python Core** chịu trách nhiệm xử lý toàn bộ logic tính toán FEA và thuật toán chia lưới.

---

## 2. Phân chia trách nhiệm (Ownership)

### Đội ngũ Frontend
Quản lý giao diện và luồng trải nghiệm người dùng:
- Các tệp tin chính: `SignIn.tsx`, `Register.tsx`, `FEASolver.tsx`, `Results.tsx`, `solverApi.ts`.

**Nguyên tắc phối hợp:**
- Đảm bảo giao diện phản hồi tốt (responsive) và dễ tiếp cận.
- **Không** nhúng logic tính toán vào UI; mọi thao tác giải toán phải thông qua API.
- Sử dụng trang `/results` làm nơi hiển thị dữ liệu đầu ra tập trung.

### Đội ngũ Backend
Quản lý giao thức HTTP và điều phối trình giải (Solver Orchestration):
- Các tệp tin chính: `main.py`, `router.py`, `solver.py`, `health.py`.

**Nguyên tắc phối hợp:**
- Các route phải được phân phiên bản (versioning) dưới tiền tố `/api/v1`.
- Cấu hình CORS chặt chẽ, chỉ cho phép các origin phát triển của frontend.
- Sử dụng **Pydantic** để xác thực dữ liệu đầu vào.
- Trả về cấu trúc JSON ổn định để Frontend hiển thị dữ liệu chính xác.

### Đội ngũ Python Core / FEA
Quản lý mã nguồn tính toán chuyên sâu:
- Các tệp tin chính: `MeshCreate.py`, `DisplaymentCal.py`.

**Nguyên tắc phối hợp:**
- Tập trung vào thuật toán giải toán, không thay đổi các route API.
- Tách biệt hoàn toàn logic tính toán khỏi các vấn đề về giao diện.
- Khi thay đổi cấu trúc dữ liệu đầu vào, cần cập nhật đồng bộ API schema và mapping phía Frontend.

---

## 3. Quy ước kết nối (Contract) giữa Frontend và Backend

Frontend sẽ gửi dữ liệu đầu vào tới: `POST /api/v1/solver/solve`.

Backend trả về một `job_id` và trạng thái. Sau đó, dữ liệu kết quả sẽ được truy xuất qua:
- `GET /api/v1/solver/jobs/{job_id}`
- `GET /api/v1/solver/jobs/{job_id}/result`

**Dữ liệu trang Results mong đợi:**
- Metadata của công việc, thời gian tính toán, độ võng tối đa (max displacement), các cảnh báo (nếu có) và bảng dữ liệu kết quả (stresses/reactions...).

---

## 4. Quy trình đóng góp để tránh nghẽn (Bottlenecks)

Để tránh xung đột, hãy tuân thủ phạm vi chỉnh sửa:
- **Thay đổi UI**: Chỉ làm việc trong `frontend/src/pages/*`.
- **Thay đổi API**: Chỉ làm việc trong `backend/app/api/v1/*`.
- **Thay đổi thuật toán**: Chỉ làm việc trong `Meshingcode/*`.

**Lưu ý:** Mọi thay đổi về cấu trúc Input/Output cần được thông báo trước khi Merge để các team liên quan kịp thời cập nhật.

---

## 5. Hướng dẫn chạy môi trường cục bộ

**Khởi động Frontend:**
```bash
cd frontend
npm install
npm run dev