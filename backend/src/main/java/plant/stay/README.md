# 📦 Gói Mã Nguồn Chính Backend (`plant.stay`)

<p align="center">
  <img src="https://img.shields.io/badge/Package-plant.stay-6DB33F?style=for-the-badge&logo=openjdk&logoColor=white" />
  <img src="https://img.shields.io/badge/Architecture-Layered_DDD-38B2AC?style=for-the-badge&logo=diagramsdotnet&logoColor=white" />
  <img src="https://img.shields.io/badge/Transactions-Spring_Transactional-E11D48?style=for-the-badge&logo=spring&logoColor=white" />
</p>

> Thư mục gốc chứa toàn bộ mã nguồn Java của hệ thống **StayAway PMS**. Dự án được thiết kế chặt chẽ theo kiến trúc phân tầng chuẩn (**Domain-Driven Layered Architecture**), phân tách rõ ràng trách nhiệm giữa Controller, DTO, Service, Model và Repository.

---

## 📑 Mục Lục

1. [🏗️ Sơ Đồ Phân Tầng & Trách Nhiệm](#️-sơ-đồ-phân-tầng--trách-nhiệm)
2. [🔄 Mẫu Luồng Backend Dùng Chung Cho Mọi Module](#-mẫu-luồng-backend-dùng-chung-cho-mọi-module)
3. [📌 Nguyên Tắc Thiết Kế Cốt Lõi (Bảo Toàn Tính Năng)](#-nguyên-tắc-thiết-kế-cốt-lõi-bảo-toàn-tính-năng)
4. [📂 Danh Mục Các Gói Thành Phần](#-danh-mục-các-gói-thành-phần)

---

## 🏗️ Sơ Đồ Phân Tầng & Trách Nhiệm

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

## 🔄 Mẫu Luồng Backend Dùng Chung Cho Mọi Module

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
3. [ Service Layer (@Transactional) ]► Kiểm tra Invariants, Logic tính giá, Ghi AuditLog
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

## 📌 Nguyên Tắc Thiết Kế Cốt Lõi (Bảo Toàn Tính Năng)

* **Controller mỏng, Service dày (Thin Controller, Fat Service):** Controller chỉ làm nhiệm vụ parse tham số, validate DTO và gọi Service.
* **DTO cách ly Entity:** Tuyệt đối không trả trực tiếp Entity ra ngoài API để bảo vệ các thông tin nhạy cảm.
* **Bảo toàn giao dịch (`@Transactional`):** Mọi thao tác ghi dữ liệu nhiều bảng (Đặt phòng + Cọc + Hóa đơn) đều được bọc trong `@Transactional` để đảm bảo tính toàn vẹn dữ liệu (Atomic).
* **Tương thích ngược (Backward Compatibility):** Khi thêm trường dữ liệu mới vào DTO/Entity, luôn đặt giá trị mặc định để không phá vỡ các API đang chạy.

---

## 📂 Danh Mục Các Gói Thành Phần

| Gói Package | Trách nhiệm | Liên kết tài liệu |
| :--- | :--- | :--- |
| `config` | Cấu hình Schedulers, CORS, Data Masking | 📄 [Xem chi tiết](./config/README.md) |
| `controller` | 27 REST Controllers tiếp nhận request | 📄 [Xem chi tiết](./controller/README.md) |
| `dto` | Data Transfer Objects (Request & Response) | 📄 [Xem chi tiết](./dto/README.md) |
| `model` | 39 JPA Entities & Enums CSDL | 📄 [Xem chi tiết](./model/README.md) |
| `repository` | 53 Spring Data JPA Repositories | 📄 [Xem chi tiết](./repository/README.md) |
| `service` | Business Logic & Transactions | 📄 [Xem chi tiết](./service/README.md) |
| `util` | Tiện ích băm mật khẩu, Masking, Auth | 📄 [Xem chi tiết](./util/README.md) |
| `exception` | Bắt lỗi toàn cục `@RestControllerAdvice` | 📄 [Xem chi tiết](./exception/README.md) |
