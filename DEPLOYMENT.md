# 🚀 Lưu Trú Số — Hướng Dẫn Triển Khai & Vận Hành Production

<p align="center">
  <img src="https://img.shields.io/badge/Release-v1.0.4-indigo?style=for-the-badge&logo=git&logoColor=white" />
  <img src="https://img.shields.io/badge/Production%20Domain-stayaway.io.vn-6366F1?style=for-the-badge&logo=googlechrome&logoColor=white" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" />
  <img src="https://img.shields.io/badge/Registry-GHCR.io-24292E?style=for-the-badge&logo=github&logoColor=white" />
  <img src="https://img.shields.io/badge/Containers-Docker%20Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Automated%20Tests-435%20Passing-00C853?style=for-the-badge&logo=testinglibrary&logoColor=white" />
  <img src="https://img.shields.io/badge/Downtime-%3C%2045s%20Zero--Downtime-00C853?style=for-the-badge&logo=speedtest&logoColor=white" />
</p>

Tài liệu hướng dẫn triển khai, vận hành và bảo trì toàn diện hệ thống phần mềm quản lý lưu trú **Lưu Trú Số** (Stay Away). Toàn bộ hệ thống tuân thủ nghiêm ngặt tiêu chuẩn DevOps hiện đại, container hóa 100% bằng **Docker & Docker Compose**, đóng gói tự động qua **GitHub Container Registry (GHCR)** và tự động hóa toàn trình qua **GitHub Actions** với thời gian downtime tiệm cận 0 (< 45 giây).

---

## 📋 Mục Lục

1. [🌐 Thông Tin Môi Trường Vận Hành (Production)](#-1-thông-tin-môi-trường-vận-hành-production)
2. [🗺️ Sơ Đồ Kiến Trúc Hệ Thống & Luồng CI/CD](#️-2-sơ-đồ-kiến-trúc-hệ-thống--luồng-cicd)
3. [📌 Chiến Lược Phân Nhánh & CI Gate](#-3-chiến-lược-phân-nhánh--ci-gate)
4. [🏗️ Chi Tiết Các Giai Đoạn Đóng Gói Docker (Multi-Stage Builds)](#️-4-chi-tiết-các-giai-đoạn-đóng-gói-docker-multi-stage-builds)
5. [🔐 Danh Mục Biến Môi Trường & GitHub Secrets](#-5-danh-mục-biến-môi-trường--github-secrets)
6. [🧪 Hệ Thống Kiểm Thử Đạt Chuẩn (435 Test Cases)](#-6-hệ-thống-kiểm-thử-đạt-chuẩn-435-test-cases)
7. [📖 Hướng Dẫn Vận Hành & Xử Lý Sự Cố (Operational Runbook)](#-7-hướng-dẫn-vận-hành--xử-lý-sự-cố-operational-runbook)
8. [💻 Khởi Chạy Môi Trường Cục Bộ (Local Development)](#-8-khởi-chạy-môi-trường-cục-bộ-local-development)

---

## 🌐 1. Thông Tin Môi Trường Vận Hành (Production)

| Thuộc tính | Chi tiết cấu hình | Ghi chú vận hành |
| :--- | :--- | :--- |
| **Tên miền chính thức** | 🔗 **[https://stayaway.io.vn](https://stayaway.io.vn/)** | SSL/TLS Let's Encrypt tự động gia hạn |
| **API Backend Endpoint** | `https://stayaway.io.vn/api/v1` | Reverse proxy qua Nginx Host |
| **Hạ tầng máy chủ** | AWS EC2 Ubuntu Server (VPS) | Kernel Linux x86_64, Docker Engine 24+ |
| **Reverse Proxy Host** | Nginx Máy Chủ Host | Chuyển tiếp Port 80 (HTTP) $\rightarrow$ 443 (HTTPS) $\rightarrow$ Container `stayaway_frontend` (Port 3000) |
| **Container Registry** | GitHub Container Registry (`ghcr.io/dargits/*`) | `roomi-backend:latest`, `roomi-frontend:latest` |
| **CSDL Production** | MySQL 8.0 Engine (Container `roomi-db`, DB: `stay`) | Kết nối nội bộ qua Docker Bridge Network |
| **Thư mục Sao lưu & Dữ liệu** | `./backups` $\rightarrow$ `/app/backups` | Phân quyền `777` cho User không đặc quyền `spring` |
| **Dịch vụ Lưu trữ File (CDN)** | Cloudinary CDN | Lưu trữ ảnh phòng, ảnh CCCD mã hóa |
| **Dịch vụ Email Transaction** | Resend API Service | Gửi email xác nhận đặt phòng, mã QR, thông báo nợ |
| **Pipeline Workflow File** | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) | 4 Jobs: test-backend, test-frontend, build-and-push, deploy |

---

## 🗺️ 2. Sơ Đồ Kiến Trúc Hệ Thống & Luồng CI/CD

```mermaid
flowchart TD
    %% ==========================================
    %% 1. MÁY PHÁT TRIỂN (LOCAL WORKSTATION)
    %% ==========================================
    subgraph LOCAL_DEV ["💻 1. LOCAL DEVELOPMENT"]
        DEV[Lập trình viên commit code] --> RUN_LOCAL[Chạy test cục bộ: ./mvnw test & npm test]
        RUN_LOCAL --> PUSH{Push code lên GitHub}
    end

    %% ==========================================
    %% 2. GITHUB ACTIONS AUTOMATION (deploy.yml)
    %% ==========================================
    PUSH -->|Mọi nhánh: feature/*, develop, PR| TRIGGER_CI["⚡ KÍCH HOẠT WORKFLOW (.github/workflows/deploy.yml)"]
    
    subgraph GHA_PIPELINE ["⚙️ 2. GITHUB ACTIONS AUTOMATED ENGINE"]
        direction TB
        TRIGGER_CI --> JOB_BE["☕ Job 1: Backend Tests (273 tests, JDK 17, H2 In-Memory)"]
        TRIGGER_CI --> JOB_FE["⚛️ Job 2: Frontend Tests & Build (162 tests, Node 20, Vitest)"]
        
        JOB_BE --> CHECK_RESULT{Tất cả 435 bài test PASS?}
        JOB_FE --> CHECK_RESULT
        
        CHECK_RESULT -->|❌ FAILED| NOTIFY_FAIL[❌ Dừng Pipeline - Báo lỗi GitHub - KHÔNG Deploy]
        CHECK_RESULT -->|✅ PASSED| BRANCH_GATE{Nhánh hiện tại?}
        
        BRANCH_GATE -->|Nhánh phụ / Pull Request| NOTIFY_OK[✅ Hoàn thành CI Gate - Đóng dấu Xanh bảo vệ nhánh]
        BRANCH_GATE -->|Nhánh main / Manual Dispatch| JOB_BUILD["🐳 Job 3: Build & Push Images lên GHCR (ghcr.io)"]
        
        JOB_BUILD -->|Push thành công| JOB_DEPLOY["🚀 Job 4: SSH VPS & Auto Deploy (Dưới 45s)"]
    end

    %% ==========================================
    %% 3. THỰC THI TỰ ĐỘNG TRÊN MÁY CHỦ VPS
    %% ==========================================
    subgraph VPS_EXECUTION ["🛡️ 3. VPS AUTOMATION RUNTIME (stayaway.io.vn)"]
        direction TB
        JOB_DEPLOY --> V1["1. SSH bảo mật qua Private Key (appleboy/ssh-action)"]
        V1 --> V2["2. Git Fetch & Hard Reset về origin/main"]
        V2 --> V3["3. Tự động trích xuất mật khẩu & network từ container roomi-db"]
        V3 --> V4["4. docker compose pull (Tải Images dựng sẵn từ GHCR)"]
        V4 --> V5["5. Đảm bảo quyền ghi thư mục sao lưu (chmod 777 backups/)"]
        V5 --> V6["6. docker compose up -d --remove-orphans (Khởi động tức thì)"]
        V6 --> V7["7. Tự động kết nối mạng DB nội bộ & khởi động lại container"]
        V7 --> V8["8. Health Check API kép tối đa 150s (Port 8080 & Port 3000)"]
        V8 --> V9["9. Dọn dẹp Docker Images không dùng (docker image prune -f)"]
    end

    %% ==========================================
    %% 4. KIẾN TRÚC MẠNG RUNTIME
    %% ==========================================
    subgraph PROD_TOPOLOGY ["🌐 4. PRODUCTION TOPOLOGY"]
        direction TB
        HOST_NGINX["🌍 Host Nginx (Port 80/443 SSL: stayaway.io.vn)"]
        HOST_NGINX -->|Chuyển tiếp Traffic Web /| C_FE["⚛️ stayaway_frontend (Port 3000 -> Nginx Alpine)"]
        HOST_NGINX -->|Chuyển tiếp API /api/v1/| C_BE["☕ stayaway_backend (Port 8080 -> Spring Boot)"]
        C_FE -.->|Nginx Reverse Proxy nội bộ /api/| C_BE
        C_BE -->|JDBC Connection MySQL 3306| C_DB[("🗄️ roomi-db (MySQL 8.0: Database 'stay')")]
        C_BE -.->|Volume Mount| BACKUP_VOL[("📁 ./backups (Zip Backups & Export Data)")]
    end

    V9 --> PROD_TOPOLOGY
    PROD_TOPOLOGY --> USER_ACCESS["🎉 Hệ thống sẵn sàng phục vụ tại https://stayaway.io.vn"]
```

---

## 📌 3. Chiến Lược Phân Nhánh & CI Gate

Toàn bộ quy trình được đóng gói và kiểm soát tự động qua file [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

| Nhánh (Branch) | Sự kiện kích hoạt | Phạm vi thực thi | Tự động Deploy lên VPS? | Cơ chế Hủy Run Cũ (Concurrency) |
| :--- | :--- | :--- | :---: | :---: |
| `feature/*`, `develop`, `fix/*` | `push` hoặc tạo `PR` | Chạy toàn bộ **273 Backend Tests** + **162 Frontend Tests** + Vite Build | ❌ **Không** (Chỉ thẩm định chất lượng) | `cancel-in-progress: true` (Tiết kiệm phút chạy) |
| `main` | `push` hoặc `merge` | Chạy 100% CI Gate $\rightarrow$ Build/Push GHCR $\rightarrow$ **SSH Deploy lên AWS VPS** | ✅ **Tự động 100%** | `cancel-in-progress: false` (Bảo vệ tiến trình deploy) |
| Bất kỳ nhánh nào | `workflow_dispatch` | Kích hoạt thủ công qua GitHub Web UI | Phụ thuộc nhánh chọn | `cancel-in-progress: false` |

### Quy Chuẩn Kiểm Duyệt CI Gate:
* **Backend Gate:** Java 17 Temurin, kích hoạt profile `test` sử dụng H2 In-Memory mô phỏng chuẩn MySQL. Toàn bộ 273 test cases phải đạt 100%, 0 Failure, 0 Error.
* **Frontend Gate:** Node 20 LTS, `npm ci --legacy-peer-deps`, Vitest thực thi 162 unit & integration tests với Happy-DOM, đồng thời kiểm tra biên dịch tĩnh `tsc && vite build`.
* **Zero Disruption:** Nếu có bất kỳ test case nào thất bại hoặc lỗi build ở bất cứ tầng nào, quy trình dừng ngay lập tức, ngăn ngừa hoàn toàn rủi ro triển khai mã nguồn lỗi lên môi trường thực tế.

---

## 🏗️ 4. Chi Tiết Các Giai Đoạn Đóng Gói Docker (Multi-Stage Builds)

### 4.1. Backend (`backend/Dockerfile`)
Backend sử dụng kỹ thuật đóng gói đa tầng để tối ưu dung lượng và gia cường bảo mật:
* **Giai đoạn 1 (Builder)**: `maven:3.9.6-eclipse-temurin-17-alpine`
  * Tận dụng Docker layer cache bằng cách copy tệp `pom.xml` và tải dependencies trước bằng `mvn dependency:go-offline -B || true`.
  * Đóng gói mã nguồn ứng dụng thành file `.jar` độc lập qua lệnh: `mvn clean package -DskipTests -B`.
* **Giai đoạn 2 (Runtime)**: `eclipse-temurin:17-jre-alpine`
  * Base image JRE 17 Alpine siêu gọn nhẹ (dung lượng image cuối < 180MB).
  * **An toàn bảo mật:** Tạo nhóm và người dùng không có đặc quyền `spring:spring` (Non-root user).
  * Khởi tạo và cấp quyền ghi cho thư mục sao lưu: `/app/backups` và `/tmp/stayaway_backups` với `chmod -R 777`.
  * **Tối ưu hóa tài nguyên:** Cấu hình cờ JVM Flags tối ưu cho máy chủ AWS Free Tier:
    ```bash
    JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"
    ```
  * Cổng dịch vụ lắng nghe: `8080`.

### 4.2. Frontend (`frontend/Dockerfile`)
* **Giai đoạn 1 (Builder)**: `node:20-alpine`
  * Cài đặt bộ phụ thuộc sạch: `npm ci --legacy-peer-deps`.
  * Phân quyền thực thi tệp nhị phân: `chmod -R +x node_modules/.bin`.
  * Nhúng biến môi trường API URL khi biên dịch thông qua build argument: `ARG VITE_API_BASE_URL`.
  * Biên dịch bundle tối ưu: `npm run build` (sinh thư mục `dist`).
* **Giai đoạn 2 (Runtime)**: `nginx:alpine`
  * Image Nginx Alpine tối giản (< 25MB).
  * Nạp file cấu hình [`frontend/nginx.conf`](frontend/nginx.conf):
    * Kích hoạt nén **Gzip** toàn diện cho text, CSS, JS, SVG, JSON.
    * Cơ chế **Cache-Control** tài nguyên tĩnh (1 năm).
    * Hỗ trợ chuẩn Single Page Application (SPA Routing `try_files $uri $uri/ /index.html;`).
    * Tích hợp **Internal Docker DNS Resolver** (`resolver 127.0.0.11 valid=5s ipv6=off;`).
    * Reverse Proxy `/api/` trỏ về `http://backend:8080` với `client_max_body_size 100M` và timeout `300s` nhằm đảm bảo khả năng import/export bảng tính và tải tệp sao lưu dung lượng lớn không bị ngắt kết nối.
  * Cổng dịch vụ lắng nghe: `80`.

### 4.3. Docker Compose (`docker-compose.yml`)
* Khởi tạo mạng cầu nối `stayaway_network` (bridge).
* **Backend Service (`stayaway_backend`)**:
  * Ánh xạ cổng: `8080:8080`.
  * Volume mount: `./backups:/app/backups` bảo toàn dữ liệu sao lưu trên host.
  * Nạp biến môi trường kết nối MySQL và CDN Cloudinary.
  * Giới hạn log tránh tràn đĩa: `max-size: 20m`, `max-file: 3`.
* **Frontend Service (`stayaway_frontend`)**:
  * Ánh xạ cổng: `3000:80` (Host Nginx sẽ forward request từ cổng 80/443 sang cổng 3000 này).
  * Phụ thuộc khởi động: `depends_on: [backend]`.
  * Giới hạn log: `max-size: 10m`, `max-file: 3`.

---

## 🔐 5. Danh Mục Biến Môi Trường & GitHub Secrets

### 5.1. Cấu hình GitHub Secrets (Repository $\rightarrow$ Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions)

| Tên Secret | Ý nghĩa | Ví dụ giá trị |
| :--- | :--- | :--- |
| `SERVER_HOST` | Địa chỉ IP máy chủ VPS | `13.236.183.211` |
| `SERVER_USER` | Tài khoản SSH trên VPS | `ubuntu` |
| `SSH_PRIVATE_KEY` | Khóa SSH Private Key (không có passphrase) | `-----BEGIN OPENSSH PRIVATE KEY...` |
| `GITHUB_TOKEN` | Token mặc định do GitHub Actions tự cấp | Tự động sinh với quyền `packages: write` |

### 5.2. Tự Động Sinh File Biến Môi Trường `.env` Trên VPS:
Mỗi chu kỳ triển khai, workflow tự động chạy lệnh `docker inspect` trên container CSDL `roomi-db` để trích xuất mật khẩu và tên mạng nội bộ, sinh file `.env`:

```env
DB_URL=jdbc:mysql://roomi-db:3306/stay?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
DB_USER=root
DB_PASS=<Tự_động_trích_xuất_từ_container_roomi-db>
VITE_API_BASE_URL_PROD=/api/v1
```

### 5.3. Biến Môi Trường Tùy Chọn Bổ Sung (Khi cần ghi đè):
* `CLOUDINARY_CLOUD_NAME`: Tên tài khoản Cloudinary CDN.
* `CLOUDINARY_API_KEY`: Khóa API Cloudinary.
* `CLOUDINARY_API_SECRET`: Khóa bí mật Cloudinary.
* `RESEND_API_KEY`: API Key gửi email giao dịch từ Resend.
* `RESEND_FROM_EMAIL`: Địa chỉ email người gửi (`StayAway PMS <noreply@stayaway.io.vn>`).

---

## 🧪 6. Hệ Thống Kiểm Thử Đạt Chuẩn (435 Test Cases)

Hệ thống CI Gate bắt buộc **100% (435/435 test cases)** phải PASS trước khi tiến hành đóng gói Docker và triển khai lên máy chủ thực tế:

```
🧪 TOÀN BỘ 435 BÀI TEST CHẤT LƯỢNG CAO (100% PASS RATE)
│
├── ☕ Backend (273 Test Cases - JUnit 5 + Mockito + Spring Boot Test + H2 In-Memory DB)
│   ├── 🏨 Phân hệ Phòng, Loại phòng & Chính sách giá (19 tests)
│   │   ├── RoomServiceTest                         (5 tests: Tạo phòng, chặn trùng số phòng, danh sách phòng, dọn phòng, bảo trì)
│   │   ├── RoomTypeServiceTest                     (4 tests: Thêm mới, cập nhật giá, sức chứa tối đa, ngừng sử dụng)
│   │   ├── SeasonalPriceServiceImplTest            (4 tests: Giá theo mùa, áp dụng khoảng ngày, kiểm tra ưu tiên giá)
│   │   ├── PriceSuggestionServiceTest              (2 tests: Gợi ý giá theo công suất phòng, thuật toán AI đề xuất)
│   │   ├── PricingServiceTest                      (2 tests: Tính toán phụ thu ngày lễ, tính tiền phòng theo giờ/đêm)
│   │   ├── NegotiatedPriceServiceTest              (1 test: Giá thỏa thuận khách đoàn/doanh nghiệp)
│   │   └── PublicRoomAvailabilityDirtyExclusionTest(1 test: Chặn phòng DIRTY hiển thị trên cổng công khai)
│   │
│   ├── 📅 Phân hệ Đặt phòng, OTA Sync & Chống Spam (26 tests)
│   │   ├── BookingServiceTest                      (5 tests: Tạo đặt phòng, validation ngày, gán phòng, hủy, checkin/out)
│   │   ├── BookingServiceUsageTest                 (3 tests: Phụ thu dịch vụ minibar/giặt là, lấy danh sách, xóa dịch vụ)
│   │   ├── GroupBookingServiceTest                 (3 tests: Đặt phòng đoàn, phân bổ phòng hàng loạt, hủy theo đoàn)
│   │   ├── ChannelCalendarSyncServiceTest          (3 tests: Đồng bộ lịch 2 chiều iCal Airbnb/Agoda, khóa phòng)
│   │   ├── ChannelCalendarSyncInboundTest          (3 tests: Xử lý file feed iCal đến, mapping sự kiện phòng)
│   │   ├── ChannelCalendarSyncWarningTest          (2 tests: Phát hiện mất kết nối iCal, ghi nhật ký cảnh báo)
│   │   ├── OverbookingConflictResolutionTest       (2 tests: Phát hiện trùng lịch OTA với quầy lễ tân)
│   │   ├── BookingConfirmationServiceTest          (2 tests: Soạn email HTML, sinh mã QR, gửi qua Resend)
│   │   └── PublicBookingAntiSpamServiceTest        (3 tests: Cooldown 60s, quota 5 lần/ngày/booking, chặn spam)
│   │
│   ├── 💳 Phân hệ Tài chính, Hóa đơn & Công nợ (25 tests)
│   │   ├── InvoiceServiceTest                      (5 tests: Lập hóa đơn khi check-in, chiết khấu, ghi nhận thanh toán)
│   │   ├── InvoiceCancelDraftTest                  (3 tests: Hủy hóa đơn nháp, lưu vết lý do hủy, bảo toàn số liệu)
│   │   ├── InvoiceDiscountServiceImplTest          (3 tests: Chiết khấu trực tiếp, chiết khấu theo %, phân quyền duyệt)
│   │   ├── DepositPaidInvoiceProtectionTest        (3 tests: Bảo vệ cọc khi thanh toán, tự động trừ cọc vào hóa đơn)
│   │   ├── PublicInvoiceLookupTest                 (3 tests: Tra cứu hóa đơn công khai theo mã/SĐT, kiểm tra công tắc bật/tắt)
│   │   ├── CashierShiftServiceImplTest             (4 tests: Mở ca đầu ngày, bàn giao két tiền, kiểm đếm chênh lệch, đóng ca)
│   │   └── DailyLedgerServiceImplTest              (4 tests: Khóa sổ tài chính cuối ngày, tổng kết 3 nguồn doanh thu)
│   │
│   ├── 🧹 Phân hệ Buồng phòng, Khai báo lưu trú & Đối tác (17 tests)
│   │   ├── RoomIncidentServiceImplTest             (3 tests: Báo cáo sự cố thiết bị, chuyển trạng thái MAINTENANCE)
│   │   ├── LostItemServiceImplTest                 (3 tests: Tiếp nhận đồ thất lạc, thời hạn lưu kho 30 ngày, bàn giao)
│   │   ├── StayDeclarationServiceTest              (1 test: Lập hồ sơ tạm trú, lưu trữ ảnh CCCD 2 mặt)
│   │   ├── RoomStayGuestServiceTest                (1 test: Quản lý danh sách khách đi kèm trong cùng phòng)
│   │   ├── GuestServiceTest                        (3 tests: Thêm hồ sơ khách hàng, tìm kiếm đa tiêu chí, cập nhật liên hệ)
│   │   ├── ExtraServiceTest                        (4 tests: Thêm dịch vụ mới, danh mục mở bán, cập nhật đơn giá)
│   │   └── CorporateClientServiceImplTest          (2 tests: Hồ sơ khách doanh nghiệp, hạn mức tín dụng công nợ)
│   │
│   ├── 📊 Phân hệ Báo cáo chỉ số & Nhập xuất dữ liệu (18 tests)
│   │   ├── ReportControllerAdrRevparTest           (4 tests: Tính chỉ số ADR, RevPAR, công suất phòng theo ngày/tháng)
│   │   ├── ReportControllerPeriodComparisonTest    (4 tests: So sánh tăng trưởng PoP kỳ này/kỳ trước, YoY cùng kỳ năm ngoái)
│   │   ├── ReportChannelStructureTest              (3 tests: Phân tích cơ cấu doanh thu theo kênh: Trực tiếp, OTA, Đoàn)
│   │   ├── BestSellingServicesReportTest           (3 tests: Thống kê dịch vụ bán chạy nhất, doanh thu theo dịch vụ)
│   │   └── DataControllerCsvTest                   (4 tests: Xuất/Nhập CSV đối xứng cho 12 bảng nghiệp vụ)
│   │
│   └── 🛡️ Phân hệ Bảo mật, Quản trị, Sao lưu & Tiện ích (168 tests)
│       ├── AuthControllerTest                      (6 tests: Đăng nhập, cấp JWT Token, Refresh Token, Đổi mật khẩu)
│       ├── UserServiceTest                         (5 tests: Quản lý nhân viên, mã hóa mật khẩu BCrypt, phân quyền)
│       ├── UserPermissionServiceImplTest           (5 tests: Phân quyền chi tiết theo vai trò ADMIN, RECEPTIONIST, HOUSEKEEPER)
│       ├── SessionServiceTest                      (9 tests: Kiểm soát phiên đăng nhập đồng thời, hủy phiên từ xa)
│       ├── AuditLogControllerTest & ServiceTest    (6 tests: Lưu vết toàn bộ thay đổi hệ thống, lọc theo module/thời gian)
│       ├── BackupControllerTest & ServiceTest      (6 tests: Tạo bản sao lưu ZIP 57 bảng CSDL, khôi phục dữ liệu)
│       ├── DataQueueServiceTest                    (3 tests: Hàng đợi bất đồng bộ xử lý file import/export)
│       ├── DebtApprovalServiceImplTest             (3 tests: Phê duyệt công nợ khách đoàn, quản lý giới hạn nợ)
│       ├── HotelSettingServiceTest                 (2 tests: Lấy cấu hình khách sạn, cập nhật giờ check-in/out)
│       ├── AuthUtilTest                            (10 tests: Bóc tách claims từ JWT, kiểm tra quyền hạn, xác thực người dùng)
│       ├── PersonalDataMaskerTest                  (4 tests: Che mờ CCCD & Số điện thoại theo vai trò người dùng)
│       ├── HashUtilTest                            (2 tests: Băm dữ liệu an toàn, kiểm tra tính toàn vẹn SHA-256)
│       ├── StayApplicationTests                    (1 test: Nạp thành công toàn bộ Spring Application Context)
│       └── Các bài kiểm thử tích hợp nghiệp vụ khác (106 tests phủ rộng toàn bộ logic hệ thống)
│
└── ⚛️ Frontend (162 Test Cases - 45 Test Files - Vitest + Testing Library + Happy-DOM)
    ├── 🛠️ Các Phân hệ Nghiệp vụ Admin & Vận hành (21 tests)
    │   ├── ChannelCalendarPage.test.tsx            (1 test: Render giao diện quản lý OTA, trạng thái kết nối iCal)
    │   ├── CorporateClientManagement.test.tsx      (2 tests: Quản lý hồ sơ đối tác doanh nghiệp, hạn mức công nợ)
    │   ├── GuestManagement.test.tsx                (2 tests: Danh sách khách hàng, tìm kiếm đa tiêu chí, lịch sử ở)
    │   ├── PriceSuggestionPage.test.tsx            (2 tests: Hiển thị bảng gợi ý giá AI theo công suất phòng)
    │   ├── SessionManagementPage.test.tsx          (2 tests: Danh sách phiên đăng nhập của nhân viên, nút thu hồi phiên)
    │   └── UserPermissionModal.test.tsx            (2 tests: Modal phân quyền tài khoản, bật/tắt quyền nghiệp vụ)
    │
    ├── 🔐 Xác thực & Phân quyền (14 tests)
    │   ├── LoginPage.test.tsx                      (3 tests: Form đăng nhập, validation tài khoản/mật khẩu, xử lý lỗi)
    │   ├── ForgotPasswordModal.test.tsx            (3 tests: Quên mật khẩu, gửi email mã xác nhận qua token)
    │   ├── ResetPasswordPage.test.tsx              (3 tests: Nhập mật khẩu mới, kiểm tra độ mạnh mật khẩu)
    │   ├── ForceChangePasswordModal.test.tsx       (3 tests: Bắt buộc đổi mật khẩu khi đăng nhập lần đầu)
    │   └── AuthContext.test.tsx                    (2 tests: Quản lý trạng thái đăng nhập, phân quyền, đăng xuất an toàn)
    │
    ├── 📅 Đặt phòng & Lễ tân (23 tests)
    │   ├── BookingCalendar.test.tsx                (2 tests: Sơ đồ dòng thời gian 7/14/21 ngày, chú thích màu phòng)
    │   ├── BookingList.test.tsx                    (2 tests: Bảng danh sách đơn đặt phòng, lọc trạng thái Tiếng Việt)
    │   ├── BookingConfirmationModal.test.tsx       (3 tests: Modal xem trước và gửi email xác nhận đặt phòng kèm QR)
    │   ├── BookingInvoiceTab.test.tsx              (2 tests: Tab hóa đơn chi tiết trong chi tiết đặt phòng)
    │   ├── BookingRequestList.test.tsx             (3 tests: Tiếp nhận và xử lý yêu cầu đặt phòng công khai)
    │   ├── ConvertBlockModal.test.tsx              (3 tests: Chuyển đổi khối phòng khóa sang đơn đặt thực tế)
    │   └── InHouseGuestList.test.tsx               (4 tests: Danh sách khách đang lưu trú, lọc theo tầng, khách sắp trả)
    │
    ├── 🧹 Buồng phòng & Hóa đơn (13 tests)
    │   ├── RoomStatusUpdate.test.tsx               (3 tests: Cập nhật trạng thái dọn phòng, phân công nhân viên buồng)
    │   ├── DiscountFormModal.test.tsx              (3 tests: Form áp dụng chiết khấu %, chiết khấu tiền mặt)
    │   └── DiscountPanel.test.tsx                  (3 tests: Bảng chi tiết các khoản chiết khấu đã áp dụng)
    │
    ├── 📊 Báo cáo, Chatbot & Cổng công khai (18 tests)
    │   ├── BestSellingServicesReport.test.tsx      (3 tests: Biểu đồ & bảng thống kê dịch vụ bán chạy)
    │   ├── DebtAgingReport.test.tsx                (3 tests: Báo cáo tuổi nợ của khách đoàn và công ty)
    │   ├── PeriodComparisonReport.test.tsx         (3 tests: Báo cáo so sánh tăng trưởng doanh thu đa kỳ PoP/YoY)
    │   ├── PublicBookingDetailPage.test.tsx        (3 tests: Trang tra cứu và hủy đơn đặt phòng công khai của khách)
    │   ├── PublicChatbot.test.tsx                  (2 tests: Chatbot tư vấn giá phòng tự động cho khách truy cập)
    │   └── NotificationBell.test.tsx               (2 tests: Chuông thông báo đẩy, hiển thị số thông báo chưa đọc)
    │
    ├── 🌐 Contexts & Custom Hooks (18 tests)
    │   ├── AppConfigContext.test.tsx               (2 tests: Nạp cấu hình khách sạn, định dạng tiền tệ & ngày tháng)
    │   ├── ToastContext.test.tsx                   (4 tests: Hiển thị thông báo Toast thành công, lỗi, cảnh báo)
    │   ├── useDiscount.test.ts                     (4 tests: Hook tính toán giảm giá, validate hạn mức chiết khấu)
    │   └── useNotifications.test.ts                (3 tests: Hook đồng bộ và quản lý danh sách thông báo)
    │
    └── 🧩 Thư viện Giao diện & Tiện ích dùng chung (55 tests)
        ├── Button.test.tsx & Input.test.tsx        (8 tests: Components nút bấm, ô nhập liệu chuẩn Design System)
        ├── Modal.test.tsx & Pagination.test.tsx    (8 tests: Hộp thoại Modal tương tác và thanh phân trang dữ liệu)
        ├── LoadingScreen & AnimatedCounter         (6 tests: Màn hình chờ và hiệu ứng nhảy số động)
        ├── AntiSpamSlider & GlobalErrorBoundary    (5 tests: Thanh trượt chống bot spam và bắt lỗi giao diện)
        ├── formatDate.test.ts                      (4 tests: Định dạng ngày giờ chuẩn Việt Nam DD/MM/YYYY, HH:mm)
        ├── numberToWords.test.ts                   (6 tests: Đọc số tiền thành chữ Tiếng Việt trên hóa đơn)
        ├── personalDataMasker.test.ts              (10 tests: Che giấu số CCCD, số điện thoại bảo vệ quyền riêng tư)
        ├── cccdParser.test.ts & qrDecoder.test.ts  (10 tests: Bóc tách mã QR CCCD gắn chip của Bộ Công An)
        └── securitySanitizer.test.ts               (8 tests: Khử mã độc XSS và làm sạch dữ liệu đầu vào người dùng)
```

---

## 📖 7. Hướng Dẫn Vận Hành & Xử Lý Sự Cố (Operational Runbook)

### 7.1. Triển Khai Mã Nguồn Mới Lên Production (Quy Trình Tự Động)
Để phát hành bản cập nhật mới, lập trình viên tạo commit và đẩy mã nguồn lên nhánh `main`:

```bash
git checkout main
git pull origin main
# (Thực hiện merge tính năng từ develop hoặc commit trực tiếp)
git push origin main
```

**Tiến trình tự động diễn ra trên GitHub Actions:**
1. Kích hoạt chạy song song 273 Backend Tests và 162 Frontend Tests.
2. Đóng gói Docker Images, gắn tag `:latest` và `:${{ github.sha }}`, đẩy lên `ghcr.io`.
3. Kết nối SSH vào VPS qua khóa bí mật.
4. Tải images mới bằng `docker compose pull` và khởi động lại dịch vụ bằng `docker compose up -d --remove-orphans`.
5. Tự động kiểm tra sức khỏe hệ thống (Health Check) cổng 8080 & 3000 liên tục trong tối đa 150 giây.
6. Tổng thời gian hoàn tất quy trình chỉ mất **từ 35 đến 45 giây** sau khi build image xong.

### 7.2. Kích Hoạt Triển Khai Thủ Công (Manual Deployment)
Nếu cần triển khai lại mà không tạo commit mới:
1. Truy cập **GitHub Repository $\rightarrow$ Actions $\rightarrow$ Chọn workflow "CI/CD - StayAway Production Pipeline"**.
2. Bấm nút **Run workflow** ở góc phải.
3. Chọn nhánh `main` và bấm **Run workflow**.

---

### 7.3. Giám Sát & Quản Trị Hệ Thống Trực Tiếp Trên VPS

Đăng nhập vào VPS qua SSH:
```bash
ssh ubuntu@stayaway.io.vn -i /path/to/private-key.pem
cd ~/stayaway
```

#### Các lệnh giám sát thông dụng:
```bash
# 1. Kiểm tra trạng thái các container đang chạy
docker compose ps

# 2. Xem log Backend theo thời gian thực (100 dòng gần nhất)
docker logs -f stayaway_backend --tail=100

# 3. Xem log Frontend Nginx
docker logs -f stayaway_frontend --tail=100

# 4. Kiểm tra mức tiêu thụ RAM / CPU của toàn bộ hệ thống
docker stats --no-stream

# 5. Kiểm tra kết nối từ Backend sang MySQL
docker exec -it stayaway_backend nc -zv roomi-db 3306
```

---

### 7.4. Quản Lý Dữ Liệu Sao Lưu (Backup & Disaster Recovery)

Thư mục `./backups` trên máy chủ VPS được đồng bộ trực tiếp với `/app/backups` trong container `stayaway_backend`:

```bash
# Xem danh sách các file sao lưu CSDL hiện có
ls -lh ~/stayaway/backups/

# Cấp lại quyền cho thư mục sao lưu nếu phát sinh lỗi không ghi được file
sudo chmod -R 777 ~/stayaway/backups
```

* **Cơ chế sao lưu tự động:** Backend tự động xuất file ZIP nén toàn bộ 57 bảng CSDL định kỳ hoặc khi bấm nút **"Tạo Sao Lưu Mới"** trên giao diện Quản trị.
* **Tái tạo dữ liệu mẫu (Disaster Recovery/Demo):** Quản trị viên có thể gọi API `POST /api/v1/backup/reseed-sample-data` trực tiếp từ giao diện hoặc qua cURL để tái nạp đầy đủ 1,397 bookings, 1,379 invoices và 538 ca trực.

---

### 7.5. Xử Lý Các Sự Cố Thường Gặp (Troubleshooting Guide)

#### Tình huống 1: Lỗi `Health check reached timeout` trong quá trình Deploy
* **Nguyên nhân:** Container `stayaway_backend` mất nhiều thời gian hơn bình thường để kết nối với MySQL `roomi-db` hoặc mạng nội bộ Docker chưa gắn kết kịp thời.
* **Cách xử lý:**
  1. Kiểm tra log backend: `docker logs stayaway_backend --tail=100`.
  2. Kiểm tra container DB: `docker ps -a | grep roomi-db`.
  3. Gắn lại network nếu cần:
     ```bash
     DB_NET=$(docker inspect roomi-db -f '{{range $k,$v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1)
     docker network connect $DB_NET stayaway_backend || true
     docker restart stayaway_backend
     ```

#### Tình huống 2: Lỗi `502 Bad Gateway` khi truy cập https://stayaway.io.vn
* **Nguyên nhân:** Container `stayaway_frontend` đang khởi động lại hoặc Nginx máy chủ Host chưa kết nối được cổng `3000`.
* **Cách xử lý:**
  1. Kiểm tra cổng 3000 trên VPS: `curl -I http://localhost:3000`.
  2. Nếu container `stayaway_frontend` bị tắt: `docker compose up -d frontend`.
  3. Kiểm tra service Nginx trên máy chủ host: `sudo systemctl status nginx` và `sudo systemctl reload nginx`.

#### Tình huống 3: VPS bị tràn RAM (Out of Memory) trên AWS Free Tier
* **Nguyên nhân:** Máy chủ AWS EC2 `t2.micro` hoặc `t3.micro` chỉ có 1GB RAM vật lý, khi chạy cả MySQL, Spring Boot và Nginx có thể bị nghẽn bộ nhớ.
* **Cách khắc phục:** Cấu hình bộ nhớ ảo **Swap Space** 2GB trên VPS:
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

---

## 💻 8. Khởi Chạy Môi Trường Cục Bộ (Local Development)

### Cách 1: Khởi chạy trọn gói bằng Docker Compose (Khuyên Dùng)
Chỉ cần 1 lệnh duy nhất để dựng toàn bộ hệ thống (Frontend, Backend, Nginx):

```bash
docker compose up -d --build
```
* **Frontend Web App:** `http://localhost:3000`
* **Backend REST API:** `http://localhost:8080/api/v1`

---

### Cách 2: Khởi chạy độc lập từng phân hệ (Dành cho Lập trình viên)

#### 1. Yêu cầu tiên quyết:
* JDK 17 (Eclipse Temurin hoặc OpenJDK).
* Node.js 20 LTS & npm 10+.
* MySQL 8.0 (XAMPP hoặc Docker chạy cổng 3306 với Database `stay`).

#### 2. Khởi chạy Backend (Spring Boot 3):
```bash
cd backend
./mvnw spring-boot:run
```
*API Backend sẵn sàng phục vụ tại `http://localhost:8080`.*

#### 3. Khởi chạy Frontend (React 18 + Vite):
```bash
cd frontend
npm ci --legacy-peer-deps
npm run dev
```
*Giao diện Frontend sẵn sàng phục vụ tại `http://localhost:5173`.*

#### 4. Chạy kiểm thử tự động toàn diện:
```bash
# Chạy 273 bài test Backend:
cd backend && ./mvnw test

# Chạy 162 bài test Frontend:
cd frontend && npm test
```

---

<p align="center">
  <strong>StayAway PMS Production Architecture</strong> &nbsp;·&nbsp; Enterprise DevOps Standards &nbsp;·&nbsp; 2026<br/>
  <em>Designed for Zero-Downtime Reliability, High Security & Seamless Automation</em>
</p>
