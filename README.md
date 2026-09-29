# 🏨 Lưu Trú Số — Nền Tảng Quản Lý Cơ Sở Lưu Trú Thông Minh

<p align="center">
  <img src="https://img.shields.io/badge/Version-v1.0.4-indigo?style=for-the-badge&logo=git&logoColor=white" alt="Version v1.0.4" />
  <img src="https://img.shields.io/badge/Production-stayaway.io.vn-6366F1?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Production Domain" />
  <img src="https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white" alt="Spring Boot" />
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 17" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions" />
</p>

---

> **Lưu Trú Số** là giải pháp quản lý khách sạn, resort và căn hộ dịch vụ (Stay Away PMS) toàn diện, chuẩn hóa theo quy trình vận hành thực tế tại Việt Nam. Hệ thống số hóa trọn vẹn vòng đời cơ sở lưu trú: từ cổng đặt phòng tự phục vụ, check-in quét QR thẻ CCCD gắn chip, định giá động linh hoạt, buồng phòng nghiệm thu 2 bước, đến đồng bộ kênh OTA hai chiều (iCal), thanh toán VietQR động, quản lý công nợ và báo cáo chỉ số quản trị quốc tế (ADR, RevPAR, PoP, YoY).

---

## 📑 Mục Lục

- [🌟 Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
- [👥 Ma Trận Phân Quyền (RBAC)](#-ma-trận-phân-quyền-rbac)
- [🏗️ Kiến Trúc Hệ Thống](#️-kiến-trúc-hệ-thống)
- [🔄 Quy Trình Vận Hành Khép Kín](#-quy-trình-vận-hành-khép-kín)
- [📁 Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [🚀 Hướng Dẫn Cài Đặt & Chạy Thử](#-hướng-dẫn-cài-đặt--chạy-thử)
- [🧪 Kiểm Thử Tự Động (Testing)](#-kiểm-thử-tự-động-testing)
- [🐳 CI/CD & Triển Khai Cloud VPS](#-cicd--triển-khai-cloud-vps)
- [🔐 Tài Khoản Trải Nghiệm Mẫu](#-tài-khoản-trải-nghiệm-mẫu)

---

## 🌟 Tính Năng Nổi Bật

### 1. 🛎️ Quản Lý Đặt Phòng & Lưu Trú
- **Đặt phòng đơn & đoàn (Group Booking):** Kiểm tra xung đột phòng theo thời gian thực (Zero-Conflict Algorithm), tự động gán phòng tối ưu.
- **Check-in quét mã QR CCCD gắn chip:** Tự động giải mã chuỗi thông tin định danh trên thẻ căn cước công dân để điền hồ sơ khách và trích xuất danh sách khai báo tạm trú.
- **Bảo mật dữ liệu cá nhân (Data Masking):** Ẩn một phần số CCCD và số điện thoại đối với nhân viên không đủ quyền hạn.
- **Import dữ liệu lịch sử:** Nhập danh sách đặt phòng cũ từ file Excel/CSV với cơ chế kiểm tra trước (Preview Validation) và giao dịch an toàn (Atomic Transaction).

### 2. 💵 Giá Phòng Đa Tầng & Chính Sách Linh Hoạt
- **Bảng giá động (Smart Pricing):** Thiết lập giá theo mùa cao/thấp điểm, phụ thu cuối tuần và ngày lễ/tết Việt Nam.
- **Chính sách cọc & Hoàn hủy:** Cấu hình tỷ lệ cọc theo loại phòng, thiết lập hạn nộp cọc và biểu phí phạt hủy lũy tiến.
- **Hợp đồng giá đối tác (B2B):** Áp dụng bảng giá thỏa thuận ưu đãi cố định cho khách đoàn và đại lý lữ hành.
- **Gợi ý giá thông minh:** Phân tích tỷ lệ lấp đầy lịch sử để đưa ra khuyến nghị điều chỉnh giá tối ưu doanh thu.

### 3. 🧹 Buồng Phòng & Đo Lường Năng Suất
- **Sơ đồ ma trận phòng trực quan:** Trực quan hóa trạng thái: *Sạch / Đang ở / Chưa dọn / Chờ duyệt / Bảo trì*.
- **Nghiệm thu 2 bước:** Nhân viên dọn xong gửi yêu cầu $\rightarrow$ Lễ tân/Quản lý kiểm tra đạt tiêu chuẩn mới mở bán phòng.
- **Định mức thời gian & Năng suất:** Đo lường thời gian dọn thực tế so với định mức tiêu chuẩn của từng nhân viên buồng phòng.
- **Quản lý đồ thất lạc (Lost & Found):** Tiếp nhận, lưu kho, bàn giao hoặc thanh lý đồ khách để quên có lưu vết.

### 4. 💳 Tài Chính, Thu Chi & Quản Lý Công Nợ
- **Thanh toán đa kênh & VietQR động:** Sinh mã QR thanh toán chuẩn Napas247 chính xác số tiền cho từng hóa đơn.
- **Quy trình duyệt nợ đa cấp:** Gửi yêu cầu ghi nợ khi check-out $\rightarrow$ Chủ cơ sở/Kế toán duyệt $\rightarrow$ Theo dõi thu hồi nợ từng kỳ.
- **Chốt sổ quỹ theo ca (Daily Cash Ledger):** Đối soát doanh thu thực tế giữa Tiền mặt / Ngân hàng / QR, phát hiện chênh lệch và khóa sổ cuối ngày.

### 5. 🔄 Đồng Bộ Kênh OTA (Channel Manager)
- **Kết nối 2 chiều chuẩn iCal:** Tự động đồng bộ lịch phòng với Airbnb, Booking.com, Agoda... để chống trùng phòng (Overbooking).
- **Cảnh báo xung đột tức thì:** Phát hiện và gửi thông báo khi có lịch đặt chồng chéo giữa kênh nội bộ và kênh ngoài.

### 6. 📊 Báo Cáo Quản Trị Khách Sạn
- **Chỉ số kinh doanh quốc tế:** Tự động tính toán **ADR** (Giá bán bình quân), **RevPAR** (Doanh thu trên mỗi phòng sẵn có), **Occupancy** (Tỷ lệ lấp đầy).
- **Phân tích so sánh đa kỳ:** So sánh tốc độ tăng trưởng **PoP** (Kỳ này so với kỳ trước) và **YoY** (Cùng kỳ năm trước) kèm biểu đồ và xuất CSV.

### 7. 🌐 Cổng Khách Hàng Tự Phục Vụ (Public Portal)
- **Trang xem & đặt phòng công khai:** Khách chủ động tra cứu phòng trống, xem tiện ích, bảng giá và đặt phòng trực tuyến.
- **Tra cứu tiến độ & Tự hủy yêu cầu:** Tra cứu tình trạng đặt phòng và chủ động hủy yêu cầu bằng Mã đơn + Số điện thoại.
- **Xem hóa đơn điện tử:** Đường dẫn bảo mật tra cứu chi tiết hóa đơn thanh toán trực tuyến.

---

## 👥 Ma Trận Phân Quyền (RBAC)

| Chức năng chính | 👑 Chủ cơ sở (OWNER) | 🛠️ Quản trị viên (ADMIN) | 🛎️ Lễ tân (RECEPTIONIST) | 📊 Kế toán (ACCOUNTANT) | 🧹 Buồng phòng (HOUSEKEEPER) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Bảng điều khiển (Dashboard)** | Doanh thu, ADR, RevPAR | Hệ thống & Tài khoản | Sơ đồ phòng & Đơn hôm nay | Doanh thu, Sổ quỹ, Hóa đơn | Danh sách phòng phân công |
| **Đặt phòng & Check-in/out** | Toàn quyền | Xem & Giám sát | Tạo, sửa, check-in/out, quét CCCD | Chỉ xem | Không |
| **Bảng giá, Mùa vụ & Lễ tết** | Toàn quyền | Toàn quyền | Áp dụng giá | Chỉ xem | Không |
| **Chính sách cọc & Hoàn hủy** | Cấu hình toàn diện | Chỉ xem | Chỉ xem | Chỉ xem | Không |
| **Duyệt Công nợ & Chiết khấu**| Toàn quyền duyệt | Toàn quyền duyệt | Gửi yêu cầu duyệt | Toàn quyền duyệt | Không |
| **Thu tiền & Chốt sổ ca** | Kiểm tra & Khóa sổ | Kiểm tra | Thu ngân theo ca | Đối soát dòng tiền | Không |
| **Dọn phòng & Nghiệm thu** | Nghiệm thu | Nghiệm thu | Nghiệm thu | Không | Cập nhật tiến độ dọn |
| **Năng suất buồng phòng** | Toàn quyền | Toàn quyền | Chỉ xem | Không | Xem năng suất cá nhân |
| **Báo cáo kinh doanh & Xuất file**| Toàn diện | Toàn diện | Báo cáo cơ bản | Chi tiết tài chính | Không |
| **Quản lý người dùng & Hệ thống**| Toàn quyền | Toàn quyền | Không | Không | Không |

---

## 🏗️ Kiến Trúc Hệ Thống

```
                                [ CLIENT / BROWSER ]
                                          │
                                          ▼ HTTPS (Port 443)
                            [ NGINX REVERSE PROXY ]
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼ Giao diện Web (/)                           ▼ REST API (/api/v1/)
      ┌─────────────────────────┐                   ┌─────────────────────────┐
      │   FRONTEND CONTAINER    │                   │    BACKEND CONTAINER    │
      │   • React 18 + Vite 6   │                   │   • Spring Boot 3 (Java 17)
      │   • TypeScript + Tailwind│                  │   • Spring Security + JWT   │
      │   • React Router v6     │                   │   • Spring Data JPA + Batch │
      │   • Axios Interceptors  │                   │   • Scheduled Background Job│
      └─────────────────────────┘                   └────────────┬────────────┘
                                                                  │
                                                                  ▼
                                                    ┌─────────────────────────┐
                                                    │   DATABASE CONTAINER    │
                                                    │   • MySQL 8.0 Engine    │
                                                    │   • Container: roomi-db │
                                                    │   • Auto Schema Migrate │
                                                    └─────────────────────────┘
```

---

## 🔄 Quy Trình Vận Hành Khép Kín

```
[Khách hàng / Kênh OTA]
           │
           ├── (1) Đặt phòng qua Portal / Kênh OTA ──► [Kiểm tra phòng trống & Khóa lịch]
           │                                                    │
           ▼                                                    ▼
[Lễ tân nhận đơn] ──────────────────────────────► [Thu tiền cọc (Deposit) ──► Booking: CONFIRMED]
           │                                                    │
           ├── (2) Khách đến nhận phòng (Check-in)               │
           │   • Quét mã QR thẻ CCCD gắn chip                   │
           │   • Gán phòng thực tế (Room: OCCUPIED)             │
           │   • Tự động sinh Hóa đơn nháp (Invoice: DRAFT) ◄───┘
           │
           ├── (3) Quá trình lưu trú
           │   • Gọi đồ ăn / giặt là / minibar ─────────► [Cộng dồn vào Hóa đơn nháp]
           │   • Đổi phòng / Gia hạn ngày lưu trú ──────► [Tự tính chênh lệch giá phòng]
           │
           ├── (4) Khách trả phòng (Check-out)
           │   • Quyết toán tiền phòng + Dịch vụ - Tiền cọc - Giảm giá
           │   • Khách thanh toán: Tiền mặt / Chuyển khoản / VietQR động
           │   • Hóa đơn chuyển trạng thái: PAID
           │   • Trạng thái phòng chuyển sang: DIRTY (Cần dọn dẹp)
           │                                    │
           ▼                                    ▼
[Bộ phận Buồng phòng] ◄────────────────────────┘
           │
           ├── Phân công theo thứ tự ưu tiên khách nhận phòng tiếp theo
           ├── Nhân viên tiến hành dọn phòng (Room: IN_PROGRESS) ──► Bấm giờ tính thời lượng
           ├── Hoàn thành bấm Gửi duyệt (Room: INSPECTING)
           └── Quản lý nghiệm thu ĐẠT ──► [Room: CLEAN (Sẵn sàng mở bán)]
           │
           ▼
[Cuối ngày làm việc]
           ├── Lễ tân / Thu ngân chốt sổ quỹ ca làm việc (Daily Cash Ledger)
           ├── Đối soát số dư Tiền mặt / Ngân hàng / QR
           └── Khóa sổ quỹ ──► [Tự động cập nhật Báo cáo doanh thu & ADR / RevPAR]
```

---

## 📁 Cấu Trúc Dự Án

```
roomi/
├── 📄 README.md                 # Tài liệu tổng quan hệ thống Lưu Trú Số
├── 📄 DEPLOYMENT.md             # Hướng dẫn chi tiết vận hành VPS & CI/CD
├── 📄 docker-compose.yml        # Cấu hình khởi chạy Docker đa container
├── 📂 .github/workflows/        # CI/CD tự động kiểm thử & deploy GitHub Actions
├── 📂 backend/                  # ☕ Backend Spring Boot 3 + Java 17
│   ├── src/main/java/plant/stay/
│   │   ├── config/              # Schedulers, Security, CORS, SchemaMigration
│   │   ├── controller/          # 27 REST Controllers chuẩn RESTful
│   │   ├── dto/                 # Request & Response Data Transfer Objects
│   │   ├── model/               # 39 JPA Entities & Enums
│   │   ├── repository/          # Spring Data JPA Repositories
│   │   ├── service/             # Business Logic & Service Implementations
│   │   └── util/                # AuthUtil, HashUtil, PersonalDataMasker
│   └── src/test/                # 270+ JUnit 5 Unit & Integration Tests
└── 📂 frontend/                 # ⚛️ Frontend React 18 + Vite 6 + TailwindCSS
    └── src/
        ├── components/          # Thư viện UI dùng chung (Buttons, Modals, Forms)
        ├── context/             # AuthContext, ToastContext, AppConfigContext
        ├── features/            # 10 phân hệ nghiệp vụ chính (booking, housekeeping...)
        ├── layouts/             # DashboardLayout phân vai trò, PublicLayout
        ├── services/            # 43 Axios API Client modules
        └── types/               # TypeScript interfaces & types
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Thử

### Cách 1: Khởi chạy nhanh bằng Docker Compose (Khuyên Dùng)

Yêu cầu máy chủ đã cài đặt **Docker** và **Docker Compose**:

```bash
docker compose up -d --build
```

- **Giao diện Web:** `http://localhost:3000`
- **Backend REST API:** `http://localhost:8080/api/v1`

---

### Cách 2: Khởi chạy cục bộ từng phân hệ (Development)

#### 1. Khởi chạy Backend (Spring Boot 3):
- Yêu cầu: **JDK 17** và **MySQL 8.0** (Database: `stay`).
- Cấu hình thông tin kết nối tại `backend/src/main/resources/application.properties`.

```bash
cd backend
./mvnw spring-boot:run
```
*API Backend sẵn sàng tại `http://localhost:8080`.*

#### 2. Khởi chạy Frontend (React + Vite):
- Yêu cầu: **Node.js 20 LTS** & **npm 10+**.

```bash
cd frontend
npm ci --legacy-peer-deps
npm run dev
```
*Giao diện Frontend sẵn sàng tại `http://localhost:5173`.*

---

## 🧪 Kiểm Thử Tự Động (Testing)

Dự án duy trì bộ kiểm thử tự động, tích hợp kiểm tra trước mỗi commit và trong pipeline CI/CD:

```bash
# Kiểm thử Backend (JUnit 5 + Mockito + In-Memory H2 DB)
cd backend && ./mvnw test

# Kiểm thử Frontend (Vitest + React Testing Library)
cd frontend && npm test
```

---

## 🐳 CI/CD & Triển Khai Cloud VPS

Dự án thiết lập quy trình CI/CD tự động hóa thông qua **GitHub Actions** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):

```
[Git Push lên main] ──► [Chạy toàn bộ Backend Tests] ──┐
                    ──► [Chạy toàn bộ Frontend Tests] ──┴──► [PASS 100% Tests?]
                                                                   │
                                                                   ▼
                                                   [Build Docker Images & Push GHCR]
                                                                   │
                                                                   ▼
                                                   [SSH Triển khai lên VPS Ubuntu]
                                                   • Pull Docker Images mới nhất
                                                   • Recreate Containers
                                                   • Auto Schema Migration
                                                   • Health Check tự động
                                                   • Downtime hoàn tất < 45 giây
```

Xem hướng dẫn chi tiết về cấu hình máy chủ, biến môi trường và xử lý sự cố tại [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 🔐 Tài Khoản Trải Nghiệm Mẫu

Dữ liệu mẫu (`DataSeeder`) được tích hợp sẵn các tài khoản đại diện cho các vai trò vận hành (mật khẩu mặc định: `pass@123`):

| Mã vai trò | Chức danh | Tài khoản (Username) | Mật khẩu mặc định | Nhiệm vụ chính |
| :---: | :--- | :--- | :--- | :--- |
| **VT-01** | **Chủ sở hữu** | `chusohuu` | `pass@123` | Quản lý tổng thể khách sạn |
| **VT-02** | **Lễ tân** | `letan` | `pass@123` | Thủ tục nhận/trả phòng, hỗ trợ khách |
| **VT-03** | **Buồng phòng** | `buongphong` | `pass@123` | Kiểm tra phòng, điều phối dọn dẹp |
| **VT-04** | **Kế toán** | `ketoan` | `pass@123` | Kiểm soát thu chi, báo cáo tài chính |
| **VT-05** | **Quản trị viên** | `admin` | `pass@123` | Toàn quyền: quản lý hệ thống, nhân sự |

---

<p align="center">
  <strong>Lưu Trú Số</strong> &nbsp;·&nbsp; Nền Tảng Quản Lý Lưu Trú Thế Hệ Mới &nbsp;·&nbsp; 2026
</p>
