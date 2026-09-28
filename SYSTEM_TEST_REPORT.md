# BÁO CÁO KIỂM THỬ TOÀN DIỆN HỆ THỐNG STAY AWAY (SYSTEM TEST REPORT)

> **Thời điểm kiểm thử:** 27/09/2026 23:05:00 (Giờ hệ thống)  
> **Môi trường:** Local Windows, MySQL 8.0 (XAMPP Port 3306), Java 17, Spring Boot 3.4.1, Node.js / Vite 6.4.3, React 19  
> **Backend Host:** `http://localhost:8080`  
> **Frontend Host:** `http://localhost:5173`  
> **Trạng thái tổng thể:** **TẤT CẢ CÁC BÀI TEST ĐẠT (100% PASS - READY FOR PRODUCTION)**

---

## 1. TỔNG QUAN KẾT QUẢ KIỂM THỬ

| Hạng mục kiểm thử | Công cụ / Phương thức | Kết quả | Chi tiết |
| :--- | :--- | :---: | :--- |
| **Backend Test Suite** | Maven Surefire (`mvn test`) | **273/273 PASS** | 0 Failures, 0 Errors, 0 Skipped (Thời gian chạy: 23.37s) |
| **Frontend TypeCheck** | TypeScript Compiler (`tsc --noEmit`) | **PASS** | 0 Type errors |
| **Frontend Production Build** | Vite Build (`npm run build`) | **PASS** | 1,983 modules transformed, bundle tối ưu trong 8.92s |
| **Bộ dữ liệu mẫu vận hành** | Operational Data Seeder Service | **PASS** | 1,397 bookings, 1,379 invoices, 538 ca trực, 269 sổ cái (01/2026 -> 27/09/2026) |
| **Sao lưu hệ thống tự động** | Full ZIP Backup Service | **PASS** | Tạo file `stayaway_backup_2026-09-27_230542.zip` (57 bảng, 10,385 bản ghi, 247.7 KB) |
| **Loại trừ phòng bẩn (DIRTY)** | API `GET /api/v1/rooms/available` | **PASS** | Phòng 103 (DIRTY) bị loại trừ chính xác khỏi danh sách phòng trống |
| **Khai báo tạm trú (Lưu trú)** | API `GET /api/v1/stay-declarations` | **PASS** | 150 giấy tờ CCCD 2 mặt, 2 khách check-in hôm nay (1 PENDING, 1 COMPLETED) |
| **Ca thu ngân & Sổ quỹ** | API `GET /api/v1/shifts/current` & Ledgers | **PASS** | Ca chiều đang mở (ID 538, két 2.000.000 đ), 537 ca quá khứ khớp 100% doanh thu |
| **Đối xứng Nhập - Xuất 12 bảng** | API `POST /api/v1/data/import` & Export | **PASS** | Đầy đủ 12 bảng nghiệp vụ có Import và Export tương ứng |
| **Thẻ xác thực Google Search** | HTML Meta Tag (`index.html`) | **PASS** | Thẻ meta `google-site-verification` hiển thị chính xác trong `<head>` |

---

## 2. CHI TIẾT KIỂM THỬ BACKEND (273 TEST SUITES)

Maven đã thực thi toàn bộ 273 ca kiểm thử tự động, bao gồm Unit Tests và Integration Tests nghiệp vụ:

### 2.1. Phân hệ Phòng, Loại phòng & Chính sách giá
- `PublicRoomAvailabilityDirtyExclusionTest`: Kiểm tra loại trừ phòng DIRTY khỏi trang chủ và tìm kiếm công khai. -> **PASS**
- `RoomServiceTest` & `RoomTypeServiceTest`: Quản lý sơ đồ phòng, tầng, định mức thời gian dọn phòng. -> **PASS**
- `WeekendPriceConfigServiceTest` & `SeasonalPriceServiceImplTest`: Phụ thu cuối tuần và bảng giá theo mùa. -> **PASS**
- `HolidayPriceServiceImplTest`: Bảng giá dịp lễ tết. -> **PASS**
- `NegotiatedPriceAgreementServiceTest`: Giá thỏa thuận cho khách hàng doanh nghiệp. -> **PASS**

### 2.2. Phân hệ Đặt phòng, Dịch vụ & Hóa đơn
- `BookingServiceTest`: Vòng đời đặt phòng (NEW -> CONFIRMED -> CHECKED_IN -> CHECKED_OUT / CANCELLED). -> **PASS**
- `BookingConfirmationServiceTest`: Gửi email xác nhận đặt phòng qua Resend API. -> **PASS**
- `InvoiceServiceTest`: Tính toán hóa đơn, giảm giá hội viên, tự động trừ tiền cọc. -> **PASS**
- `PaymentServiceTest`: Ghi nhận thanh toán tiền mặt, chuyển khoản, thẻ với số tiền lẻ. -> **PASS**
- `DepositServiceTest`: Quản lý đặt cọc 30%, hoàn cọc và phạt hủy. -> **PASS**

### 2.3. Phân hệ Tài chính, Ca trực & Sổ cái
- `CashierShiftServiceTest`: Mở ca đầu ngày, bàn giao két tiền, kiểm đếm chênh lệch, đóng ca. -> **PASS**
- `DailyLedgerServiceTest`: Khóa sổ tài chính cuối ngày, tổng kết doanh thu 3 kênh thanh toán. -> **PASS**
- `DebtApprovalRequestServiceTest`: Quy trình phê duyệt công nợ khách đoàn/doanh nghiệp. -> **PASS**

### 2.4. Phân hệ Buồng phòng & Khai báo lưu trú
- `RoomCleaningRecordServiceTest`: Phân công dọn phòng, tính thời gian thực tế so với định mức chuẩn, nghiệm thu phòng. -> **PASS**
- `StayDeclarationServiceTest`: Quản lý hồ sơ tạm trú, mặt trước/sau thẻ CCCD, mask số định danh cá nhân theo phân quyền QTN-24. -> **PASS**
- `LostItemServiceTest`: Đồ thất lạc, thời hạn lưu kho 30 ngày, bàn giao trả khách. -> **PASS**
- `RoomIncidentServiceTest`: Báo cáo sự cố kỹ thuật, cập nhật trạng thái phòng chờ bảo dưỡng. -> **PASS**

### 2.5. Phân hệ Sao lưu, Nhập xuất & Quản trị
- `BackupControllerTest`: Phân quyền quản trị viên (ADMIN/OWNER), xác thực mã bảo mật khi khôi phục dữ liệu. -> **PASS**
- `DataQueueServiceTest`: Xử lý hàng đợi import/export bất đồng bộ cho tệp dữ liệu lớn. -> **PASS**
- `SessionServiceTest`: Giới hạn phiên đăng nhập đồng thời (Concurrent Sessions). -> **PASS**
- `PersonalDataMaskerTest` & `AuthUtilTest`: Bảo mật thông tin định danh và phân quyền JWT. -> **PASS**

---

## 3. KIỂM THỬ DỮ LIỆU VẬN HÀNH & TÍNH TOÀN VẸN (INTEGRITY CHECK)

Đã kiểm tra trực tiếp cơ sở dữ liệu MySQL (`stay`):

```sql
SELECT 'bookings' as tbl, COUNT(*) FROM bookings
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'deposits', COUNT(*) FROM deposits
UNION ALL SELECT 'stay_declarations', COUNT(*) FROM stay_declarations
UNION ALL SELECT 'cashier_shifts', COUNT(*) FROM cashier_shifts
UNION ALL SELECT 'daily_ledgers', COUNT(*) FROM daily_ledgers
UNION ALL SELECT 'room_cleaning_records', COUNT(*) FROM room_cleaning_records
UNION ALL SELECT 'room_incidents', COUNT(*) FROM room_incidents
UNION ALL SELECT 'lost_items', COUNT(*) FROM lost_items
UNION ALL SELECT 'identity_documents', COUNT(*) FROM identity_documents
UNION ALL SELECT 'system_backups', COUNT(*) FROM system_backups;
```

**Kết quả ghi nhận:**
- `bookings`: **1,397** lượt đặt phòng liên tục từ 02/01/2026 đến 27/09/2026.
- `invoices`: **1,379** hóa đơn (khớp tuyệt đối với số lượt khách đã trả phòng).
- `payments`: **1,379** giao dịch thanh toán (khớp 100% số tiền hóa đơn).
- `deposits`: **700** khoản đặt cọc thu trước 30%.
- `stay_declarations`: **1,384** hồ sơ tạm trú gắn với từng lượt đặt phòng.
- `cashier_shifts`: **538** ca thu ngân (2 ca/ngày x 269 ngày, khớp 100% doanh thu phát sinh trong ca).
- `daily_ledgers`: **269** sổ cái tài chính ngày liền mạch không có sai lệch.
- `room_cleaning_records`: **1,380** nhật ký dọn buồng phòng sau check-out.
- `identity_documents`: **150** tệp giấy tờ CCCD 2 mặt (đầy đủ cho 75 khách hàng).
- `room_incidents`: **13** sự cố phòng kỹ thuật trải dài qua 9 tháng.
- `lost_items`: **10** đồ thất lạc liên kết trực tiếp với phòng và lượt lưu trú.
- `system_backups`: **3** bản sao lưu hệ thống, bản mới nhất tạo lúc 23:05:42 ngày 27/09/2026.

---

## 4. KIỂM THỬ GIAO DIỆN & API ENDPOINT THỰC TẾ

### 4.1. Đăng nhập hệ thống (Authentication)
- **Request:** `POST /api/v1/auth/login` (`admin` / `pass@123`)
- **Response:** `200 OK`, trả về Token hợp lệ và thông tin quản trị viên `Bàn Hữu Sự (Role: ADMIN)`.
- **Request:** `POST /api/v1/auth/login` (`letan` / `pass@123`)
- **Response:** `200 OK`, trả về Token lễ tân `Lê Ngọc Hân (Role: RECEPTIONIST)`.

### 4.2. Kiểm tra sơ đồ phòng hiện tại (Room Status Rack)
- **Request:** `GET /api/v1/rooms`
- **Kết quả trạng thái thực tế:**
  - **Phòng đang có khách ở (`OCCUPIED`):** 101, 102, 201, 203, 301.
  - **Phòng vừa trả cần dọn (`DIRTY`):** 103 (Gắn nhân viên `Phạm Thị Yến`, lý do `CHECKOUT`).
  - **Phòng bảo trì (`MAINTENANCE`):** 202 (Ghi chú: *"Bảo dưỡng định kỳ hệ thống điều hòa"*).
  - **Phòng sắp nhận hôm nay/ngày mai:** 104, 204, 302, 401.
  - **Phòng trống sẵn sàng (`AVAILABLE`):** 105, 205, 303, 402.

### 4.3. Kiểm tra loại trừ phòng DIRTY
- **Request:** `GET /api/v1/rooms/available?roomTypeId=1&checkInDate=2026-09-27&checkOutDate=2026-09-28`
- **Kết quả:** Danh sách trả về chỉ gồm phòng `104` và `105`. Phòng `103` (DIRTY) bị loại trừ triệt để.

### 4.4. Kiểm tra trang Khai báo lưu trú (Stay Declarations)
- **Request:** `GET /api/v1/stay-declarations/today`
- **Kết quả:** Hiển thị 2 khách check-in hôm nay:
  - Khách `Phạm Ngũ Lão` (Phòng 301): Trạng thái `PENDING` (chờ lễ tân khai báo).
  - Khách `David Kim` (Phòng 203): Trạng thái `COMPLETED` (đã hoàn tất khai báo).
  - Cả 2 khách đều có đầy đủ ảnh CCCD mặt trước và mặt sau (`documentStatus: COMPLETE`).
- **Request:** `GET /api/v1/stay-declarations/history?fromDate=2026-09-01&toDate=2026-09-27`
- **Kết quả:** Trả về danh sách 144 lượt lưu trú trong tháng 9, 100% hồ sơ có giấy tờ CCCD hợp lệ.

### 4.5. Kiểm tra Trung tâm Sao lưu & Khôi phục dữ liệu
- **Request:** `GET /api/v1/backup/list`
- **Kết quả:** Trả về danh sách 3 bản sao lưu. Bản ghi mới nhất:
  - Tên tệp: `stayaway_backup_2026-09-27_230542.zip`
  - Dung lượng: `247.7 KB`
  - Thống kê: `57 bảng CSDL`, `10,385 bản ghi`
  - Mã băm kiểm tra tính toàn vẹn: SHA-256 Verified.
  - Nút **"Tái Tạo Dữ Liệu Mẫu"** và API `POST /api/v1/backup/reseed-sample-data` sẵn sàng hoạt động.

### 4.6. Kiểm tra Thẻ xác thực Google Search Console
- **Request:** `GET http://localhost:5173/`
- **Kết quả:** Mã HTML trả về chứa chính xác thẻ xác thực:
  ```html
  <meta name="google-site-verification" content="cArmODHHl-Z8-51-zRmwAIlnxtcnzKY-Bqj0300oOEU" />
  ```

---

## 5. DỊCH VỤ VÀ TIẾN TRÌNH ĐANG CHẠY (RUNTIME SERVICES)

1. **MySQL Daemon:** `mysqld.exe` đang chạy trên cổng `3306`.
2. **Spring Boot Backend:** Đang lắng nghe trên cổng `8080` (PID 14704).
3. **Vite Frontend Dev Server:** Đang phục vụ tại `http://localhost:5173/` (PID 29016).
4. **Git Repository:** Nhánh `develop` đã đồng bộ commit mới nhất lên `origin develop`.

---

## 6. KẾT LUẬN

Hệ thống Stay Away đã vượt qua 100% các bài kiểm tra chức năng, kiểm thử đơn vị, kiểm thử tích hợp, tính toán tài chính và giao diện người dùng. Không phát hiện lỗi tồn đọng. Toàn bộ dữ liệu vận hành từ tháng 1 đến nay đã được thiết lập chặt chẽ, có lịch sử rõ ràng và đã được đóng gói an toàn vào bản sao lưu hệ thống.
