# 🏨 Lưu Trú Số (Smart PMS) — Nền Tảng Quản Lý Cơ Sở Lưu Trú Toàn Diện

<p align="center">
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

> **Lưu Trú Số** là hệ sinh thái quản lý khách sạn, resort và chuỗi căn hộ lưu trú (Property Management System - PMS) thế hệ mới chuẩn doanh nghiệp. Hệ thống số hóa trọn vẹn toàn bộ vòng đời vận hành: từ cổng đặt phòng trực tuyến, lễ tân nhận phòng bằng mã QR CCCD gắn chip, cấu hình giá linh hoạt theo mùa/lễ, buồng phòng nghiệm thu 2 bước đo năng suất, đồng bộ OTA 2 chiều (iCal), đến quản lý tài chính, hóa đơn điện tử, duyệt công nợ và báo cáo chỉ số tiêu chuẩn quốc tế (ADR, RevPAR, PoP, YoY).

---

## 📑 Mục Lục

1. [🌟 Tính Năng Trọng Tâm](#-tính-năng-trọng-tâm)
2. [👥 Phân Quyền 5 Vai Trò Người Dùng](#-phân-quyền-5-vai-trò-người-dùng)
3. [🏗️ Kiến Trúc Công Nghệ](#️-kiến-trúc-công-nghệ)
4. [🔄 Luồng Vận Hành Hệ Thống](#-luồng-vận-hành-hệ-thống)
5. [📁 Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
6. [🚀 Hướng Dẫn Cài Đặt & Khởi Chạy](#-hướng-dẫn-cài-đặt--khởi-chạy)
7. [🧪 Kiểm Thử Tự Động (Testing)](#-kiểm-thử-tự-động-testing)
8. [🐳 Hạ Tầng CI/CD & Vận Hành VPS](#-hạ-tầng-cicd--vận-hành-vps)
9. [🔐 Tài Khoản Trải Nghiệm Mẫu](#-tài-khoản-trải-nghiệm-mẫu)

---

## 🌟 Tính Năng Trọng Tâm

### 1. 🛎️ Nghiệp Vụ Đặt Phòng & Lưu Trú
* **Đặt phòng đơn & Đặt phòng đoàn (Group Booking):** Thuật toán tự động xếp phòng và kiểm tra xung đột thời gian thực, ngăn chặn 100% tình trạng trùng phòng.
* **Vòng đời khách lưu trú khép kín:** Đặt phòng $\rightarrow$ Đặt cọc $\rightarrow$ Check-in $\rightarrow$ Thêm dịch vụ/Đổi phòng/Gia hạn $\rightarrow$ Check-out $\rightarrow$ Thanh toán & Quyết toán hóa đơn.
* **Tích hợp quét mã QR CCCD gắn chip:** Tự động giải mã chuỗi định danh trên thẻ căn cước công dân để điền hồ sơ khách và kết xuất danh sách khai báo tạm trú công an.
* **Bảo mật dữ liệu cá nhân (Data Masking):** Tự động che mờ số CCCD và Số điện thoại đối với các vai trò nhân viên không đủ thẩm quyền.
* **Import danh sách đặt phòng lịch sử:** Nhập dữ liệu đặt phòng từ file Excel/CSV với cơ chế **Preview Validation** và **Atomic Transaction**.

### 2. 🌐 Cổng Khách Hàng Tự Phục Vụ (Public Portal)
* **Cổng xem & đặt phòng công khai:** Khách chủ động tra cứu phòng trống theo ngày, xem tiện ích, hình ảnh và gửi yêu cầu đặt phòng.
* **Tra cứu & Tự hủy yêu cầu (`CLTSN3-439`):** Khách tra cứu tiến độ xử lý và chủ động hủy yêu cầu bằng Mã đặt phòng + Số điện thoại.
* **Xem hóa đơn trực tuyến (`NCL-09-CN-008`):** Cung cấp đường dẫn tra cứu chi tiết hóa đơn thanh toán an toàn.

### 3. 💵 Giá Phòng Thông Minh & Chính Sách Linh Hoạt
* **Cấu hình giá đa tầng (Smart Pricing):** Thiết lập giá theo mùa vụ (cao điểm/thấp điểm), phụ thu cuối tuần (T6, T7, CN) và bảng giá ngày lễ tết Việt Nam.
* **Chính sách đặt cọc theo loại phòng:** Tùy biến tỷ lệ cọc (%) mặc định hoặc riêng cho từng hạng phòng, tự động tính hạn thanh toán cọc.
* **Chính sách hoàn hủy đa mốc:** Cấu hình thời gian hủy miễn phí, số giờ sau xác nhận bắt đầu tính phí và biểu phí phạt hủy theo tiền cọc.
* **Thỏa thuận giá doanh nghiệp (B2B):** Thiết lập hợp đồng giá ưu đãi cố định cho khách hàng công ty và đối tác lữ hành.
* **Gợi ý điều chỉnh giá AI:** Phân tích công suất phòng lịch sử để đưa ra đề xuất tăng/giảm giá bán tối ưu doanh thu.

### 4. 🧹 Buồng Phòng Thông Minh & Quản Lý Năng Suất
* **Sơ đồ ma trận phòng trực quan:** Trực quan hóa trạng thái: *Sạch / Có khách / Cần dọn / Chờ nghiệm thu / Bảo trì*.
* **Quy trình nghiệm thu 2 bước:** Nhân viên dọn xong gửi duyệt $\rightarrow$ Quản lý/Lễ tân kiểm tra đạt chuẩn mới mở bán phòng.
* **Quản lý yêu cầu dọn lại:** Theo dõi lý do từ chối nghiệm thu, đếm số lần dọn lại để đánh giá chất lượng.
* **Định mức thời gian & Năng suất:** Cấu hình định mức thời gian dọn trả khách / dọn định kỳ, theo dõi thời lượng thực tế của từng nhân viên.
* **Quản lý đồ khách để quên (Lost & Found):** Quy trình tiếp nhận, lưu kho, bàn giao hoặc xử lý thanh lý đồ thất lạc có lưu vết.

### 5. 💳 Tài Chính, Thu Chi & Quản Lý Công Nợ
* **Hóa đơn & Chiết khấu:** Tổng hợp tự động tiền phòng, phụ thu dịch vụ, minibar, giặt là, giảm giá voucher; phê duyệt chiết khấu vượt ngưỡng.
* **Thanh toán đa kênh:** Tiền mặt, Chuyển khoản ngân hàng, sinh mã **VietQR động** chuẩn Napas chính xác đến từng đồng.
* **Quản lý công nợ & Duyệt nợ:** Quy trình gửi yêu cầu ghi nợ khi check-out $\rightarrow$ Chủ sở hữu/Kế toán duyệt nợ $\rightarrow$ Nhật ký thu hồi nợ từng đợt.
* **Chốt sổ quỹ theo ca/ngày (Daily Cash Ledger):** Đối soát doanh thu thực thu, tiền bàn giao đầu ca, chênh lệch quỹ và khóa sổ cuối ngày.

### 6. 🔄 Đồng Bộ Kênh OTA (Channel Manager)
* **Kết nối 2 chiều qua chuẩn iCal:** Tự động lấy lịch bận từ Airbnb, Booking.com, Agoda,... để khóa phòng nội bộ và ngược lại.
* **Cảnh báo xung đột (Overbooking):** Phát hiện tức thời khi phát sinh xung đột lịch giữa kênh trực tiếp và kênh OTA.
* **Nhật ký đồng bộ tự động:** Lưu vết chi tiết thời điểm sync, trạng thái kết nối và số lần thử lại khi mất tín hiệu.

### 7. 📊 Báo Cáo Quản Trị Chuyên Sâu
* **Chỉ số kinh doanh khách sạn chuẩn quốc tế:** Tự động tính **ADR** (Giá bán bình quân), **RevPAR** (Doanh thu trên mỗi phòng sẵn có), **Occupancy Rate** (Tỷ lệ lấp đầy).
* **Báo cáo so sánh đa kỳ (`CLTSN3-431`):** Phân tích tăng trưởng **PoP** (Kỳ này so với kỳ trước) và **YoY** (Cùng kỳ năm trước) kèm biểu đồ và xuất file CSV.
* **Báo cáo dịch vụ bán chạy:** Xếp hạng các mặt hàng minibar, đồ uống, dịch vụ mang lại doanh thu cao nhất.

### 8. 🛡️ Bảo Mật, Phiên Đăng Nhập & Sao Lưu Đám Mây
* **Kiểm soát phiên đồng thời (Concurrent Sessions):** Giới hạn số thiết bị đăng nhập cùng lúc theo vai trò, thu hồi phiên từ xa khi nghi ngờ xâm nhập.
* **Hệ thống cảnh báo (Notification Center):** Chuông thông báo thời gian thực về đơn đặt phòng mới, duyệt nợ, sự cố phòng.
* **Email tự động chống Spam:** Gửi email xác nhận đặt phòng, mã QR check-in, khóa cooldown 60s và quota 5 lần/ngày/booking.
* **Sao lưu dữ liệu tự động lên Telegram Bot:** Định kỳ đóng gói file ZIP nén toàn bộ cơ sở dữ liệu và gửi thông báo trực tiếp vào nhóm Telegram quản trị.

---

## 👥 Phân Quyền 5 Vai Trò Người Dùng

Hệ thống thiết kế ma trận phân quyền chi tiết (Role-Based Access Control - RBAC) bảo đảm an toàn dữ liệu:

| Nghiệp vụ & Chức năng | 👑 Chủ cơ sở (OWNER) | 🛠️ Quản trị viên (ADMIN) | 🛎️ Lễ tân (RECEPTIONIST) | 📊 Kế toán (ACCOUNTANT) | 🧹 Buồng phòng (HOUSEKEEPER) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Bảng điều khiển (Dashboard)** | Toàn diện doanh thu, lợi nhuận, ADR, RevPAR | Tình trạng phòng, tài khoản, hệ thống | Đơn đến hôm nay, check-in/out, sơ đồ phòng | Công nợ, doanh thu, chốt ca, hóa đơn | Danh sách phòng phân công, việc cần làm |
| **Đặt phòng & Check-in/out** | Toàn quyền | Xem & Giám sát | Tạo, sửa, check-in, check-out, quét CCCD | Chỉ xem | Không |
| **Chính sách cọc & Hoàn hủy** | Tạo, sửa, xóa | Chỉ xem | Chỉ xem | Chỉ xem | Không |
| **Bảng giá, Mùa vụ & Ngày lễ** | Toàn quyền | Toàn quyền | Áp dụng giá | Chỉ xem | Không |
| **Phê duyệt Công nợ & Chiết khấu**| Toàn quyền duyệt | Toàn quyền duyệt | Gửi yêu cầu duyệt | Toàn quyền duyệt | Không |
| **Thu tiền & Chốt sổ quỹ** | Kiểm tra & Khóa sổ | Kiểm tra | Thu ngân theo ca | Đối soát dòng tiền | Không |
| **Dọn dẹp & Nghiệm thu phòng** | Nghiệm thu phòng | Nghiệm thu phòng | Nghiệm thu phòng | Không | Cập nhật tiến độ dọn |
| **Định mức & Năng suất buồng** | Toàn quyền | Toàn quyền | Chỉ xem | Không | Xem năng suất cá nhân |
| **Báo cáo tài chính & Xuất file** | Toàn quyền | Toàn quyền | Báo cáo cơ bản | Toàn quyền chi tiết | Không |
| **Quản lý nhân sự & Phân quyền** | Toàn quyền | Toàn quyền | Không | Không | Không |
| **Sao lưu CSDL & Telegram Bot** | Toàn quyền | Toàn quyền | Không | Không | Không |

---

## 🏗️ Kiến Trúc Công Nghệ

```
                                [ CLIENT / TRÌNH DUYỆT ]
                                           │
                                           ▼ HTTPS (Port 443)
                             [ NGINX REVERSE PROXY ]
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼ Request Web (/)                             ▼ Request API (/api/v1/)
       ┌─────────────────────────┐                   ┌─────────────────────────┐
       │   FRONTEND CONTAINER    │                   │    BACKEND CONTAINER    │
       │   • React 18 + Vite 6   │                   │   • Spring Boot 3 (Java 17)
       │   • TypeScript + Tailwind│                  │   • Spring Security + JWT   │
       │   • React Router v6     │                   │   • Spring Data JPA + Batch │
       │   • Axios Interceptor   │                   │   • 5 Tác vụ ngầm Scheduler │
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

## 🔄 Luồng Vận Hành Hệ Thống

```
[Khách hàng / Kênh OTA]
           │
           ├── (1) Đặt phòng qua Portal / Kênh OTA ──► [Kiểm tra phòng trống & Khóa lịch]
           │                                                    │
           ▼                                                    ▼
[Lễ tân nhận đơn] ──────────────────────────────► [Thu tiền cọc (Deposit) -> Booking: CONFIRMED]
           │                                                    │
           ├── (2) Khách đến nhận phòng (Check-in)               │
           │   • Quét mã QR thẻ CCCD gắn chip                   │
           │   • Gán số phòng thực tế (Room: OCCUPIED)          │
           │   • Tự động sinh Hóa đơn nháp (Invoice: DRAFT) ◄───┘
           │
           ├── (3) Quá trình lưu trú
           │   • Khách gọi đồ ăn / giặt là / dịch vụ ──► [Cộng dồn vào Hóa đơn nháp]
           │   • Đổi phòng / Gia hạn ngày ──────────────► [Tính chênh lệch tiền phòng]
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
           ├── Phân công dọn dẹp theo mức độ ưu tiên khách kế tiếp
           ├── Nhân viên tiến hành dọn phòng (Room: IN_PROGRESS) -> Bấm giờ tính thời lượng
           ├── Dọn xong bấm Gửi duyệt (Room: INSPECTING)
           └── Quản lý nghiệm thu ĐẠT ──► [Room: CLEAN (Sẵn sàng bán phòng)]
           │
           ▼
[Cuối ngày làm việc]
           ├── Lễ tân / Thu ngân thực hiện "Chốt sổ quỹ ca/ngày" (Daily Cash Ledger)
           ├── Đối soát dòng tiền Tiền mặt / Ngân hàng / QR
           └── Quản lý khóa sổ quỹ ──► [Tự động đẩy vào Báo cáo doanh thu & ADR/RevPAR]
```

---

## 📁 Cấu Trúc Dự Án

```
roomi/
├── 📄 README.md                 # Tài liệu tổng quan hệ thống Lưu Trú Số
├── 📄 DEPLOYMENT.md             # Hướng dẫn chi tiết vận hành VPS & CI/CD
├── 📄 docker-compose.yml        # Cấu hình triển khai đa container
├── 📂 .github/workflows/        # Workflow tự động hóa GitHub Actions (deploy.yml)
├── 📂 backend/                  # ☕ Backend Spring Boot 3 + Java 17
│   ├── src/main/java/plant/stay/
│   │   ├── config/              # Schedulers, CORS, Data Masking, DatabaseSchemaMigration
│   │   ├── controller/          # 27 REST Controllers chuẩn RESTful
│   │   ├── dto/                 # Request & Response DTOs
│   │   ├── model/               # 39 JPA Entities & Enums
│   │   ├── repository/          # Spring Data JPA Repositories
│   │   ├── service/             # Business Logic & Service Implementations
│   │   └── util/                # AuthUtil, HashUtil, PersonalDataMasker
│   └── src/test/                # 270+ JUnit 5 Unit & Integration Tests
└── 📂 frontend/                 # ⚛️ Frontend React 18 + Vite 6 + TailwindCSS
    └── src/
        ├── components/          # Thư viện UI dùng chung, Dialogs, Chatbot AI
        ├── context/             # AuthContext, ToastContext, AppConfigContext
        ├── features/            # 10 phân hệ nghiệp vụ chính (booking, housekeeping, invoice...)
        ├── layouts/             # DashboardLayout phân vai trò, PublicLayout
        ├── services/            # 43 Axios API Client modules
        └── types/               # TypeScript interfaces & types
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### Cách 1: Khởi chạy nhanh bằng Docker Compose (Khuyên Dùng)

Chỉ cần cài đặt Docker & Docker Compose, chạy lệnh duy nhất tại thư mục gốc:

```bash
docker compose up -d --build
```

* **Frontend Web App:** `http://localhost:3000`
* **Backend REST API:** `http://localhost:8080/api/v1`

---

### Cách 2: Khởi chạy cục bộ từng phân hệ (Dành cho Lập trình viên)

#### 1. Khởi chạy Backend (Spring Boot 3):
* Yêu cầu: **JDK 17** và **MySQL 8.0** đang chạy với cơ sở dữ liệu `stay`.
* Cấu hình kết nối tại `backend/src/main/resources/application.properties` hoặc file `.env`.

```bash
cd backend
./mvnw spring-boot:run
```
*API Backend sẽ sẵn sàng tại `http://localhost:8080`.*

#### 2. Khởi chạy Frontend (React + Vite):
* Yêu cầu: **Node.js 20 LTS** & **npm 10+**.

```bash
cd frontend
npm ci --legacy-peer-deps
npm run dev
```
*Giao diện Frontend sẵn sàng tại `http://localhost:5173`.*

---

## 🧪 Kiểm Thử Tự Động (Testing)

Dự án duy trì bộ kiểm thử tự động toàn diện, được chạy tự động trong CI/CD trước mỗi lần triển khai:

* **Backend Tests (JUnit 5 + Mockito + H2 In-Memory DB):**
  ```bash
  cd backend && ./mvnw test
  ```
* **Frontend Tests (Vitest + React Testing Library):**
  ```bash
  cd frontend && npm test
  ```

---

## 🐳 Hạ Tầng CI/CD & Vận Hành VPS

Dự án thiết lập pipeline tự động hóa hoàn toàn qua **GitHub Actions** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):

```
[Git Push lên main] ──► [Chạy 273 Backend Tests] ──┐
                    ──► [Chạy 162 Frontend Tests] ──┴──► [PASS 100% Tests?]
                                                                   │
                                                                   ▼
                                                   [Build Docker Images & Push GHCR]
                                                                   │
                                                                   ▼
                                                   [SSH Deploy lên AWS VPS Ubuntu]
                                                   • Pull Docker Images mới
                                                   • Recreate Containers
                                                   • Auto Schema Migration
                                                   • Health Check liên tục 60s
                                                   • Downtime hoàn tất < 45 giây
```

Chi tiết các kịch bản vận hành máy chủ, giám sát Docker và khôi phục sự cố được mô tả đầy đủ trong [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 🔐 Tài Khoản Trải Nghiệm Mẫu

Hệ thống được khởi tạo sẵn các tài khoản mẫu thông qua `DataSeeder` đại diện cho các vai trò vận hành:

| Tài khoản (Username) | Mật khẩu mặc định | Vai trò (Role) | Chức danh hiển thị |
| :--- | :--- | :--- | :--- |
| `owner` / `admin` | `admin123` | **OWNER** / **ADMIN** | Chủ cơ sở / Quản trị viên |
| `accountant` | `acc123` | **ACCOUNTANT** | Kế toán trưởng |
| `receptionist` | `rec123` | **RECEPTIONIST** | Nhân viên lễ tân |
| `housekeeper` | `hk123` | **HOUSEKEEPER** | Nhân viên buồng phòng |

---

<p align="center">
  <strong>Lưu Trú Số (Smart PMS Architecture)</strong> &nbsp;·&nbsp; Enterprise Engineering Standards &nbsp;·&nbsp; 2026
</p>
