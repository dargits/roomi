# 🚀 StayAway PMS — Enterprise CI/CD & Production Deployment Guide

<p align="center">
  <img src="https://img.shields.io/badge/Production%20Domain-stayaway.io.vn-6366F1?style=for-the-badge&logo=googlechrome&logoColor=white" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" />
  <img src="https://img.shields.io/badge/Registry-GHCR.io-24292E?style=for-the-badge&logo=github&logoColor=white" />
  <img src="https://img.shields.io/badge/Containers-Docker%20Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Speed-%3C%2045s%20Deploy-00C853?style=for-the-badge&logo=speedtest&logoColor=white" />
</p>

Tài liệu hướng dẫn triển khai và vận hành hệ thống phần mềm quản lý lưu trú **StayAway (StayGo PMS)**. Hệ thống được thiết kế theo tiêu chuẩn DevOps hiện đại, container hóa 100% bằng **Docker & Docker Compose**, tự động hóa toàn diện từ kiểm thử đến triển khai bằng **GitHub Actions** với thời gian downtime tiệm cận 0 (< 45 giây).

---

## 🌐 1. Thông Tin Môi Trường Vận Hành (Production)

| Thuộc tính | Chi tiết cấu hình |
| :--- | :--- |
| **Tên miền chính thức** | 🔗 **[https://stayaway.io.vn](https://stayaway.io.vn/)** |
| **API Backend Endpoint** | `https://stayaway.io.vn/api/v1` |
| **Hạ tầng máy chủ** | AWS EC2 Ubuntu Server (VPS) |
| **Reverse Proxy Host** | Nginx Máy Chủ Host (Port 80 HTTP $\rightarrow$ 443 HTTPS SSL Let's Encrypt) |
| **Container Registry** | GitHub Container Registry (`ghcr.io/dargits/*`) |
| **CSDL Production** | MySQL 8.0 Engine (Container `roomi-db`, Database `stay`) |
| **Pipeline Workflow File** | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) |

---

## 🗺️ 2. Sơ Đồ Kiến Trúc Hệ Thống & Luồng CI/CD

```mermaid
flowchart TD
    %% ==========================================
    %% 1. MÁY PHÁT TRIỂN (LOCAL WORKSTATION)
    %% ==========================================
    subgraph LOCAL_DEV ["💻 1. LOCAL DEVELOPMENT"]
        DEV[Lập trình viên commit code] --> RUN_LOCAL[Chạy test cục bộ: mvnw test & npm test]
        RUN_LOCAL --> PUSH{Push code lên GitHub}
    end

    %% ==========================================
    %% 2. GITHUB ACTIONS AUTOMATION (deploy.yml)
    %% ==========================================
    PUSH -->|Mọi nhánh: feature/*, develop, PR| TRIGGER_CI["⚡ KÍCH HOẠT WORKFLOW (.github/workflows/deploy.yml)"]
    
    subgraph GHA_PIPELINE ["⚙️ 2. GITHUB ACTIONS AUTOMATED ENGINE"]
        direction TB
        TRIGGER_CI --> JOB_BE["☕ Job 1: Backend Tests (JDK 17 + Maven Cache)"]
        TRIGGER_CI --> JOB_FE["⚛️ Job 2: Frontend Tests & Build (Node 20 + npm Cache)"]
        
        JOB_BE --> CHECK_RESULT{Tất cả bài test PASS?}
        JOB_FE --> CHECK_RESULT
        
        CHECK_RESULT -->|❌ FAILED| NOTIFY_FAIL[❌ Dừng Pipeline - Báo lỗi GitHub - KHÔNG Deploy]
        CHECK_RESULT -->|✅ PASSED| BRANCH_GATE{Nhánh hiện tại?}
        
        BRANCH_GATE -->|Nhánh phụ / Pull Request| NOTIFY_OK[✅ Hoàn thành CI Gate - Đóng dấu Xanh]
        BRANCH_GATE -->|Nhánh main / Manual Dispatch| JOB_BUILD["🐳 Job 3: Build & Push Images lên GHCR (ghcr.io)"]
        
        JOB_BUILD -->|Push thành công| JOB_DEPLOY["🚀 Job 4: SSH VPS & Auto Deploy (Dưới 45s)"]
    end

    %% ==========================================
    %% 3. THỰC THI TỰ ĐỘNG TRÊN MÁY CHỦ VPS
    %% ==========================================
    subgraph VPS_EXECUTION ["🛡️ 3. VPS AUTOMATION RUNTIME (stayaway.io.vn)"]
        direction TB
        JOB_DEPLOY --> V1["1. SSH bảo mật qua Private Key"]
        V1 --> V2["2. Git Fetch & Reset code mới nhất"]
        V2 --> V3["3. Tự động đọc mật khẩu & network từ container roomi-db"]
        V3 --> V4["4. docker compose pull (Tải Image dựng sẵn siêu tốc)"]
        V4 --> V5["5. docker compose up -d (Tái khởi động containers)"]
        V5 --> V6["6. Tự động gắn kết mạng nội bộ với roomi-db"]
        V6 --> V7["7. Health Check API liên tục tối đa 60s"]
        V7 --> V8["8. Dọn dẹp Docker Images không dùng (docker image prune -f)"]
    end

    %% ==========================================
    %% 4. KIẾN TRÚC MẠNG RUNTIME
    %% ==========================================
    subgraph PROD_TOPOLOGY ["🌐 4. PRODUCTION TOPOLOGY"]
        direction TB
        HOST_NGINX["🌍 Host Nginx (Port 80/443 SSL: stayaway.io.vn)"]
        HOST_NGINX -->|Chuyển tiếp Traffic Web /| C_FE["⚛️ stayaway_frontend (Port 3000 -> Nginx 80)"]
        HOST_NGINX -->|Chuyển tiếp API /api/v1/| C_BE["☕ stayaway_backend (Port 8080)"]
        C_FE -.->|Proxy nội bộ| C_BE
        C_BE -->|JDBC Connection| C_DB[("🗄️ roomi-db (MySQL 8.0: Database 'stay')")]
    end

    V8 --> PROD_TOPOLOGY
    PROD_TOPOLOGY --> USER_ACCESS["🎉 Hệ thống sẵn sàng phục vụ tại https://stayaway.io.vn"]
```

---

## 📌 3. Chiến Lược Phân Nhánh (Branching Strategy)

Toàn bộ quy trình được đóng gói trong file [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

| Nhánh (Branch) | Sự kiện kích hoạt | Phạm vi thực thi | Tự động Deploy lên VPS? | Cơ chế Hủy Run Cũ |
| :--- | :--- | :--- | :---: | :---: |
| `feature/*`, `develop`, `fix/*` | `push` hoặc tạo `PR` | Chạy 29 Backend Tests + 14 Frontend Tests + Vite Build | ❌ **Không** | `cancel-in-progress: true` |
| `main` | `push` hoặc `merge` | Chạy CI Gate $\rightarrow$ Build/Push GHCR $\rightarrow$ **SSH Deploy VPS** | ✅ **Tự động 100%** | `cancel-in-progress: false` |
| Bất kỳ nhánh nào | `workflow_dispatch` | Thực thi thủ công theo yêu cầu | Phụ thuộc nhánh chọn | `cancel-in-progress: false` |

---

## 🏗️ 4. Chi Tiết Các Giai Đoạn Đóng Gói Docker (Multi-Stage Builds)

### 4.1. Backend (`backend/Dockerfile`)
* **Giai đoạn 1 (Builder)**: `maven:3.9.6-eclipse-temurin-17-alpine`
  * Tận dụng Docker layer cache bằng cách copy `pom.xml` và `go-offline` trước khi build code.
  * Đóng gói file `.jar` tối ưu với `./mvnw clean package -DskipTests`.
* **Giai đoạn 2 (Runtime)**: `eclipse-temurin:17-jre-alpine`
  * Chỉ chứa JRE 17 siêu nhẹ (< 180MB), khởi tạo User không đặc quyền `spring:spring` để đảm bảo an toàn bảo mật.
  * Cấu hình JVM Flags: `-Xms256m -Xmx512m -XX:+UseG1GC`.

### 4.2. Frontend (`frontend/Dockerfile`)
* **Giai đoạn 1 (Builder)**: `node:20-alpine`
  * Cài đặt dependencies sạch `npm ci --legacy-peer-deps`.
  * Nhúng biến `VITE_API_BASE_URL=https://stayaway.io.vn/api/v1` vào quá trình biên dịch Vite.
* **Giai đoạn 2 (Runtime)**: `nginx:alpine`
  * Máy chủ Nginx tĩnh siêu nhẹ (< 25MB), kích hoạt Gzip nén tài nguyên, cấu hình Cache-Control tĩnh 1 năm.
  * Hỗ trợ chuẩn Single Page Application (SPA Routing `try_files $uri $uri/ /index.html;`) và reverse proxy `/api/`.

### 4.3. Docker Compose (`docker-compose.yml`)
* Khởi tạo mạng cầu nối ảo `stayaway_network`.
* Ánh xạ cổng dịch vụ: Backend (`8080:8080`), Frontend (`3000:80`).
* Tự động khởi động lại khi gặp sự cố (`restart: always`).

---

## 🔐 5. Danh Mục Biến Môi Trường & GitHub Secrets

Để kích hoạt hệ thống tự động, cấu hình các GitHub Secrets tại **Repository $\rightarrow$ Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions**:

| Tên Secret | Ý nghĩa | Ví dụ giá trị |
| :--- | :--- | :--- |
| `SERVER_HOST` | Địa chỉ IP máy chủ VPS | `13.236.183.211` |
| `SERVER_USER` | Tài khoản SSH VPS | `ubuntu` |
| `SSH_PRIVATE_KEY` | Khóa SSH Private Key không có passphrase | `-----BEGIN OPENSSH PRIVATE KEY...` |
| `GITHUB_TOKEN` | Token mặc định do GitHub Actions cấp để truy xuất GHCR | Tự động sinh bởi GitHub |

### Biến Môi Trường Tự Động Thiết Lập Trên VPS:
Mỗi lần deploy, script tự động sinh file `.env` trên VPS:
```env
DB_URL=jdbc:mysql://roomi-db:3306/stay?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
DB_USER=root
DB_PASS=<Tự_động_trích_xuất_từ_container_roomi-db>
VITE_API_BASE_URL_PROD=/api/v1
```

---

## 🧪 6. Hệ Thống Kiểm Thử Đạt Chuẩn (43 Test Cases)

Hệ thống CI Gate bắt buộc 100% test cases phải PASS trước khi kích hoạt quy trình deploy:

```
🧪 TOÀN BỘ 43 BÀI TEST CHẤT LƯỢNG CAO
├── ☕ Backend (29 Test Cases - JUnit 5 + Mockito + H2 In-Memory DB)
│   ├── BookingServiceTest          (5 tests: Tạo mới, validation ngày, gán phòng, hủy, checkin/out & khóa phòng)
│   ├── InvoiceServiceTest          (2 tests: Lập hóa đơn khi checkin, ghi nhận thanh toán & chuyển PAID)
│   ├── BookingServiceUsageTest     (3 tests: Phụ thu dịch vụ, lấy danh sách, xóa dịch vụ)
│   ├── ExtraServiceTest            (4 tests: Thêm mới, danh sách mở bán, cập nhật đơn giá, ngừng cung cấp)
│   ├── GuestServiceTest            (3 tests: Thêm hồ sơ khách, tìm kiếm đa tiêu chí, cập nhật liên hệ)
│   ├── HotelSettingServiceTest     (2 tests: Lấy cấu hình khách sạn, cập nhật giờ check-in/out tiêu chuẩn)
│   ├── RoomServiceTest             (5 tests: Tạo phòng, chặn trùng số phòng, danh sách phòng, dọn phòng, bảo trì)
│   ├── UserServiceTest             (4 tests: Đăng nhập JWT, bắt sai mật khẩu, đăng ký nhân viên, chặn trùng tài khoản)
│   └── StayApplicationTests        (1 test: Khởi tạo và nạp Spring Application Context)
└── ⚛️ Frontend (14 Test Cases - Vitest + Testing Library + Happy-DOM)
    ├── formatDate.test.js          (4 tests: Định dạng DD/MM/YYYY, HH:mm, giờ chuẩn, tính đêm lưu trú)
    ├── AuthContext.test.jsx        (3 tests: Trạng thái khách ban đầu, lưu phiên đăng nhập, xóa phiên khi đăng xuất)
    ├── BookingList.test.jsx        (2 tests: Render loading state, render danh sách với nhãn trạng thái Tiếng Việt)
    ├── BookingCalendar.test.jsx    (2 tests: Render timeline 7/14/21 ngày, bảng chú thích màu sắc phòng)
    ├── GuestManagement.test.jsx    (2 tests: Render tiêu đề & ô tìm kiếm, render bảng khách hàng)
    └── BookingInvoiceTab.test.jsx  (1 test: Render chi tiết hóa đơn, trạng thái thanh toán, nút in & lịch sử)
```

---

## 📖 7. Hướng Dẫn Vận Hành (Operational Runbook)

### 7.1. Triển Khai Code Mới (Quy Trình Chuẩn)
Khi lập trình viên hoàn thành tính năng, chỉ cần đẩy mã nguồn lên nhánh `main`:
```bash
git add .
git commit -m "feat: enhance room allocation algorithm"
git push origin main
```
Pipeline sẽ tự động kích hoạt kiểm thử $\rightarrow$ Build Image $\rightarrow$ Đẩy lên GHCR $\rightarrow$ Deploy lên VPS trong vòng **dưới 45 giây**.

### 7.2. Kiểm Tra Trạng Thái & Nhật Ký Trên VPS
Khi cần truy cập trực tiếp máy chủ để giám sát:
```bash
# Xem trạng thái hoạt động của các container
docker compose ps

# Xem log Backend trong thời gian thực
docker logs -f stayaway_backend --tail=100

# Xem log Nginx Frontend
docker logs -f stayaway_frontend --tail=100

# Kiểm tra tình trạng kết nối DB MySQL
docker exec -it stayaway_backend nc -zv roomi-db 3306
```

### 7.3. Chạy Thử Nghiệm Tại Môi Trường Cục Bộ (Local Run)
```bash
# Chạy toàn bộ hệ thống bằng Docker Compose
docker compose up -d --build

# Hoặc khởi chạy độc lập
# Terminal 1 (Backend):
cd backend && ./mvnw spring-boot:run

# Terminal 2 (Frontend):
cd frontend && npm install && npm run dev
```

---

<p align="center">
  <strong>StayAway PMS Production Architecture</strong> &nbsp;·&nbsp; Enterprise DevOps Standards &nbsp;·&nbsp; 2026
</p>
