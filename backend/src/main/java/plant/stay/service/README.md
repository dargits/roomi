# 💼 Gói Xử Lý Nghiệp Vụ Chính (`plant.stay.service`)

<p align="center">
  <img src="https://img.shields.io/badge/Services-34_Interfaces-3B82F6?style=for-the-badge&logo=spring&logoColor=white" />
  <img src="https://img.shields.io/badge/Transactions-Atomic_Transactional-10B981?style=for-the-badge&logo=apache&logoColor=white" />
  <img src="https://img.shields.io/badge/Integrations-Email_OTA_Cloudinary-8B5CF6?style=for-the-badge&logo=fastapi&logoColor=white" />
</p>

> Thư mục `service/` và `service/impl/` chứa toàn bộ các dịch vụ xử lý logic nghiệp vụ cốt lõi của StayAway PMS, quản lý giao dịch an toàn với `@Transactional`, tích hợp các dịch vụ bên ngoài (Email, Cloudinary, AI) và đảm bảo tính toàn vẹn dữ liệu.

---

## 📑 Mục Lục

1. [🏨 1. Quản Lý Đặt Phòng & Khách Hàng](#-1-quản-lý-đặt-phòng--khách-hàng)
2. [🔄 2. Quản Lý Kênh OTA (Channel Manager)](#-2-quản-lý-kênh-ota-channel-manager)
3. [💳 3. Tài Chính, Hóa Đơn & Sổ Quỹ](#-3-tài-chính-hóa-đơn--sổ-quỹ)
4. [🧹 4. Buồng Phòng & Kho Vật Tư](#-4-buồng-phòng--kho-vật-tư)
5. [📧 5. Thông Báo, Email & Kiểm Toán](#-5-thông-báo-email--kiểm-toán)

---

## 🏨 1. Quản Lý Đặt Phòng & Khách Hàng
* **`BookingService` & [`BookingServiceImpl.java`](./impl/BookingServiceImpl.java):** Xử lý đặt phòng lẻ, check-in, check-out, đổi phòng, hủy phòng, tính tiền quá giờ.
* **`GroupBookingService`:** Quản lý đặt phòng theo đoàn, áp dụng chính sách chiết khấu và cọc đoàn.
* **`PricingService`:** Thuật toán tính giá phòng linh hoạt: Giá gốc + Giá cuối tuần + Giá mùa vụ + Giá ngày lễ + Phụ thu thêm người.
* **`GuestService` & `InHouseGuestService`:** Hồ sơ khách hàng, lịch sử lưu trú và bộ lọc khách đang ở.
* **`LegacyBookingImportService`:** Nhập dữ liệu đặt phòng cũ với cơ chế Preview Validation và Atomic Transaction.

---

## 🔄 2. Quản Lý Kênh OTA (Channel Manager)
* **`ChannelCalendarSyncService` & [`ChannelCalendarSyncServiceImpl.java`](./impl/ChannelCalendarSyncServiceImpl.java):**
  * Tải và phân tích cú pháp iCal (`.ics`) từ Airbnb, Booking.com, Agoda.
  * Tự động phát hiện và cảnh báo trùng phòng (**Overbooking Detection**).
  * Khóa dải ngày phòng và ghi log lịch sử đồng bộ.

---

## 💳 3. Tài Chính, Hóa Đơn & Sổ Quỹ
* **`InvoiceService` & [`InvoiceServiceImpl.java`](./impl/InvoiceServiceImpl.java):** Tạo hóa đơn, ghi nhận thanh toán, quyết toán chiết khấu và hủy hóa đơn nháp có lý do.
* **`DailyLedgerService` & `CashierShiftService`:** Đối soát và chốt sổ quỹ theo ngày, quản lý bàn giao ca thu ngân.
* **`DebtApprovalService`:** Quản lý và phê duyệt hạn mức công nợ khách hàng doanh nghiệp.

---

## 🧹 4. Buồng Phòng & Kho Vật Tư
* **`RoomService`:** Quản lý trạng thái phòng (Sạch / Cần dọn / Đang dọn / Chờ duyệt / Bảo trì) và thuật toán phân công dọn phòng chống chồng chéo.
* **`LostItemService`:** Quy trình tiếp nhận, lưu kho và bàn giao đồ thất lạc của khách.

---

## 📧 5. Thông Báo, Email & Kiểm Toán
* **`EmailService`:** Gửi email xác nhận đặt phòng, email nhắc check-in, email nhắc nợ kèm kiểm soát chống spam (Cooldown 60s / Quota 5 lượt).
* **`NotificationService`:** Bắn thông báo thời gian thực lên chuông thông báo giao diện Lễ tân.
* **`AuditLogService`:** Ghi vết kiểm toán mọi thao tác thay đổi dữ liệu của người dùng.
