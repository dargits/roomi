# 🗄️ Gói Mô Hình Thực Thể & CSDL (`plant.stay.model`)

Thư mục `model/` chứa 39 JPA Entities và các Enums tương ứng đại diện cho toàn bộ lược đồ cơ sở dữ liệu (Database Schema) của hệ thống StayAway PMS.

---

## 🏛️ Sơ Đồ Thực Thể Chính & Mối Quan Hệ (Entity Relationships)

```
             ┌─────────────────┐
             │      Guest      │
             └────────┬────────┘
                      │ 1:N
                      ▼
┌──────────┐ 1:N ┌─────────────────┐ 1:1 ┌─────────────────┐
│ RoomType ├────►│     Booking     ├────►│     Invoice     │
└────┬─────┘     └────────┬────────┘     └────────┬────────┘
     │ 1:N                │ 1:N                   │ 1:N
     ▼                    ▼                       ▼
┌──────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Room   │     │BookingServiceUsg│     │     Payment     │
└──────────┘     └─────────────────┘     └─────────────────┘
```

---

## 🗂️ Phân Nhóm Thực Thể Cốt Lõi

### 1. 🏨 Nghiệp Vụ Đặt Phòng & Khách Hàng
* **[`Booking.java`](./Booking.java) & [`BookingStatus.java`](./BookingStatus.java):** Trạng thái đặt phòng (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`).
* **[`Guest.java`](./Guest.java), [`RoomStayGuest.java`](./RoomStayGuest.java), [`IdentityDocument.java`](./IdentityDocument.java):** Thông tin khách đại diện, khách cùng phòng và giấy tờ tùy thân (CCCD/Hộ chiếu).
* **[`GroupBooking.java`](./GroupBooking.java), [`BookingRequest.java`](./BookingRequest.java):** Đặt phòng đoàn và yêu cầu đặt phòng trực tuyến từ khách.

### 2. 🛏️ Cơ Sở Vật Chất, Phòng & Buồng Phòng
* **[`Room.java`](./Room.java), [`RoomType.java`](./RoomType.java) & [`RoomStatus.java`](./RoomStatus.java):** Trạng thái phòng (`CLEAN`, `DIRTY`, `OCCUPIED`, `MAINTENANCE`, `INSPECTING`).
* **[`RoomCleaningRecord.java`](./RoomCleaningRecord.java) & [`CleaningRecordStatus.java`](./CleaningRecordStatus.java):** Nhật ký và tiến độ dọn dẹp buồng phòng.
* **[`RoomIncident.java`](./RoomIncident.java):** Báo cáo sự cố phòng ốc (hỏng điều hòa, sự cố thiết bị...).

### 3. 💳 Tài Chính, Hóa Đơn, Cọc & Sổ Quỹ
* **[`Invoice.java`](./Invoice.java), [`InvoiceStatus.java`](./InvoiceStatus.java), [`InvoiceDiscount.java`](./InvoiceDiscount.java):** Vòng đời hóa đơn (`DRAFT`, `PAID`, `CANCELLED`) và chiết khấu.
* **[`Deposit.java`](./Deposit.java), [`DepositPolicy.java`](./DepositPolicy.java), [`DepositStatus.java`](./DepositStatus.java):** Quản lý tiền cọc và chính sách phạt cọc.
* **[`Payment.java`](./Payment.java), [`DailyLedger.java`](./DailyLedger.java), [`CashierShift.java`](./CashierShift.java):** Lịch sử thanh toán, chốt sổ quỹ ngày và ca làm việc thu ngân.

### 4. 🔄 Kênh OTA & Đồng Bộ Lịch
* **[`Channel.java`](./Channel.java):** Kênh bán phòng (Airbnb, Agoda, Booking.com).
* **[`ChannelCalendarSyncLog.java`](./ChannelCalendarSyncLog.java):** Nhật ký đồng bộ iCal và cảnh báo mất kết nối.
* **[`ChannelRoomBlock.java`](./ChannelRoomBlock.java):** Khóa dải ngày phòng trên sơ đồ lịch khi có khách từ OTA.

### 5. 🔐 Tài Khoản, Phân Quyền & Nhật Ký
* **[`User.java`](./User.java), [`Role.java`](./Role.java), [`Session.java`](./Session.java):** Người dùng, vai trò (`ADMIN`, `RECEPTIONIST`, `HOUSEKEEPER`) và phiên làm việc.
* **[`AuditLog.java`](./AuditLog.java) & [`ConcurrencyLog.java`](./ConcurrencyLog.java):** Ghi vết kiểm toán và lịch sử xung đột dữ liệu đồng thời.
