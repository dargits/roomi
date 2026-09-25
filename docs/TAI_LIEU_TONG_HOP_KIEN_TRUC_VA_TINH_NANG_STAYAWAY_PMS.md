# 📄 Báo Cáo Tổng Hợp Kiến Trúc & Tính Năng Hệ Thống StayAway PMS

> **Phiên bản:** 2.5.0 (Enterprise Production)  
> **Nền tảng:** Spring Boot 3 · Java 17 · React 18 · MySQL 8 · Docker · GitHub Actions CI/CD  
> **Production URL:** [https://stayaway.io.vn](https://stayaway.io.vn)

---

## 1. TỔNG QUAN HỆ THỐNG & KIẾN TRÚC KỸ THUẬT

### 1.1. Giới thiệu dự án
**StayAway (StayGo PMS)** là phần mềm quản lý khách sạn và homestay toàn diện, tối ưu hóa toàn bộ hoạt động vận hành: từ đặt phòng đơn/đoàn, check-in/out bằng mã CCCD, đặt cọc, tính giá mùa vụ linh hoạt, buồng phòng 2 bước, đồng bộ kênh OTA hai chiều (Airbnb, Agoda, Booking.com), đến quyết toán hóa đơn, chốt sổ quỹ ngày và phân tích tài chính chuyên sâu (ADR, RevPAR, PoP, YoY).

### 1.2. Bảng phân tầng công nghệ

| Thành phần | Công nghệ | Vai trò & Trách nhiệm |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite 6, TailwindCSS, Vitest | SPA Client, Design System, Chatbot AI, Global Error Boundary |
| **Backend** | Spring Boot 3, Java 17, Spring Data JPA, Hibernate | 27 REST Controllers, 39 Entities, 5 Schedulers, Audit Log |
| **Database** | MySQL 8.0 Engine (InnoDB) | Lưu trữ quan hệ, UTF8MB4 hỗ trợ tiếng Việt có dấu |
| **Cloud Services** | Cloudinary CDN, Gmail SMTP | Lưu trữ ảnh CDN, Gửi email tự động |
| **DevOps / CI/CD** | GitHub Actions, GHCR.io, Docker Compose, AWS EC2 | Auto test 43 tests, Build Docker, Deploy VPS < 45s |

---

## 2. LUỒNG NGHIỆP VỤ & HOẠT ĐỘNG TOÀN HỆ THỐNG (END-TO-END WORKFLOW)

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
          │   • Khách thanh toán: Tiền mặt / Chuyển khoản / QR Code
          │   • Hóa đơn chuyển trạng thái: PAID
          │   • Trạng thái phòng chuyển sang: DIRTY (Cần dọn dẹp)
          │                                    │
          ▼                                    ▼
[Bộ phận Buồng phòng] ◄────────────────────────┘
          │
          ├── Phân công dọn dẹp theo mức độ ưu tiên khách kế tiếp
          ├── Nhân viên tiến hành dọn phòng (Room: IN_PROGRESS)
          ├── Dọn xong bấm Gửi duyệt (Room: INSPECTING)
          └── Quản lý nghiệm thu ĐẠT ──► [Room: CLEAN (Sẵn sàng bán phòng)]
          │
          ▼
[Cuối ngày làm việc]
          ├── Lễ tân / Thu ngân thực hiện "Chốt sổ quỹ ngày" (Daily Cash Ledger)
          ├── Đối soát dòng tiền Tiền mặt / Ngân hàng / QR
          └── Quản lý khóa sổ quỹ ──► [Dữ liệu tự động đẩy vào Báo cáo doanh thu & ADR/RevPAR]
```

### Các Tiến Trình Nền Tự Động (Background Schedulers)
1. **`ChannelCalendarScheduler` (Mỗi 30-60 phút):** Đồng bộ lịch iCal từ Airbnb/Agoda, phát hiện xung đột và khóa phòng.
2. **`CheckInReminderScheduler` (08:00 AM hàng ngày):** Gửi email nhắc nhở nhận phòng cho khách.
3. **`PeriodicCleaningScheduler` (06:00 AM hàng ngày):** Tự động lập lịch dọn dẹp cho phòng trống quá N ngày.
4. **`StayDeclarationScheduler` (22:00 PM hàng ngày):** Kết xuất danh sách khách lưu trú để khai báo tạm trú.
5. **`DebtReminderScheduler` (Hàng tuần):** Quét các khoản công nợ quá hạn và gửi thông báo nhắc nợ.

---

## 3. MẪU LUỒNG BACKEND DÙNG CHUNG CHO MỌI MODULE (GENERIC BACKEND TEMPLATE)

Toàn bộ các module trong hệ thống (Booking, Invoice, Room, Channel, Guest, ExtraService, Auth...) đều áp dụng cấu trúc 6 bước chuẩn mực:

```
[ HTTP Request: GET / POST / PUT / DELETE ]
                    │
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 1: TẦNG FILTER & BẢO MẬT (Security & Filter Chain)                │
│ • Kiểm tra CORS (WebCorsConfig)                                        │
│ • Xác thực JWT Token & Lấy phiên người dùng hiện tại (AuthUtil)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 2: TẦNG CONTROLLER & VALIDATION (REST Controller)                 │
│ • Bóc tách @PathVariable, @RequestParam, @RequestBody                  │
│ • Thực thi Validation dữ liệu đầu vào (@Valid, @NotNull, @Pattern)     │
│ • Điều hướng gọi Service tương ứng (Controller không chứa logic nặng)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 3: TẦNG SERVICE & QUẢN LÝ GIAO DỊCH (@Transactional Service)       │
│ • Kiểm tra điều kiện nghiệp vụ (Business Invariants & Permissions)     │
│ • Kiểm tra xung đột & tính toán giá (Domain Calculations)              │
│ • Ghi nhận Side Effects: AuditLogService, Notification, EmailService   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 4: TẦNG TRUY XUẤT CSDL (Spring Data JPA Repositories)             │
│ • Thực thi Derived Queries hoặc JPQL Custom Queries tối ưu             │
│ • Ánh xạ CSDL MySQL sang JPA Entities và chuyển đổi sang Response DTO  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 5: TẦNG BẢO VỆ DỮ LIỆU NHẠY CẢM (Data Masking Advice)             │
│ • PersonalDataMaskingResponseAdvice tự động che mờ CCCD / SĐT          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BƯỚC 6: XỬ LÝ LỖI TOÀN CỤC (GlobalExceptionHandler - @RestControllerAdvice)
│ • Nếu có lỗi ở bất kỳ bước nào: Bắt ngoại lệ & trả về JSON chuẩn       │
│   { "status": 400, "message": "Chi tiết lỗi", "timestamp": "..." }     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. CHI TIẾT CÁC TÍNH NĂNG NGHIỆP VỤ ĐÃ TRIỂN KHAI

### 4.1. Quản lý Đặt phòng & Vòng đời Khách lưu trú
* **Đặt phòng đơn & Đặt phòng đoàn (Group Booking):** Kiểm tra xung đột lịch thời gian thực.
* **Vòng đời:** `PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `CHECKED_IN` $\rightarrow$ `CHECKED_OUT` $\rightarrow$ `CANCELLED`.
* **Quét CCCD gắn chip & Data Masking:** Bóc tách mã QR tự động và che mờ thông tin nhạy cảm.
* **Import đặt phòng lịch sử (Excel/CSV):** Preview Validation và Atomic Transaction Commit.
* **Đồ thất lạc (Lost & Found):** Tiếp nhận, lưu kho và bàn giao đồ khách để quên.

### 4.2. Cổng Khách Hàng Tự Phục Vụ (Public Portal)
* **Tra cứu & Tự hủy yêu cầu đặt phòng (CLTSN3-439):** Khách tự tra cứu và hủy đơn `PENDING` bằng Mã + SĐT.
* **Tra cứu hóa đơn trực tuyến (NCL-09-CN-008):** Xem chi tiết tiền phòng và thanh toán (bật/tắt theo cài đặt).

### 4.3. Email Tự Động & Chống Spam
* Gửi Email HTML xác nhận đặt phòng kèm mã QR check-in.
* **Chống spam:** Cooldown 60 giây, Quota 5 lượt/ngày/booking, hiển thị thời gian gửi gần nhất.
* Tự động nhắc nhận phòng, nhắc nợ và cấp lại mật khẩu qua Token một lần.

### 4.4. Kênh Đồng Bộ OTA & Cảnh Báo Trùng Phòng (Channel Manager)
* Đồng bộ 2 chiều qua iCal với Airbnb, Booking.com, Agoda.
* Phát hiện và cảnh báo Overbooking (`CLTSN3-399`) cho Lễ tân.
* Ghi nhật ký đồng bộ (`Sync Logs`) và cảnh báo mất kết nối.

### 4.5. Tài Chính, Hóa Đơn & Sổ Quỹ
* Cọc linh hoạt (30%, theo hạng phòng, hoàn/phạt cọc).
* Thỏa thuận giá riêng (`Price Deal`) cho khách đoàn.
* Hủy hóa đơn nháp có lưu lý do và Audit Log.
* Chốt sổ quỹ theo ngày (`Daily Cash Ledger`), phân tách Tiền mặt / Chuyển khoản / QR.

### 4.6. Buồng Phòng Thông Minh (Housekeeping)
* Sơ đồ ma trận phòng theo màu trạng thái (Sạch / Có khách / Cần dọn / Chờ duyệt / Bảo trì).
* Phân công cân bằng tải theo độ ưu tiên khách kế tiếp.
* Nghiệm thu phòng sạch 2 bước (Gửi duyệt $\rightarrow$ Nghiệm thu).
* Lịch dọn định kỳ phòng trống dài ngày.

### 4.7. Báo Cáo & Phân Tích Chỉ Số Khách Sạn
* Chỉ số quốc tế: **ADR**, **RevPAR**, **Occupancy Rate**.
* So sánh đa kỳ PoP & YoY (`CLTSN3-431`) kèm xuất CSV.
* Trợ lý gợi ý giá phòng thông minh bằng AI.

---

## 5. QUY TRÌNH CI/CD & ZERO-DOWNTIME DEPLOYMENT

* **Job 1 (Backend CI):** 29 bài kiểm thử JUnit 5 + Mockito + H2 In-Memory DB.
* **Job 2 (Frontend CI):** 14 bài Vitest + Kiểm tra build production bundle.
* **Job 3 (Build & Push):** Đóng gói Multi-Stage Dockerfile, cache layer, đẩy lên `ghcr.io`.
* **Job 4 (Deploy VPS):** SSH tự động vào AWS EC2, pull image, start container, Health Check loop 60s, downtime < 45s.

---

## 6. PHÂN QUYỀN VAI TRÒ (RBAC)

| Vai trò | Tài khoản mặc định | Quyền hạn chính |
| :--- | :--- | :--- |
| **ADMIN** | `admin` / `admin123` | Toàn quyền quản trị, cấu hình giá, nhân sự, báo cáo tài chính, chốt sổ quỹ |
| **RECEPTIONIST** | `receptionist` / `rec123` | Đặt phòng, check-in/out, thu cọc, lập hóa đơn, quét CCCD, cảnh báo OTA |
| **HOUSEKEEPER** | `housekeeper` / `hk123` | Xem danh sách phòng được giao, cập nhật tiến độ dọn phòng, gửi nghiệm thu |
