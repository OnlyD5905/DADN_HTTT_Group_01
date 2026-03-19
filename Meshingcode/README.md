# 2D FEA Mesh Generation & Displacement Analysis

Dự án này thực hiện việc chia lưới (Meshing) và Phân tích Phần tử Hữu hạn (FEA) 2D bằng ngôn ngữ Python. Dự án bao gồm 2 chức năng chính tương ứng với 2 file mã nguồn:

1. **`MeshCreate.py`**: Mô phỏng quá trình tạo lưới tứ giác, chia lưới tam giác (Delaunay) và làm mịn lưới (Refinement).
2. **`DisplaymentCal.py`**: Thực hiện bài toán FEA thực tế trên lưới tam giác, tính toán Ma trận độ cứng ($K$), Vector chuyển vị ($U$), Vector tải/Phản lực ($F$) và mô phỏng đồ thị biến dạng của vật thể.

## Yêu cầu hệ thống

- Python 3.x
- Các thư viện: `numpy`, `scipy`, `matplotlib` (được liệt kê trong file `requirements.txt`)

---

## Hướng dẫn cài đặt

### 1. Tạo môi trường ảo (Virtual Environment)

Mở Terminal (trên macOS/Linux) hoặc Command Prompt/PowerShell (trên Windows), di chuyển (`cd`) vào thư mục chứa dự án và chạy lệnh sau để tạo môi trường ảo `venv`:

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

### Phần 1: Chạy mô phỏng tạo lưới (File `MeshCreate.py`)

Chương trình này mô phỏng 3 bước tạo và làm mịn lưới. Chạy lệnh:

```bash
python MeshCreate.py
# hoặc dùng python3 MeshCreate.py (dành cho máy macOS/Linux mặc định cấu hình py3)
```

**Thông số nhập mẫu để chạy thử:**

- Nhập tọa độ x_min: `0`
- Nhập tọa độ x_max: `10`
- Nhập tọa độ y_min: `0`
- Nhập tọa độ y_max: `5`
- Nhập số lượng điểm theo trục x (nx): `6`
- Nhập số lượng điểm theo trục y (ny): `4`
- Nhập số lần lặp tinh chỉnh Refinement (iterations): `1`

---

### Phần 2: Chạy tính toán FEA và Chuyển vị (File `DisplaymentCal.py`)

Chương trình này tính toán các ma trận ($K, U, F$) và vẽ đồ thị biến dạng thực tế của lưới dầm/thanh ngàm 1 đầu chịu lực kéo. Chạy lệnh:

```bash
python DisplaymentCal.py
# hoặc dùng python3 DisplaymentCal.py
```

**Thông số nhập mẫu để chạy thử:**

- Nhập chiều dài d1 (trục x): `10.0`
- Nhập chiều dài d2 (trục y): `5.0`
- Nhập số phần tử p (trục x): `4`
- Nhập số phần tử m (trục y): `2`
- Nhập Young's Modulus (E): `200e9` _(Mô đun đàn hồi của Thép)_
- Nhập Poisson's Ratio (nu): `0.3`
- Nhập Tổng lực kéo ngang ở cạnh phải: `10000`
- Nhập hệ số phóng đại chuyển vị: `1000000` _(Lưu ý: Chuyển vị thực tế cực kỳ nhỏ, cần nhập hệ số từ hàng triệu (1e6) đến trăm triệu (1e8) để có thể quan sát đồ thị biến dạng bằng mắt thường)._

Sau khi nhập thông số cuối cùng, Terminal sẽ in ra kích thước và các giá trị của ma trận $K, U, F$, đồng thời hiển thị đồ thị so sánh vật thể trước và sau khi biến dạng.
