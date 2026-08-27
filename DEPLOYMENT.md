# 🐳 Hướng Dẫn Triển Khai CI/CD & Deploy Tự Động Lên VPS Bằng Docker (StayAway)

Dự án StayAway được thiết lập **100% bằng Docker & Docker Compose** kết hợp **GitHub Actions CI/CD Pipeline**, giúp việc deploy lên VPS hoàn toàn tự động, sạch sẽ và độc lập với môi trường máy chủ.

---

## 📌 1. Luồng Hoạt Động CI/CD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Push code lên GitHub (develop, feature/*, fix/*, ...)                   │
│    └─► Chạy CI Test (.github/workflows/ci.yml)                             │
│        ├─► ☕ Test Backend (Spring Boot + JUnit 5 + H2 In-Memory)           │
│        ├─► ⚛️ Test Frontend (Vitest + React Testing Library)                │
│        └─► ❌ KHÔNG DEPLOY LÊN VPS                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. Push / Merge vào nhánh MAIN                                              │
│    └─► Chạy CD Pipeline (.github/workflows/cd.yml)                         │
│        ├─► 🛡️ Bước 1: CI Gate (Chạy toàn bộ Test BE + FE + Build)          │
│        └─► 🚀 Bước 2: Tự động SSH vào VPS                                   │
│            ├─► Pull code mới nhất từ nhánh `main`                           │
│            ├─► `docker compose up -d --build` (Build lại Backend & Frontend)│
│            └─► ✅ Dịch vụ sẵn sàng tại: http://roomi.website                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ 2. Cấu Trúc Docker Trong Dự Án

* **[`Backend/Dockerfile`](Backend/Dockerfile)**:
  * Multi-stage build với `maven:3.9.6-eclipse-temurin-17-alpine` để đóng gói file JAR.
  * Runtime sử dụng `eclipse-temurin:17-jre-alpine` siêu nhẹ, bảo mật cao.
* **[`Frontend/Dockerfile`](Frontend/Dockerfile)** & **[`Frontend/nginx.conf`](Frontend/nginx.conf)**:
  * Stage 1 build React bằng `node:20-alpine`.
  * Stage 2 phục vụ Static Bundle bằng `nginx:alpine` với nén Gzip, cache tĩnh và xử lý SPA Routing.
* **[`docker-compose.yml`](docker-compose.yml)**:
  * Quản lý kết nối mạng nội bộ (`stayaway_network`), ánh xạ cổng `80` (Frontend) và `8080` (Backend).

---

## 🔐 3. Các GitHub Secrets Cần Thiết

Đã có sẵn trên GitHub Repository (**Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions**):

| Secret | Mô tả | Ví dụ |
| :--- | :--- | :--- |
| `SERVER_HOST` | Địa chỉ IP VPS | `13.236.183.211` |
| `SERVER_USER` | Tên người dùng SSH | `ubuntu` / `root` |
| `SSH_PRIVATE_KEY` | Private Key SSH để đăng nhập VPS | `-----BEGIN OPENSSH PRIVATE KEY...` |
| `VITE_API_BASE_URL_PROD` | URL API Backend Production | `http://13.236.183.211:8080/api/v1` |

---

## 🧪 4. Chạy Kiểm Thử Tại Máy Local Trước Khi Push

```bash
# Kiểm tra Backend
cd Backend
./mvnw test

# Kiểm tra Frontend
cd ../Frontend
npm test
```

---

## 🚀 5. Thao Tác Deploy

Bạn chỉ cần push code lên nhánh `main`:
```bash
git add .
git commit -m "feat: complete Docker containerization and CI/CD automated VPS deployment"
git push origin main
```
Sau đó vào tab **Actions** trên GitHub để quan sát pipeline tự động build và chạy container trên VPS của bạn!

---

## 💻 6. Triển Khai Bản Chạy Thử Tại Máy Cục Bộ (Local Trial Run)

### Cách 1: Chạy bằng Docker Compose (Khuyến nghị)
```bash
# 1. Khởi động toàn bộ dịch vụ (Database, Backend, Frontend)
docker compose up -d --build

# 2. Truy cập hệ thống:
# - Frontend: http://localhost:80 hoặc http://localhost:5173
# - Backend API: http://localhost:8080/api/v1
```

### Cách 2: Chạy độc lập bằng Dev Server
```bash
# Terminal 1 - Khởi động Backend (Spring Boot)
cd Backend
./mvnw spring-boot:run

# Terminal 2 - Khởi động Frontend (React + Vite)
cd Frontend
npm install
npm run dev
```

### Nạp Dữ liệu Trình diễn (Demo Data Seed):
- Dữ liệu demo mẫu đầy đủ (Khách sạn, Loại phòng, Phòng, Khách hàng, Đặt phòng, Đặt cọc, Hóa đơn) được lưu tại: [`docs/demo-data.sql`](docs/demo-data.sql).
- Có thể nạp qua MySQL Workbench, DBeaver hoặc terminal:
```bash
mysql -u root -p stayaway_db < docs/demo-data.sql
```

### Tài khoản chạy thử nghiệm:
| Vai trò | Tài khoản | Mật khẩu |
|---|---|---|
| Chủ cơ sở (Owner) | `owner` | `password` / `123456` |
| Lễ tân (Receptionist) | `receptionist` | `password` / `123456` |
| Buồng phòng (Housekeeper) | `housekeeper` | `password` / `123456` |
| Kế toán (Accountant) | `accountant` | `password` / `123456` |
| Quản trị viên (Admin) | `admin` | `password` / `123456` |
