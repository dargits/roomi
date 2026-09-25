# 📦 Gói Mã Nguồn Chính Backend (`plant.stay`)

Thư mục gốc chứa toàn bộ mã nguồn Java của hệ thống StayAway PMS. Dự án được thiết kế chặt chẽ theo kiến trúc phân tầng chuẩn (**Domain-Driven Layered Architecture**), phân tách rõ ràng trách nhiệm giữa các thành phần.

---

## 🏛️ Sơ Đồ Phân Tầng & Trách Nhiệm

```
plant.stay/
├── ⚙️ config/        # Cấu hình hệ thống, Background Schedulers, CORS, Data Masking
├── 🌐 controller/    # 27 REST Controllers - Tiếp nhận HTTP Request, routing và trả về DTO
├── 🔄 dto/           # Data Transfer Objects (request/ & response/) - Đóng gói dữ liệu API
├── 📢 event/          # Hệ thống lắng nghe và phát sinh sự kiện nội bộ
├── ⚠️ exception/      # Bắt và chuẩn hóa mã lỗi toàn cục (@RestControllerAdvice)
├── 🗄️ model/          # 39 JPA Entities & Enums - Ánh xạ các bảng trong CSDL MySQL
├── 🔍 repository/     # Spring Data JPA Repositories - Giao tiếp và truy vấn CSDL
├── 💼 service/        # Business Logic Layer - Xử lý nghiệp vụ & Quản lý giao dịch (@Transactional)
└── 🛠️ util/           # Tiện ích mã hóa mật khẩu, kiểm tra quyền hạn, băm dữ liệu
```

---

## 📌 Nguyên Tắc Thiết Kế Cốt Lõi
1. **Controller mỏng, Service dày (Thin Controller, Fat Service):** Controller chỉ làm nhiệm vụ parse tham số, validate DTO và gọi Service. Toàn bộ logic nghiệp vụ, tính giá, kiểm tra trùng lặp đặt phòng được xử lý tại Service.
2. **DTO cách ly Entity:** Tuyệt đối không trả trực tiếp Entity ra ngoài API để bảo vệ các thông tin nhạy cảm và tránh lỗi Lazy Initialization / Vòng lặp JSON.
3. **Quản lý giao dịch an toàn:** Mọi thao tác ghi dữ liệu nhiều bảng (Đặt phòng + Cọc + Hóa đơn) đều được bọc trong `@Transactional` để đảm bảo tính toàn vẹn dữ liệu (Atomic).
