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

## 2. CHI TIẾT CÁC TÍNH NĂNG NGHIỆP VỤ ĐÃ TRIỂN KHAI

### 2.1. Quản lý Đặt phòng & Vòng đời Khách lưu trú
* **Đặt phòng đơn & Đặt phòng đoàn (Group Booking):** Kiểm tra xung đột lịch thời gian thực.
* **Vòng đời:** `PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `CHECKED_IN` $\rightarrow$ `CHECKED_OUT` $\rightarrow$ `CANCELLED`.
* **Quét CCCD gắn chip & Data Masking:** Bóc tách mã QR tự động và che mờ thông tin nhạy cảm.
* **Import đặt phòng lịch sử (Excel/CSV):** Preview Validation và Atomic Transaction Commit.
* **Đồ thất lạc (Lost & Found):** Tiếp nhận, lưu kho và bàn giao đồ khách để quên.

### 2.2. Cổng Khách Hàng Tự Phục Vụ (Public Portal)
* **Tra cứu & Tự hủy yêu cầu đặt phòng (CLTSN3-439):** Khách tự tra cứu và hủy đơn `PENDING` bằng Mã + SĐT.
* **Tra cứu hóa đơn trực tuyến (NCL-09-CN-008):** Xem chi tiết tiền phòng và thanh toán (bật/tắt theo cài đặt).

### 2.3. Email Tự Động & Chống Spam
* Gửi Email HTML xác nhận đặt phòng kèm mã QR check-in.
* **Chống spam:** Cooldown 60 giây, Quota 5 lượt/ngày/booking, hiển thị thời gian gửi gần nhất.
* Tự động nhắc nhận phòng, nhắc nợ và cấp lại mật khẩu qua Token một lần.

### 2.4. Kênh Đồng Bộ OTA & Cảnh Báo Trùng Phòng (Channel Manager)
* Đồng bộ 2 chiều qua iCal với Airbnb, Booking.com, Agoda.
* Phát hiện và cảnh báo Overbooking (`CLTSN3-399`) cho Lễ tân.
* Ghi nhật ký đồng bộ (`Sync Logs`) và cảnh báo mất kết nối.

### 2.5. Tài Chính, Hóa Đơn & Sổ Quỹ
* Cọc linh hoạt (30%, theo hạng phòng, hoàn/phạt cọc).
* Thỏa thuận giá riêng (`Price Deal`) cho khách đoàn.
* Hủy hóa đơn nháp có lưu lý do và Audit Log.
* Chốt sổ quỹ theo ngày (`Daily Cash Ledger`), phân tách Tiền mặt / Chuyển khoản / QR.

### 2.6. Buồng Phòng Thông Minh (Housekeeping)
* Sơ đồ ma trận phòng theo màu trạng thái (Sạch / Có khách / Cần dọn / Chờ duyệt / Bảo trì).
* Phân công cân bằng tải theo độ ưu tiên khách kế tiếp.
* Nghiệm thu phòng sạch 2 bước (Gửi duyệt $\rightarrow$ Nghiệm thu).
* Lịch dọn định kỳ phòng trống dài ngày.

### 2.7. Báo Cáo & Phân Tích Chỉ Số Khách Sạn
* Chỉ số quốc tế: **ADR**, **RevPAR**, **Occupancy Rate**.
* So sánh đa kỳ PoP & YoY (`CLTSN3-431`) kèm xuất CSV.
* Trợ lý gợi ý giá phòng thông minh bằng AI.

---

## 3. QUY TRÌNH & LUỒNG HOẠT ĐỘNG BACKEND

1. **Web Filter & CORS:** Xác thực nguồn gửi và kiểm tra JWT.
2. **REST Controller:** Validate DTO qua Jakarta Validation (`@Valid`).
3. **Service Layer:** Xử lý nghiệp vụ an toàn với `@Transactional`.
4. **Data Access (JPA):** Truy vấn CSDL MySQL tối ưu và chuyển DTO.
5. **Data Masking Advice:** Tự động che mờ CCCD / SĐT trước khi trả về.
6. **Global Exception Handling:** Chuẩn hóa toàn bộ mã lỗi trả về cho Client.

### Danh mục Background Schedulers:
* `ChannelCalendarScheduler`: Đồng bộ lịch OTA định kỳ (30-60 phút).
* `CheckInReminderScheduler`: Gửi email nhắc nhận phòng hàng ngày (08:00 AM).
* `DebtReminderScheduler`: Cảnh báo công nợ định kỳ.
* `PeriodicCleaningScheduler`: Lập lịch dọn phòng trống dài ngày (06:00 AM).
* `StayDeclarationScheduler`: Tổng hợp danh sách khai báo tạm trú (22:00 PM).

---

## 4. QUY TRÌNH CI/CD & ZERO-DOWNTIME DEPLOYMENT

* **Job 1 (Backend CI):** 29 bài kiểm thử JUnit 5 + Mockito + H2 In-Memory DB.
* **Job 2 (Frontend CI):** 14 bài Vitest + Kiểm tra build production bundle.
* **Job 3 (Build & Push):** Đóng gói Multi-Stage Dockerfile, cache layer, đẩy lên `ghcr.io`.
* **Job 4 (Deploy VPS):** SSH tự động vào AWS EC2, pull image, start container, Health Check loop 60s, downtime < 45s.

---

## 5. PHÂN QUYỀN VAI TRÒ (RBAC)

| Vai trò | Tài khoản mặc định | Quyền hạn chính |
| :--- | :--- | :--- |
| **ADMIN** | `admin` / `admin123` | Toàn quyền quản trị, cấu hình giá, nhân sự, báo cáo tài chính, chốt sổ quỹ |
| **RECEPTIONIST** | `receptionist` / `rec123` | Đặt phòng, check-in/out, thu cọc, lập hóa đơn, quét CCCD, cảnh báo OTA |
| **HOUSEKEEPER** | `housekeeper` / `hk123` | Xem danh sách phòng được giao, cập nhật tiến độ dọn phòng, gửi nghiệm thu |
