# 2D FEA Mesh Generation & Delaunay Refinement

Dự án này thực hiện việc chia lưới (Meshing) cho phân tích phần tử hữu hạn (FEA) 2D bằng ngôn ngữ Python. Chương trình mô phỏng trực quan quá trình tạo lưới qua 3 bước:

1. **Bước 1:** Tạo lưới tứ giác (Quad Mesh) cơ bản.
2. **Bước 2:** Chia lưới tam giác sử dụng giải thuật Delaunay.
3. **Bước 3:** Làm mịn lưới (Delaunay Refinement) bằng cách tìm tâm đường tròn ngoại tiếp để chia nhỏ các tam giác có góc nhọn (skinny triangles).

## Yêu cầu hệ thống

- Python 3.x
- Các thư viện: `numpy`, `scipy`, `matplotlib` (được liệt kê trong file `requirements.txt`)

---

## Hướng dẫn cài đặt

### 1. Tạo môi trường ảo (Virtual Environment)

Mở Terminal (trên macOS/Linux) hoặc Command Prompt/PowerShell (trên Windows), di chuyển vào thư mục chứa dự án và chạy lệnh sau để tạo môi trường ảo `venv`:

**Trên macOS/Linux:**

```bash
python3 -m venv venv
```

**Trên Windows:**

```cmd
python -m venv venv
```

### 2. Kích hoạt môi trường ảo

Bạn cần kích hoạt `venv` trước khi cài đặt thư viện. Khi kích hoạt thành công, bạn sẽ thấy chữ `(venv)` xuất hiện ở đầu dòng lệnh.

**Trên macOS/Linux:**

```bash
source venv/bin/activate
```

**Trên Windows:**

```cmd
venv\Scripts\activate
```

### 3. Cài đặt thư viện

Đảm bảo bạn đang ở trong môi trường ảo, sau đó chạy lệnh sau để cài đặt toàn bộ các thư viện cần thiết:

```bash
pip install -r requirements.txt
```

---

## Hướng dẫn sử dụng

### Khởi chạy chương trình

Chạy file mã nguồn chính bằng lệnh:

```bash
python Meshing_create.py
python3 Meshing_create.py (cho ai sử dụng py3)
```

### Nhập thông số đầu vào ví dụ có thể nhập số khác

Chương trình sẽ yêu cầu bạn nhập các thông số trực tiếp trên Terminal để vẽ hình. Dưới đây là một bộ thông số mẫu cơ bản để bạn chạy thử lần đầu:

- Nhập tọa độ x_min: `0`
- Nhập tọa độ x_max: `10`
- Nhập tọa độ y_min: `0`
- Nhập tọa độ y_max: `5`
- Nhập số lượng điểm theo trục x (nx): `6`
- Nhập số lượng điểm theo trục y (ny): `4`
- Nhập số lần lặp tinh chỉnh Refinement (iterations): `1`
