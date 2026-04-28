**TUẦN 6: TÍCH HỢP HỆ THỐNG & ĐIỀU KIỆN BIÊN (BOUNDARY CONDITIONS)**

**Mục tiêu:** Hoàn thiện luồng dữ liệu xuyên suốt từ Nhập liệu → Sinh lưới → Áp điều kiện biên → Giải FEA → Hiển thị kết quả.

1\. Vị trí 3 (Frontend \- UI/UX)

* **Thiết kế UI tương tác lưới:** Phát triển tính năng cho phép người dùng click chọn trực tiếp các Nút (Node) hoặc Cạnh (Edge) trên bản đồ lưới để highlight.  
* **Menu điều kiện biên:** Xây dựng form lựa chọn loại ràng buộc: Ngàm cố định (Fixed support) hoặc Lực tập trung (Point load).  
* **Chặn lỗi PSLG:** Tích hợp logic ngăn chặn người dùng nhập các ranh giới rỗng hoặc cắt nhau ngay tại giao diện.

2\. Vị trí 2 (Visualization Expert)

* **Vẽ ký hiệu kỹ thuật:** Hiển thị trực quan các ký hiệu ngàm (tam giác) và mũi tên lực trên Dashboard tại các vị trí đã chọn.  
* **Tối ưu tương tác:** Cài đặt chế độ "Magnifier" (kính lúp) khi Zoom để người dùng dễ dàng chọn chính xác các Node trong lưới mịn.

3\. Vị trí 4 & 5 (Core Algorithm & Mechanics)

* **Nâng cấp FEA Solver:** Chỉnh sửa hàm solve\_fea\_triangle để nhận mảng các Node bị cố định (fixed\_dofs) từ API thay vì gán cứng.  
* **Tinh chỉnh lưới (Refinement):** Hiện thực thuật toán Ruppert để loại bỏ các tam giác quá nhọn (skinny triangles) có góc nhỏ hơn $20^\\circ$.

4\. Vị trí 6 (Backend & Database)

* **Mở rộng API:** Phát triển endpoint nhận cấu trúc dữ liệu BoundaryConditions từ Frontend gửi về.  
* **Cơ sở dữ liệu:** Thiết kế bảng Projects để lưu trữ tọa độ ranh giới, thông số lưới và kết quả chuyển vị cuối cùng.

---

**TUẦN 7: TÍCH HỢP AI & KIỂM CHỨNG (VALIDATION)**

**Mục tiêu:** Huấn luyện mô hình AI gợi ý linh kiện và đảm bảo tính chính xác của các phép toán cơ kỹ thuật.

1\. Vị trí 1 (PM/AI Lead) & Vị trí 6

* **Chuẩn bị dữ liệu:** Backend thực hiện xuất dữ liệu mô phỏng (Tải trọng, Ứng suất, Vật liệu) thành file CSV/JSON làm tập huấn luyện.  
* **Huấn luyện mô hình MLP:** Xây dựng mô hình MLPClassifier để dự đoán và gợi ý linh kiện phù hợp dựa trên thông số đầu vào.

2\. Vị trí 5 (Mechanics Specialist)

* **Kiểm chứng (Validation):** Thiết lập các bài toán mẫu (Dầm chịu uốn, Tấm chịu kéo) và so sánh kết quả của nhóm với phần mềm ANSYS hoặc Abaqus.  
* **Đầu ra:** Lập bảng đối chiếu sai số để đưa vào báo cáo cuối kỳ.

3\. Vị trí 4 (Software Architect)

* **Tối ưu hiệu năng:** Chuyển đổi việc tính toán ma trận độ cứng $K$ sang dạng ma trận thưa (Sparse Matrix) để xử lý các lưới có số lượng phần tử lớn.

---

**TUẦN 8: HOÀN THIỆN & BÁO CÁO CUỐI KỲ**

**Mục tiêu:** Đóng gói sản phẩm, xử lý lỗi tồn đọng và chuẩn bị tài liệu thuyết trình.

1\. Vị trí 2 (Visualization)

* **Bản đồ nhiệt ứng suất (Heatmap):** Hiển thị phân bổ ứng suất theo thang màu (đỏ cho vùng nguy hiểm, xanh cho vùng an toàn) trên vật thể biến dạng.

2\. Vị trí 3 (Frontend)

* **Dashboard tổng hợp:** Kết hợp bảng điều khiển thông số, màn hình hiển thị lưới và khu vực hiển thị gợi ý từ AI vào một giao diện duy nhất.

3\. Vị trí 1 (Project Manager)

* **Rà soát GitHub:** Kiểm tra lại toàn bộ tài liệu README, Wiki và đóng các Issues còn tồn đọng trên Repository.  
* **Đóng gói báo cáo:** Tổng hợp Slide thuyết trình và file báo cáo PDF cuối kỳ dựa trên tiến độ thực tế 8 tuần.

4\. Cả nhóm

* **Kiểm thử cuối cùng:** Thực hiện kiểm tra độ trễ (latency) của hệ thống và fix các bug giao diện cuối cùng trước khi demo.

