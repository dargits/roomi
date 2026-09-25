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

## 🔄 Mẫu Luồng Backend Dùng Chung Cho Mọi Module (Generic Backend Flow)

Mọi module trong hệ thống (Booking, Invoice, Room, Channel, Guest, ExtraService, Auth...) đều tuân theo chuẩn 6 bước sau:

```
[ Client Request (JSON / HTTP) ]
              │
              ▼
1. [ Filter & Security Layer ] ──────► CORS, JWT Token, Lấy phiên người dùng (AuthUtil)
              │
              ▼
2. [ Controller Layer ] ────────────► Validate DTO (@Valid), Bóc tách tham số
              │
              ▼
3. [ Service Layer (@Transactional) ]► Kiểm tra Invariants, Tính toán logic, Ghi AuditLog
              │
              ▼
4. [ Repository Layer (JPA) ] ──────► Truy vấn JPQL/Derived queries, Lưu vào CSDL MySQL
              │
              ▼
5. [ Data Masking Advice ] ─────────► Tự động che mờ CCCD/SĐT nếu không đủ quyền
              │
              ▼
6. [ Response / Exception Handler ] ─► Trả về JSON chuẩn hoặc bắt ngoại lệ tập trung
```

---

## 📌 Nguyên Tắc Thiết Kế Cốt Lõi (Đảm Bảo Không Ảnh Hưởng Tính Năng Có Sẵn)
1. **Controller mỏng, Service dày (Thin Controller, Fat Service):** Controller chỉ làm nhiệm vụ parse tham số, validate DTO và gọi Service. Toàn bộ logic nghiệp vụ, tính giá, kiểm tra trùng lặp đặt phòng được xử lý tại Service.
2. **DTO cách ly Entity:** Tuyệt đối không trả trực tiếp Entity ra ngoài API để bảo vệ các thông tin nhạy cảm và tránh lỗi Lazy Initialization / Vòng lặp JSON.
3. **Bảo toàn giao dịch (`@Transactional`):** Mọi thao tác ghi dữ liệu nhiều bảng (Đặt phòng + Cọc + Hóa đơn) đều được bọc trong `@Transactional` để đảm bảo tính toàn vẹn dữ liệu (Atomic).
4. **Tương thích ngược (Backward Compatibility):** Khi thêm trường dữ liệu mới vào DTO/Entity, luôn đặt giá trị mặc định để không phá vỡ các API đang chạy.
