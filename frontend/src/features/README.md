# 🧩 Gói Phân Hệ Tính Năng Frontend (`frontend/src/features`)

Thư mục `features/` được tổ chức theo mô hình **Feature-Driven Architecture** (mỗi thư mục đại diện cho một phân hệ nghiệp vụ hoàn chỉnh gồm các màn hình, modal, components con và tests liên quan).

---

## 🗂️ Danh Mục Các Phân Hệ Tính Năng

| Phân hệ | Thư mục | Trách nhiệm nghiệp vụ |
| :--- | :--- | :--- |
| 🏨 **Quản trị hệ thống** | [`admin/`](./admin) | Quản lý danh mục loại phòng, cấu hình giá mùa vụ/ngày lễ, phân quyền tài khoản nhân viên. |
| 🔐 **Xác thực** | [`auth/`](./auth) | Giao diện đăng nhập, hiệu ứng chuyển trang, quên mật khẩu và đặt lại mật khẩu qua email token. |
| 📅 **Đặt phòng & Lịch** | [`booking/`](./booking) | Danh sách đặt phòng, sơ đồ lịch phòng (Timeline 7/14/21 ngày), modal chi tiết đặt phòng, check-in/out, quét CCCD, import Excel. |
| 🧹 **Buồng phòng** | [`housekeeping/`](./housekeeping) | Sơ đồ dọn phòng theo tầng, thanh cân bằng tải phân công việc, quy trình gửi duyệt và nghiệm thu phòng sạch. |
| 🧾 **Hóa đơn & Sổ quỹ** | [`invoice/`](./invoice) | Xem chi tiết hóa đơn, áp dụng chiết khấu, hủy hóa đơn nháp có lý do, chốt sổ quỹ theo ngày. |
| 🌐 **Cổng công khai** | [`public/`](./public) | Cổng đặt phòng online cho khách, modal tra cứu/tự hủy yêu cầu đặt phòng (`CLTSN3-439`), tra cứu hóa đơn trực tuyến (`NCL-09-CN-008`). |
| 📊 **Báo cáo & Thống kê** | [`reports/`](./reports) | Báo cáo doanh thu, chỉ số ADR/RevPAR, cơ cấu kênh bán, phân tích so sánh đa kỳ PoP/YoY (`CLTSN3-431`) kèm xuất CSV. |
| 🛏️ **Ma trận phòng** | [`rooms/`](./rooms) | Sơ đồ ma trận phòng trực quan theo màu sắc trạng thái (Sẵn sàng, Có khách, Cần dọn, Bảo trì). |
| 📢 **Thông báo** | [`notifications/`](./notifications) | Trung tâm thông báo thời gian thực cho lễ tân và quản lý. |
| 🚀 **Trang chủ** | [`landing/`](./landing) | Trang landing page giới thiệu sản phẩm và các tính năng nổi bật. |
