# StayAway — Hệ Thống Quản Lý Cơ Sở Lưu Trú (PMS)

<p align="center">
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=flat-square&logo=openjdk&logoColor=white" />
  <img src="https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=flat-square&logo=spring-boot&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white" />
  <img src="https://img.shields.io/badge/Live-stayaway.io.vn-6C63FF?style=flat-square" />
</p>

> **StayAway** là phần mềm quản lý khách sạn (Property Management System) toàn diện dành cho khách sạn, nhà nghỉ và homestay. Từ đặt phòng, check-in/out, đặt cọc, hóa đơn đến phân công buồng phòng — tất cả trên một nền tảng duy nhất với giao diện hiện đại, phân quyền chi tiết theo vai trò.

---

## 📋 Mục Lục

- [✨ Tính Năng](#-tính-năng)
- [🏗️ Kiến Trúc Hệ Thống](#️-kiến-trúc-hệ-thống)
- [💻 Yêu Cầu Hệ Thống](#-yêu-cầu-hệ-thống)
- [🚀 Cài Đặt & Chạy](#-cài-đặt--chạy)
- [🗄️ Dữ Liệu Demo](#️-dữ-liệu-demo)
- [🔑 Tài Khoản Mặc Định](#-tài-khoản-mặc-định)
- [👤 Vai Trò & Phân Quyền](#-vai-trò--phân-quyền)
- [🔌 API](#-api)
- [🧪 Kiểm Thử](#-kiểm-thử)
- [🐳 CI/CD & Triển Khai](#-cicd--triển-khai)
- [🌐 Live Demo](#-live-demo)
- [📁 Tài Liệu Dự Án](#-tài-liệu-dự-án)

---

## ✨ Tính Năng

### 🏨 Quản lý đặt phòng
- Đặt phòng đơn lẻ và đặt theo **đoàn/nhóm** (Group Booking).
- Tích hợp **kiểm tra xung đột lịch** tự động, không cho phép đặt trùng phòng.
- Quy trình đầy đủ: Đặt phòng → Xác nhận → **Check-in** → **Check-out** → Hoàn tiền cọc.
- Hỗ trợ **gia hạn lưu trú**, **tạm nghỉ**, chuyển đổi trạng thái linh hoạt.
- **Cổng đặt phòng công khai** cho phép khách tự gửi yêu cầu đặt phòng online.

### 💰 Đặt Cọc & Thanh Toán
- Chính sách cọc **linh hoạt theo hạng phòng** (mặc định 30%, tùy chỉnh từng loại).
- Quản lý vòng đời cọc: Chờ cọc → Đã cọc → Hoàn cọc / Giữ cọc / Hủy.
- Hỗ trợ nhiều **phương thức thanh toán**: Tiền mặt, Chuyển khoản, QR Code.
- **Đặt cọc theo đoàn**: áp dụng chính sách riêng cho từng nhóm phòng.

### 🧾 Hóa Đơn & Chiết Khấu
- Xuất hóa đơn tự động khi check-out, tính đủ dịch vụ phụ thu.
- Quản lý **chiết khấu** theo phần trăm hoặc số tiền cố định.
- Tích hợp **dịch vụ phụ thu** (ăn sáng, giặt là, đưa đón sân bay, spa,...).
- Lịch sử thanh toán chi tiết, xuất báo cáo doanh thu.

### 🛏️ Quản Lý Buồng Phòng (Housekeeping)
- **Sơ đồ phòng trực quan** theo tầng, màu trạng thái (Sẵn sàng / Có khách / Cần dọn / Chờ duyệt / Bảo trì).
- **Phân công nhân viên** dọn phòng với quy tắc không gán chồng.
- **Mức độ ưu tiên** gợi ý theo giờ nhận phòng của khách kế tiếp (Khẩn cấp / Cao / Bình thường).
- Luồng 2 bước: Nhân viên **gửi duyệt** → Quản lý **nghiệm thu**.
- Nhân viên buồng phòng chỉ thấy phòng được giao và phòng chưa ai nhận.
- Thanh **phân bổ khối lượng** hiển thị số phòng đang giao cho từng người.

### 📋 Khai Báo Lưu Trú & Quét CCCD
- Hỗ trợ quét mã QR trên **CCCD gắn chip** để tự động điền nhanh hồ sơ khách.
- Lưu thông tin giấy tờ tùy thân (CMND/CCCD/Hộ chiếu) của từng khách.
- Hỗ trợ khai báo nhiều khách trong cùng một booking.
- Cơ chế che mờ thông tin cá nhân nhạy cảm (**Data Masking**) theo phân quyền.

### 📊 Báo Cáo & Thống Kê
- Doanh thu theo ngày / tuần / tháng.
- Báo cáo công suất phòng, tỷ lệ lấp đầy, ca làm việc thu ngân.
- **Nhật ký kiểm toán (Audit Log)**: ghi lại mọi thao tác kèm người thực hiện và thời gian.
- Nhật ký **xử lý xung đột** đặt phòng (Concurrency Log).

### 🏅 Khách Hàng Thân Thiết
- 4 hạng thành viên: **Đồng → Bạc → Vàng → Kim Cương**.
- Ưu đãi theo hạng: giảm giá, ưu tiên nhận phòng sớm, nâng hạng phòng.
- Quản lý hồ sơ khách hàng và lịch sử lưu trú.

### 📦 Kho Đồ Dùng
- Theo dõi số lượng đồ dùng khách sạn (khăn, đồ vệ sinh cá nhân,...).
- Cảnh báo khi tồn kho thấp hơn ngưỡng cài đặt.

### ⚙️ Cấu Hình Cơ Sở
- Tên cơ sở, địa chỉ, giờ check-in/out mặc định, logo, ảnh đại diện.
- Giá theo mùa (Seasonal Pricing), chính sách phụ thu lễ tết & cuối tuần.

---

## 🏗️ Kiến Trúc Hệ Thống

```
roomi/
├── backend/                          # Spring Boot 3 · Java 17
│   ├── src/main/java/plant/stay/
│   │   ├── controller/               # 27 REST Controllers
│   │   ├── service/                  # Business logic layer
│   │   │   └── impl/                 # Service implementations
│   │   ├── model/                    # 39 JPA Entities
│   │   ├── repository/               # Spring Data JPA Repositories
│   │   ├── dto/                      # Request / Response DTOs
│   │   ├── exception/                # Global exception handling
│   │   ├── config/                   # DataSeeder, CORS, Cloudinary
│   │   └── util/                     # AuthUtil, HashUtil, Masker
│   └── src/test/                     # 62 Unit Tests (JUnit 5 + Mockito)
│
├── frontend/                         # React 18 · Vite 6
│   └── src/
│       ├── features/
│       │   ├── admin/                # Quản lý phòng, loại phòng, nhân sự
│       │   ├── booking/              # Đặt phòng, check-in/out, khai báo lưu trú
│       │   ├── housekeeping/         # Danh sách dọn phòng, phân công
│       │   ├── invoice/              # Hóa đơn, chiết khấu
│       │   ├── reports/              # Báo cáo doanh thu
│       │   ├── public/               # Cổng đặt phòng public
│       │   └── landing/              # Trang chủ giới thiệu
│       ├── services/                 # Axios API clients
│       ├── context/                  # AuthContext, ToastContext
│       ├── layouts/                  # DashboardLayout, AuthLayout
│       └── components/               # UI components dùng chung
│
├── docker-compose.yml                # Cấu hình đa container Production
├── .github/workflows/
│   └── deploy.yml                    # Automated CI/CD Pipeline (GitHub Actions)
└── docs/                             # Tài liệu nghiệp vụ, hướng dẫn & test cases
```

### Stack Công Nghệ

| Tầng | Công nghệ |
|------|-----------|
| **Backend** | Java 17, Spring Boot 3, Spring Data JPA, Hibernate, JUnit 5, Mockito |
| **Database** | MySQL 8 (production), H2 in-memory (test) |
| **Authentication** | Session-based auth, SHA-256 password hashing |
| **File Storage** | Cloudinary CDN (upload ảnh phòng, avatar) |
| **Frontend** | React 18, Vite 6, Vanilla CSS, React Icons, Axios, Vitest |
| **DevOps** | Docker, Docker Compose, Nginx (SPA routing + Gzip) |
| **CI/CD** | GitHub Actions & GitHub Container Registry (GHCR) |
| **Hosting** | AWS EC2 VPS (Ubuntu Server) |

---

## 💻 Yêu Cầu Hệ Thống

**Chạy bằng Docker (Khuyến nghị):**
- Docker Desktop 24+ & Docker Compose v2
- MySQL 8 (hoặc cấu hình kết nối DB từ xa qua file `.env`)

**Chạy thủ công (Dev):**
- Java 17+ & Maven 3.9+
- Node.js 20+ & npm 10+
- MySQL 8 đang chạy tại `localhost:3306`, database tên `stay`

---

## 🚀 Cài Đặt & Chạy

### Cách 1 — Docker Compose (Khuyến nghị)

```bash
# 1. Clone dự án
git clone https://github.com/dargits/roomi.git
cd roomi

# 2. (Tuỳ chọn) Tạo file .env để override cấu hình
cp .env.example .env   # Chỉnh DB_URL, CLOUDINARY_* nếu cần

# 3. Khởi chạy toàn bộ hệ thống
docker compose up -d --build

# 4. Truy cập
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080/api/v1
```

### Cách 2 — Dev Server (Chạy độc lập)

```bash
# ── Terminal 1: Backend ──────────────────────────────────
cd backend

# (Windows) Đảm bảo MySQL đang chạy và database "stay" đã tạo
# Sửa src/main/resources/application.properties nếu cần

./mvnw spring-boot:run
# API sẵn sàng tại: http://localhost:8080

# ── Terminal 2: Frontend ─────────────────────────────────
cd frontend
npm install
npm run dev
# Truy cập: http://localhost:5173
```

> **Lần đầu chạy**, `DataSeeder` tự động tạo toàn bộ dữ liệu mẫu: loại phòng (Tiêu Chuẩn / Cao Cấp / Sang Trọng / Tổng Thống), 15 phòng qua 4 tầng, 6 dịch vụ phụ thu, chính sách cọc 30%, 4 hạng hội viên, và các tài khoản nhân viên mặc định.

---

## 🗄️ Dữ Liệu Demo

| Loại phòng | Số phòng | Tầng | Giá cơ bản |
|------------|----------|------|-----------|
| Tiêu Chuẩn | 101–105 | 1 | 500.000 ₫/đêm |
| Cao Cấp | 201–205 | 2 | 700.000 ₫/đêm |
| Sang Trọng | 301–303 | 3 | 1.000.000 ₫/đêm |
| Tổng Thống | 401–402 | 4 | 2.000.000 ₫/đêm |

**Dịch vụ phụ thu có sẵn:**  
Ăn sáng buffet · Đưa đón sân bay · Giặt là · Giường phụ · Thuê xe máy · Spa thư giãn

> 💡 **Khởi tạo dữ liệu mẫu tự động:** Khi ứng dụng khởi chạy lần đầu, `DataSeeder` sẽ tự động nạp toàn bộ dữ liệu mẫu (phòng, loại phòng, giá, tiện ích, tài khoản nhân viên, chính sách cọc) vào database mà không cần chạy file SQL thủ công.

---

## 🔑 Tài Khoản Mặc Định

> Mật khẩu tất cả tài khoản: **`pass@123`**

| Vai trò | Tài khoản | Tên |
|---------|-----------|-----|
| Admin | `admin` | Bàn Hữu Sự |
| Chủ cơ sở | `chusohuu` | Trần Thị Mai |
| Lễ tân | `letan` | Lê Ngọc Hân |
| Buồng phòng | `buongphong` | Phạm Thị Yến |
| Buồng phòng 2 | `buongphong2` | Nguyễn Văn Nam |
| Kế toán | `ketoan` | Hoàng Minh Trí |

---

## 👤 Vai Trò & Phân Quyền

| Vai trò | Quyền hạn chính |
|---------|----------------|
| **OWNER** | Toàn quyền: cấu hình hệ thống, quản lý nhân sự, xem mọi báo cáo, khóa/mở phòng bảo trì |
| **ADMIN** | Quản trị người dùng, phân vai trò, xem audit log hệ thống |
| **RECEPTIONIST** | Đặt phòng, check-in/out, thu/hoàn cọc, xuất hóa đơn, phân công buồng phòng, phê duyệt phòng sạch |
| **HOUSEKEEPER** | Xem phòng được giao + phòng chưa ai nhận, cập nhật trạng thái dọn, gửi xin kiểm tra |
| **ACCOUNTANT** | Quản lý hóa đơn, theo dõi đặt cọc, xem báo cáo tài chính |
| **CUSTOMER** | Đặt phòng qua cổng public, xem lịch sử đặt phòng cá nhân |

---

## 🔌 API

Base URL: `http://localhost:8080/api/v1`

Authentication: Header `Authorization: <session-token>` (lấy từ `POST /auth/login`)

**Các nhóm API chính:**

| Nhóm | Prefix | Mô tả |
|------|--------|-------|
| Xác thực | `/auth` | Login, Register, Logout |
| Người dùng | `/users` | Profile, phân quyền, khóa tài khoản |
| Phòng | `/rooms` | CRUD phòng, mark-clean, assign-cleaner |
| Loại phòng | `/room-types` | CRUD loại phòng, giá, ảnh |
| Đặt phòng | `/bookings` | Đặt phòng, check-in, check-out, gia hạn |
| Đặt cọc | `/deposits` | Thu cọc, hoàn cọc, báo cáo cọc |
| Hóa đơn | `/invoices` | Xuất hóa đơn, chiết khấu |
| Khai báo lưu trú | `/stay-declarations` | CRUD giấy tờ khách, trích xuất CCCD |
| Đặt phòng đoàn | `/group-bookings` | Đặt/quản lý booking nhóm |
| Dịch vụ phụ thu | `/extra-services` | CRUD dịch vụ |
| Báo cáo | `/reports` | Doanh thu, công suất, ca làm việc, nhật ký |
| Nhật ký | `/audit-logs` | Lịch sử thao tác hệ thống |
| Cài đặt khách sạn | `/hotel-settings` | Thông tin cơ sở, giờ check-in/out |
| Cổng public | `/public/*` | Đặt phòng không cần đăng nhập |

---

## 🧪 Kiểm Thử

```bash
# Backend — 62 unit tests (JUnit 5 + Mockito)
cd backend
./mvnw test

# Frontend — 45 tests (Vitest + Testing Library)
cd frontend
npm test
```

**Phạm vi kiểm thử Backend:**
- `BookingServiceTest` — Kiểm thử quy trình đặt phòng, kiểm tra xung đột ngày, check-in/out, đổi ngày và khóa phòng
- `GroupBookingServiceTest` — Đặt phòng đoàn, tự động phân phối phòng, cọc đoàn
- `InvoiceServiceTest` — Lập hóa đơn khi nhận/trả phòng, chiết khấu phần trăm/tiền mặt, thanh toán
- `GuestServiceTest` — Quản lý hồ sơ khách hàng, tìm kiếm đa tiêu chí, bảo vệ dữ liệu cá nhân
- `RoomServiceTest` — Quản lý phòng, ngăn trùng số phòng, luồng đổi trạng thái dọn phòng
- `UserServiceTest` — Đăng nhập, phân quyền người dùng, mã hóa mật khẩu
- `HotelSettingServiceTest`, `StayDeclarationServiceTest`, `ExtraServiceTest` — Cấu hình khách sạn, giấy tờ lưu trú và dịch vụ phụ thu

---

## 🐳 CI/CD & Triển Khai

### Luồng Tự Động

```
Push nhánh phụ / PR (develop, feature/*, fix/*)
    └─► GitHub Actions Pipeline (.github/workflows/deploy.yml)
        ├─► Build + Test Backend (Spring Boot + H2)
        ├─► Build + Test Frontend (Vite + Vitest)
        └─► ❌ Không deploy (chỉ kiểm tra chất lượng)

Merge vào main / manual dispatch
    └─► GitHub Actions Pipeline (.github/workflows/deploy.yml)
        ├─► Chạy toàn bộ Test BE & FE
        ├─► Build & Push Docker Images lên GHCR (ghcr.io/dargits/roomi-*)
        └─► SSH vào VPS → docker compose pull && up -d
            └─► ✅ Live tại https://stayaway.io.vn
```

### Triển Khai Tự Động Lên VPS

```bash
git add .
git commit -m "feat: your feature"
git push origin main
# Theo dõi pipeline tại tab Actions trên GitHub
```

### Biến Môi Trường Production

| Biến | Mô tả |
|------|-------|
| `DB_URL` | JDBC URL kết nối MySQL database |
| `DB_USER` / `DB_PASS` | Thông tin đăng nhập Database |
| `CLOUDINARY_CLOUD_NAME` | Cloud Name Cloudinary |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Khóa xác thực Cloudinary CDN |
| `VITE_API_BASE_URL_PROD` | Đường dẫn API backend cho production build (mặc định `/api/v1` - relative path tự động thích ứng domain) |

---

## 🌐 Live Demo

🔗 **[stayaway.io.vn](https://stayaway.io.vn)** — Hệ thống thực tế trên AWS EC2 VPS, tự động triển khai Zero-Downtime qua GitHub Actions + Docker Compose.

---

## 📁 Tài Liệu Dự Án

| Tài liệu | Mô tả |
|----------|-------|
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Tài liệu hướng dẫn CI/CD toàn diện, kiến trúc Docker và triển khai VPS tự động |
| [`docs/LUONG_DAT_PHONG_DOAN_CHI_TIET.md`](docs/LUONG_DAT_PHONG_DOAN_CHI_TIET.md) | Phân tích chi tiết quy tắc nghiệp vụ & UI/UX đặt phòng theo đoàn |
| [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) | Hướng dẫn sử dụng hệ thống chi tiết cho từng vai trò người dùng |
| [`docs/E2E_TEST_CASES.md`](docs/E2E_TEST_CASES.md) | Kịch bản kiểm thử tích hợp End-to-End toàn hệ thống |
| [`backend/docs/api-docs.md`](backend/docs/api-docs.md) | Danh mục đặc tả toàn bộ REST API của hệ thống |

---

<p align="center">
  Made with ❤️ by <strong>Open Way</strong> &nbsp;·&nbsp; CodeGym Vietnam 2026
</p>
