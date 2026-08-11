# 🏨 Roomi - Hệ Thống Quản Lý Lưu Trú & Đặt Phòng Khách Sạn / Căn Hộ

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.0-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.2.7-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.1.1-purple.svg)](https://vitejs.dev/)
[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue.svg)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg)](https://www.docker.com/)

**Roomi** là hệ thống phần mềm quản lý lưu trú, khách sạn, căn hộ dịch vụ và homestay toàn diện được thiết kế tối ưu cho các cơ sở kinh doanh tại Việt Nam. Hệ thống đáp ứng trọn vẹn quy trình nghiệp vụ từ quản lý sơ đồ phòng theo thời gian thực, đặt phòng trực tuyến & tại chỗ, làm thủ tục check-in/check-out, tính tiền phòng & phụ phí theo thời gian (giờ/ngày/đêm/theo mùa), quản lý dịch vụ đính kèm, phân công buồng phòng dọn dẹp, tới xuất báo cáo doanh thu & xuất file Excel khai báo thông tin khách lưu trú với cơ quan công an (Lưu Trú Số).

---

## 📌 Mục Lục

- [✨ Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
- [🛠️ Công Nghệ Sử Dụng](#️-công-nghệ-sử-dụng)
- [📂 Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án](#-hướng-dẫn-cài-đặt--chạy-dự-án)
- [🔐 Phân Quyền & Vai Trò Hệ Thống](#-phân-quyền--vai-trò-hệ-thống)
- [⚙️ Quy Trình CI/CD & Deployment](#️-quy-trình-cicd--deployment)
- [📖 Tài Liệu Kiến Trúc & API Spec](#-tài-liệu-kiến-trúc--api-spec)

---

## ✨ Tính Năng Nổi Bật

### 🏨 1. Quản Lý Sơ Đồ Phòng & Trạng Thái Trực Quan
- Sơ đồ phòng trực quan hiển thị màu sắc theo trạng thái thời gian thực: `Trống (AVAILABLE)`, `Đang ở (OCCUPIED)`, `Cần dọn dẹp (NEEDS_CLEANING)`, `Bảo trì (MAINTENANCE)`.
- Cập nhật trạng thái phòng tức thì khi thực hiện check-in, check-out hoặc phân công buồng phòng.
- Bộ lọc danh sách phòng linh hoạt theo tầng, loại phòng và tình trạng vệ sinh.

### 🛎️ 2. Quản Lý Vòng Đời Đặt Phòng & Cổng Đặt Phòng Công Khai
- Quản lý luồng trạng thái booking chuẩn nghiệp vụ:
  - `Mới tạo (NEW)` ➔ `Đã xác nhận (CONFIRMED)` ➔ `Đã nhận phòng (CHECKED_IN)` ➔ `Đã trả phòng (CHECKED_OUT)` / `Hủy (CANCELLED)` / `Khách không đến (NO_SHOW)`.
- **Đổi phòng linh hoạt (Change Room)**: Hỗ trợ chuyển phòng cho khách trước hoặc trong thời gian lưu trú với tính năng tự động hạch toán chênh lệch tiền phòng.
- **Cổng đặt phòng trực tuyến (Public Booking Portal)**: Cho phép khách hàng tự tra cứu phòng trống, xem giá, chọn loại phòng và tạo đơn đặt phòng trực tuyến không cần qua nhân viên.

### 💰 3. Bộ Máy Tính Giá Linh Hoạt & Cấu Hình Phụ Phí
- Tự động tính giá thuê theo nhiều hình thức: **Theo giờ**, **Theo ngày**, **Qua đêm**.
- **Giá theo mùa & ngày lễ (Seasonal Rates)**: Cho phép cấu hình tăng/giảm giá tự động theo từng khung ngày lễ hoặc mùa cao điểm.
- **Tính phụ thu thông minh (Surcharges)**: Tự động hoặc thủ công tính phụ phí check-in sớm, check-out muộn, thêm người lớn/trẻ em, và các dịch vụ đính kèm (giặt ủi, minibar, thuê xe...).

### 🪪 4. Quản Lý Khách Hàng & Khai Báo Lưu Trú Số
- Quản lý hồ sơ định danh khách hàng: Họ tên, CCCD/Hộ chiếu, Số điện thoại, Email, Quốc tịch, Hạng thành viên (`DIAMOND`, `PLATINUM`, `GOLD`, `SILVER`, `BRONZE`, `MEMBER`).
- Tự động tra cứu & nhận diện khách cũ qua SĐT/CCCD khi đặt phòng để tránh trùng lặp dữ liệu.
- **Xuất file Excel báo cáo khách lưu trú (Lưu Trú Số)**: Định dạng chuẩn hỗ trợ cơ sở nộp báo cáo danh sách khách khai báo lưu trú tới Cơ quan Công An địa phương.

### 🧹 5. Quản Lý Buồng Phòng & Thông Báo Vệ Sinh
- Tự động kích hoạt thông báo dọn dẹp (`Cleaning Notification`) khi khách trả phòng hoặc phòng chuyển trạng thái cần dọn.
- Phân công công việc cho nhân viên buồng phòng (`HOUSEKEEPER`), theo dõi tiến độ dọn dẹp và xác nhận hoàn tất để đưa phòng trở lại trạng thái sẵn sàng đón khách (`AVAILABLE`).

### 📊 6. Báo Cáo Doanh Thu, Tỷ Lệ Lấp Đầy & Nhật Ký Hệ Thống
- Báo cáo thống kê doanh thu theo khoảng thời gian, loại phòng, phương thức thanh toán (**Tiền mặt**, **Chuyển khoản**, **Thẻ**).
- Thống kê tỷ lệ lấp đầy phòng (**Occupancy Rate**) và công suất khai thác.
- Xuất báo cáo doanh thu chi tiết ra file **Excel (`.xlsx`)** bằng Apache POI.
- Ghi nhận **Nhật ký hoạt động hệ thống (Activity Logs / Audit Logs)** giúp truy vết lịch sử thao tác của từng tài khoản.

---

## 🛠️ Công Nghệ Sử Dụng

### Backend (`/Backend/roomi`)
| Công nghệ | Phiên bản / Mô tả |
| :--- | :--- |
| **Java** | JDK 17 |
| **Framework** | Spring Boot 4.1.0 / 3.4.x (Web MVC, Data JPA, Validation) |
| **Database** | MySQL 8.0 / PostgreSQL |
| **Authentication** | Token-based Session Authentication & Authorization |
| **Excel Generator** | Apache POI (`poi-ooxml 5.2.3`) |
| **Code Coverage** | JaCoCo Maven Plugin (`0.8.11`) |
| **Build Tool** | Apache Maven (`mvnw`) |

### Frontend (`/Frontend/roomi`)
| Công nghệ | Phiên bản / Mô tả |
| :--- | :--- |
| **Core Framework** | React 19.2.7, JavaScript (ESNext) |
| **Build Tool** | Vite 8.1.1 |
| **Routing** | React Router DOM v7 (`react-router-dom`) với Protected Routes |
| **HTTP Client** | Axios (`^1.18.1`) |
| **Icons** | Lucide React Icons (`^1.26.0`) |
| **Styling** | Vanilla CSS Design System với CSS Variables, KiotViet Palette |
| **Linter** | Oxlint (`^1.71.0`) |

### Hạ Tầng & CI/CD
| Công nghệ | Phiên bản / Mô tả |
| :--- | :--- |
| **Containerization** | Docker Multi-stage Builds & Nginx Reverse Proxy |
| **Orchestration** | Docker Compose (`docker-compose.yml` & `docker-compose.prod.yml`) |
| **Registry** | GitHub Container Registry (GHCR) |
| **CI/CD Pipeline** | GitHub Actions (Parallel Test Matrix & Automated Deployment) |

---

## 📂 Cấu Trúc Dự Án

Dự án được tổ chức dạng **Monorepo** chuẩn hóa tách biệt Backend, Frontend và tài liệu kiến trúc:

```text
roomi/
├── .github/                      # Cấu hình GitHub Actions CI/CD Workflows
│   └── workflows/
│       ├── ci.yml                # CI: Run Unit Tests Backend & Lint/Build Frontend
│       └── cd.yml                # CD: Build & Push Docker images to GHCR
│
├── Backend/                      # Mã nguồn Backend Spring Boot
│   └── roomi/
│       ├── src/main/java/roomi/dev/
│       │   ├── config/           # Cấu hình Web, Cors, Filter, Jackson
│       │   ├── controller/       # REST API Controllers (Auth, Booking, Room, Guest...)
│       │   ├── docs/             # Tài liệu đặc tả API & Quy trình nghiệp vụ Markdown
│       │   ├── dto/              # Request & Response DTOs
│       │   ├── exception/        # Exception Handler toàn cục & Custom Exception
│       │   ├── model/            # JPA Entities & Enums (User, Booking, Room, Guest...)
│       │   ├── repository/       # Spring Data JPA Repositories
│       │   ├── service/          # Logic Nghiệp vụ (Service Interfaces & Impl)
│       │   └── util/             # Helper utilities (AuthUtil, DateTime...)
│       ├── Dockerfile            # Multi-stage Dockerfile cho Backend
│       └── pom.xml               # Cấu hình Maven Dependencies
│
├── Frontend/                     # Mã nguồn Frontend React JS
│   └── roomi/
│       ├── src/
│       │   ├── assets/           # Hình ảnh, tài nguyên tĩnh
│       │   ├── components/       # UI Components dùng chung (Modal, Card, UI Elements)
│       │   ├── context/          # React Context (AuthContext, NotificationContext)
│       │   ├── layouts/          # Layout hệ thống (MainLayout, Navigation Sidebar)
│       │   ├── pages/            # Màn hình nghiệp vụ (Dashboard, Bookings, Rooms...)
│       │   ├── styles/           # Design System & KiotViet Theme (index.css)
│       │   └── utils/            # Axios API Client, Formatters, Role Helpers
│       ├── Dockerfile            # Dockerfile build Frontend với Nginx serving
│       ├── nginx.conf            # Cấu hình Nginx reverse proxy
│       ├── package.json          # Dependencies & Scripts
│       └── vite.config.js        # Cấu hình Vite
│
├── docs/                         # Thư mục Tài liệu & Quy chuẩn Kỹ thuật
│   └── CI_PIPELINE_SPECIFICATION.md # Đặc tả chi tiết luồng CI/CD Pipeline
│
├── docker-compose.yml            # Docker Compose chạy môi trường Development
├── docker-compose.prod.yml       # Docker Compose Override chạy môi trường Production
└── README.md                     # Tài liệu tổng quan dự án (File này)
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 📋 Yêu Cầu Tiền Đề (Prerequisites)
- **Node.js**: `>= 18.x`
- **Java Development Kit (JDK)**: `>= 17`
- **Database**: MySQL `>= 8.0` (hoặc PostgreSQL)
- **Maven**: `>= 3.8` (hoặc dùng Maven Wrapper)
- **Docker & Docker Compose** (Nếu chạy bằng container)

---

### 1. Khởi Chạy Theo Môi Trường Phát Triển (Local Development)

#### 🔹 Bước 1: Khởi chạy Backend (Spring Boot)

1. **Cấu hình Cơ sở dữ liệu MySQL**:
   Tạo cơ sở dữ liệu MySQL mới (ví dụ: `laybo`).

2. **Cấu hình file `application.properties`**:
   Chỉnh sửa đường dẫn kết nối MySQL tại `Backend/roomi/src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/laybo?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&createDatabaseIfNotExist=true
   spring.datasource.username=root
   spring.datasource.password=root
   
   spring.jpa.hibernate.ddl-auto=update
   spring.jpa.show-sql=true
   ```

3. **Chạy Backend**:
   ```bash
   cd Backend/roomi
   # Trên Linux/macOS:
   ./mvnw spring-boot:run
   # Trên Windows:
   mvnw.cmd spring-boot:run
   ```
   Backend sẽ hoạt động tại địa chỉ: `http://localhost:8080`.

---

#### 🔹 Bước 2: Khởi chạy Frontend (React + Vite)

1. **Cài đặt thư viện (Dependencies)**:
   ```bash
   cd Frontend/roomi
   npm install
   ```

2. **Chạy ứng dụng ở chế độ Development**:
   ```bash
   npm run dev
   ```
   Frontend sẽ hoạt động tại địa chỉ: `http://localhost:5173`.

---

### 2. Khởi Chạy Bằng Docker Compose (Full Stack)

Để chạy toàn bộ hệ thống (MySQL + Backend + Frontend) trong 1 dòng lệnh:

```bash
# Build và khởi chạy tất cả services
docker-compose up -d --build
```

**Các cổng truy cập mặc định:**
- 🌐 **Frontend Web App**: `http://localhost:3000`
- ⚙️ **Backend REST API**: `http://localhost:8080`
- 🗄️ **MySQL Database**: `localhost:3306`

---

## 🔐 Phân Quyền & Vai Trò Hệ Thống

Hệ thống hỗ trợ phân quyền truy cập chi tiết dựa trên vai trò tài khoản (**Role-based Access Control - RBAC**):

| Vai Trò | Mã Role | Mô Tả Quyền Hạn |
| :--- | :--- | :--- |
| **Chủ cơ sở** | `OWNER` | **Toàn quyền quản lý**: Xem báo cáo doanh thu, cài đặt bảng giá, cấu hình phòng, quản lý tài khoản nhân viên, xuất dữ liệu khai báo. |
| **Lễ tân** | `RECEPTIONIST` | Quản lý sơ đồ phòng, tạo đơn đặt phòng, check-in, check-out, đổi phòng, tạo hóa đơn thanh toán, tra cứu thông tin khách hàng. |
| **Buồng phòng** | `HOUSEKEEPER` | Quản lý danh sách thông báo dọn dẹp phòng, cập nhật tiến độ vệ sinh và xác nhận phòng sẵn sàng. |
| **Kế toán** | `ACCOUNTANT` | Tra cứu hóa đơn thanh toán, xem báo cáo doanh thu và xuất file báo cáo Excel. |
| **Quản trị viên** | `ADMIN` | Quản lý người dùng toàn hệ thống, phân quyền và theo dõi nhật ký thao tác (Audit Logs). |

---

## ⚙️ Quy Trình CI/CD & Deployment

Dự án áp dụng quy trình tự động hóa **CI/CD với GitHub Actions**:

```text
[Push / Pull Request] 
       │
       ├──► Backend CI  : MySQL 8.0 Service Container ➔ Build JDK 17 ➔ Run Tests ➔ JaCoCo Report
       │
       └──► Frontend CI : Node 20 Setup ➔ Oxlint Static Analysis ➔ Vite Production Build
       │
[Merge to main] ➔ CD Pipeline: Build Docker Images ➔ Push to GHCR ➔ Deploy Server via Docker Compose
```

Chi tiết kiến trúc CI Pipeline tham khảo tại [CI_PIPELINE_SPECIFICATION.md](file:///d:/fn-roomi/roomi/docs/CI_PIPELINE_SPECIFICATION.md).

---

## 📖 Tài Liệu Kiến Trúc & API Spec Chi Tiết

Tài liệu chi tiết về API và các luồng nghiệp vụ được lưu trữ trực tiếp trong mã nguồn:

- 📄 [Đặc Tả Chi Tiết REST APIs](file:///d:/fn-roomi/roomi/Backend/roomi/src/main/java/roomi/dev/docs/API_DOCUMENTATION.md) (`Backend/roomi/src/main/java/roomi/dev/docs/API_DOCUMENTATION.md`)
- 📄 [Luồng Nghiệp Vụ Đặt Phòng & Cổng Public](file:///d:/fn-roomi/roomi/Backend/roomi/src/main/java/roomi/dev/docs/GUEST_BOOKING_FLOW.md) (`GUEST_BOOKING_FLOW.md`)
- 📄 [Bộ Máy Tính Giá Phòng & Theo Mùa](file:///d:/fn-roomi/roomi/Backend/roomi/src/main/java/roomi/dev/docs/PRICE_ROOM_API.md) (`PRICE_ROOM_API.md`)
- 📄 [Nghiệp Vụ Đổi Phòng (Change Room)](file:///d:/fn-roomi/roomi/Backend/roomi/src/main/java/roomi/dev/docs/CHANGE_ROOM_API.md) (`CHANGE_ROOM_API.md`)
- 📄 [Quản Lý Dịch Vụ & Phụ Phí](file:///d:/fn-roomi/roomi/Backend/roomi/src/main/java/roomi/dev/docs/SURCHARGE_SERVICES_API.md) (`SURCHARGE_SERVICES_API.md`)
- 📄 [Quy Trình Tự Động Hóa CI/CD Pipeline](file:///d:/fn-roomi/roomi/docs/CI_PIPELINE_SPECIFICATION.md) (`docs/CI_PIPELINE_SPECIFICATION.md`)

---

© 2026 **Roomi Management System** - Hệ thống Quản Lý Lưu Trú & Đặt Phòng Chuyên Nghiệp.
