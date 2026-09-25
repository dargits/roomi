# 🏨 StayAway (StayGo PMS) — Hệ Thống Quản Lý Cơ Sở Lưu Trú Toàn Diện

<p align="center">
  <img src="https://img.shields.io/badge/Production%20Domain-stayaway.io.vn-6366F1?style=for-the-badge&logo=googlechrome&logoColor=white" />
  <img src="https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white" />
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

> **StayAway** là phần mềm quản lý khách sạn và homestay (Property Management System - PMS) chuẩn doanh nghiệp. Hệ thống tối ưu hóa toàn bộ hoạt động vận hành: từ đặt phòng đơn/đoàn, check-in/out bằng mã CCCD, đặt cọc, tính giá mùa vụ linh hoạt, buồng phòng 2 bước, đồng bộ kênh OTA hai chiều (Airbnb, Agoda, Booking.com), đến quyết toán hóa đơn, chốt sổ quỹ ngày và phân tích tài chính chuyên sâu (ADR, RevPAR, PoP/YoY).

---

## 📋 Mục Lục

1. [✨ Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
2. [🏗️ Kiến Trúc Hệ Thống & Công Nghệ](#️-kiến-trúc-hệ-thống--công-nghệ)
3. [📁 Cấu Trúc Mã Nguồn](#-cấu-trúc-mã-nguồn)
4. [🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local)](#-hướng-dẫn-cài-đặt--chạy-cục-bộ-local)
5. [🐳 Hạ Tầng CI/CD & Triển Khai Zero-Downtime](#-hạ-tầng-cicd--triển-khai-zero-downtime)
6. [🔑 Tài Khoản Mặc Định & Phân Quyền](#-tài-khoản-mặc-định--phân-quyền)
7. [🧪 Kiểm Thử Tự Động (Testing)](#-kiểm-thử-tự-động-testing)
8. [📚 Danh Mục Tài Liệu Chi Tiết](#-danh-mục-tài-liệu-chi-tiết)

---

## ✨ Tính Năng Nổi Bật

### 1. 🏨 Quản Lý Đặt Phòng & Khách Lưu Trú
* **Đặt phòng đơn & Đặt phòng đoàn (Group Booking):** Thuật toán tự động phát hiện xung đột lịch, không cho phép trùng phòng.
* **Vòng đời lưu trú đầy đủ:** Đặt phòng $\rightarrow$ Đặt cọc $\rightarrow$ Check-in $\rightarrow$ Đổi phòng/Gia hạn $\rightarrow$ Check-out $\rightarrow$ Quyết toán hóa đơn.
* **Import danh sách đặt phòng cũ:** Hỗ trợ tải lên file bảng tính (Excel/CSV) với cơ chế **Preview Validation** và **Atomic Commit** bảo toàn CSDL.
* **Quét mã CCCD gắn chip:** Tự động giải mã QR trên thẻ CCCD để điền hồ sơ khách và khai báo tạm trú.
* **Data Masking:** Tự động che mờ số CCCD và Số điện thoại đối với nhân viên không đủ thẩm quyền.
* **Quản lý đồ thất lạc (Lost & Found):** Tiếp nhận, lưu kho và theo dõi lịch sử bàn giao đồ khách để quên.

### 2. 🌐 Cổng Khách Hàng Tự Phục Vụ (Public Guest Portal)
* **Cổng đặt phòng trực tuyến:** Khách xem phòng trống và gửi yêu cầu đặt phòng công khai.
* **Tra cứu & Tự hủy yêu cầu đặt phòng (`CLTSN3-439`):** Khách chủ động tra cứu tiến độ và tự hủy đơn bằng Mã + SĐT.
* **Tra cứu hóa đơn trực tuyến (`NCL-09-CN-008`):** Cho phép khách xem chi tiết hóa đơn qua link/SĐT (có công tắc bật/tắt theo cài đặt khách sạn).

### 3. 📧 Email Tự Động & Chống Spam Thông Minh
* Gửi Email xác nhận đặt phòng HTML kèm mã QR check-in và hóa đơn.
* **Chống spam email:** Khóa gửi lại sau **60s (Cooldown)** và giới hạn **5 lần/ngày/booking (Quota)**.
* Tự động gửi Email nhắc nhận phòng, nhắc nợ (Debt Reminder) và đặt lại mật khẩu qua Token một lần.

### 4. 🔄 Quản Lý Kênh OTA (Channel Manager)
* **Đồng bộ 2 chiều qua iCal:** Nhận lịch bận từ Airbnb, Booking.com, Agoda,... và tự động khóa phòng trên sơ đồ lịch.
* **Cảnh báo Overbooking:** Tức thì phát hiện và cảnh báo cho Lễ tân khi phát sinh xung đột giữa lịch tại quầy và kênh OTA.
* **Nhật ký & Giám sát:** Lưu vết `ChannelCalendarSyncLog` và cảnh báo khi kênh OTA bị ngắt kết nối.

### 5. 💳 Tài Chính, Hóa Đơn, Cọc & Sổ Quỹ
* **Quản lý cọc linh hoạt:** Cọc theo %, cọc theo hạng phòng, hoàn cọc, phạt cọc, giữ cọc.
* **Thỏa thuận giá (Price Deal):** Áp dụng giá thỏa thuận riêng cho khách đoàn hoặc khách quen.
* **Hóa đơn & Chiết khấu:** Tự động tổng hợp tiền phòng + phụ thu dịch vụ + chiết khấu, hủy hóa đơn nháp có lưu lý do.
* **Chốt sổ quỹ theo ngày (Daily Cash Ledger):** Đối soát doanh thu tiền mặt, chuyển khoản, quét mã QR và khóa sổ cuối ngày.

### 6. 🧹 Buồng Phòng Thông Minh (Housekeeping)
* **Sơ đồ ma trận phòng:** Phân loại màu trạng thái (Sạch / Có khách / Cần dọn / Chờ duyệt / Bảo trì).
* **Phân công cân bằng tải:** Gợi ý mức độ ưu tiên (Khẩn cấp / Cao / Thường) dựa theo giờ nhận phòng của khách kế tiếp.
* **Nghiệm thu 2 bước:** Nhân viên gửi duyệt $\rightarrow$ Quản lý kiểm tra và nghiệm thu phòng sạch.
* **Dọn định kỳ tự động:** Tự động tạo lịch dọn dẹp đối với phòng trống dài ngày.

### 7. 📊 Báo Cáo & Thống Kê Nâng Cao
* **Chỉ số tiêu chuẩn quốc tế:** Tính toán tự động **ADR** (Giá phòng trung bình ngày), **RevPAR** (Doanh thu trên mỗi phòng sẵn có), tỷ lệ lấp đầy.
* **Báo cáo so sánh đa kỳ (`CLTSN3-431`):** Phân tích tăng trưởng **PoP** (Kỳ này so với kỳ trước) và **YoY** (Cùng kỳ năm trước) kèm xuất file CSV.
* **Trợ lý giá AI & Chatbot:** Gợi ý điều chỉnh giá phòng tối ưu theo lịch sử lấp đầy.

---

## 🏗️ Kiến Trúc Hệ Thống & Công Nghệ

```
                         [ USER / BROWSER ]
                                 │
                                 ▼
                   [ NGINX REVERSE PROXY (HTTPS) ]
                    (Port 80 HTTP -> 443 HTTPS)
                                 │
        ┌────────────────────────┴────────────────────────┐
        ▼ (Traffic Web /)                                 ▼ (Traffic API /api/v1/)
┌───────────────────────────────┐                 ┌───────────────────────────────┐
│   FRONTEND CONTAINER (React)  │                 │  BACKEND CONTAINER (Spring)   │
│   • React 18 + TypeScript     │                 │  • Spring Boot 3 + Java 17    │
│   • Vite 6 + TailwindCSS      │                 │  • Spring Data JPA + Security │
│   • Vitest + Nginx Alpine     │                 │  • Schedulers + JUnit 5 Tests │
└───────────────────────────────┘                 └───────────────┬───────────────┘
                                                                  │
                                                                  ▼
                                                  ┌───────────────────────────────┐
                                                  │   DATABASE CONTAINER (MySQL)  │
                                                  │   • MySQL 8.0 Engine          │
                                                  │   • Container: roomi-db       │
                                                  └───────────────────────────────┘
```

---

## 📁 Cấu Trúc Mã Nguồn

```
roomi/
├── 📄 README.md                 # Tài liệu tổng quan toàn bộ dự án
├── 📄 DEPLOYMENT.md             # Hướng dẫn chi tiết triển khai VPS & CI/CD
├── 📄 docker-compose.yml        # Điều phối môi trường đa container
├── 📂 .github/workflows/        # Pipeline CI/CD GitHub Actions (deploy.yml)
├── 📂 docs/                     # Tài liệu đặc tả nghiệp vụ & E2E Test Cases
├── 📂 backend/                  # ☕ Backend Spring Boot 3
│   ├── src/main/java/plant/stay/
│   │   ├── config/              # Schedulers, CORS, Data Masking, DataSeeder
│   │   ├── controller/          # 27 REST Controllers
│   │   ├── dto/                 # Request & Response DTOs
│   │   ├── model/               # 39 JPA Entities & Enums
│   │   ├── repository/          # Spring Data JPA Repositories
│   │   ├── service/             # Business Logic & Service Implementations
│   │   └── util/                # AuthUtil, HashUtil, PersonalDataMasker
│   └── src/test/                # 60+ JUnit 5 Unit & Integration Tests
└── 📂 frontend/                 # ⚛️ Frontend React 18 + Vite
    └── src/
        ├── components/          # UI Components, Design System, Chatbot
        ├── context/             # AuthContext, ToastContext, AppConfigContext
        ├── features/            # 10 phân hệ nghiệp vụ (booking, housekeeping, invoice...)
        ├── services/            # 43 Axios API Client modules
        └── types/               # TypeScript interfaces & types
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local)

### Cách 1: Khởi chạy nhanh bằng Docker Compose (Khuyên Dùng)
```bash
docker compose up -d --build
```
* **Frontend:** `http://localhost:3000`
* **Backend API:** `http://localhost:8080/api/v1`

---

### Cách 2: Khởi chạy độc lập cho Lập Trình Viên

#### 1. Chạy Backend (Spring Boot):
Yêu cầu Java 17 và MySQL 8.0 đang chạy với CSDL `stay`.
```bash
cd backend
./mvnw spring-boot:run
```

#### 2. Chạy Frontend (React + Vite):
Yêu cầu Node.js 20 LTS.
```bash
cd frontend
npm ci --legacy-peer-deps
npm run dev
```
Truy cập: `http://localhost:5173`

---

## 🐳 Hạ Tầng CI/CD & Triển Khai Zero-Downtime

Dự án áp dụng quy trình CI/CD tự động hóa toàn diện qua **GitHub Actions** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):

```
[Push / PR] ──► [Job 1: Test Backend (JUnit 5)] ──┐
            ──► [Job 2: Test Frontend (Vitest)]  ──┴──► [PASS 100% Tests?]
                                                              │
                                            ┌─────────────────┴─────────────────┐
                                      (Nhánh main)                        (Nhánh feature/PR)
                                            │                                   │
                                            ▼                                   ▼
                            [Job 3: Docker Build & Push GHCR]             [Hoàn thành CI Gate]
                                            │
                                            ▼
                            [Job 4: SSH Deploy lên AWS VPS]
                            • Pull Docker Images dựng sẵn
                            • Recreate Containers
                            • Health Check API loop (60s)
                            • Downtime < 45 giây
```

---

## 🔑 Tài Khoản Mặc Định & Phân Quyền

Hệ thống được khởi tạo sẵn các tài khoản mẫu thông qua `DataSeeder`:

| Tài khoản (Username) | Mật khẩu | Vai trò (Role) | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| `admin` | `admin123` | **ADMIN** | Toàn quyền quản trị, cấu hình giá, nhân sự, báo cáo tài chính, chốt sổ quỹ |
| `receptionist` | `rec123` | **RECEPTIONIST** | Đặt phòng, check-in/out, thu tiền cọc, lập hóa đơn, khai báo tạm trú |
| `housekeeper` | `hk123` | **HOUSEKEEPER** | Xem danh sách phòng được giao, cập nhật tiến độ dọn phòng, gửi duyệt nghiệm thu |

---

## 🧪 Kiểm Thử Tự Động (Testing)

* **Backend Tests (JUnit 5 + Mockito + H2 In-Memory DB):**
  ```bash
  cd backend && ./mvnw test
  ```
* **Frontend Tests (Vitest + React Testing Library):**
  ```bash
  cd frontend && npm test
  ```

---

## 📚 Danh Mục Tài Liệu Chi Tiết

* 📖 **[Hướng dẫn triển khai VPS & CI/CD (DEPLOYMENT.md)](./DEPLOYMENT.md)**
* 📑 **[Tài liệu đặc tả nghiệp vụ & User Guide (docs/)](./docs/README.md)**
* ☕ **[Tài liệu kiến trúc Backend (backend/)](./backend/README.md)**
* ⚛️ **[Tài liệu kiến trúc Frontend (frontend/)](./frontend/README.md)**

---

<p align="center">
  <strong>StayAway PMS Production Architecture</strong> &nbsp;·&nbsp; Enterprise DevOps Standards &nbsp;·&nbsp; 2026
</p>
