# 🔍 Gói Truy Xuất CSDL Spring Data JPA (`plant.stay.repository`)

Thư mục `repository/` chứa 53 interface Spring Data JPA kế thừa `JpaRepository`, đảm nhiệm toàn bộ việc truy vấn, lọc dữ liệu, lưu trữ và tương tác với cơ sở dữ liệu MySQL.

---

## 📌 Các Mẫu Truy Vấn Nổi Bật

### 1. 🏨 Kiểm Tra Phòng Trống & Xung Đột Lịch
* **[`BookingRepository.java`](./BookingRepository.java):**
  * Chứa các câu truy vấn JPQL phức tạp kiểm tra tình trạng phòng trống trong dải ngày:
    ```java
    @Query("SELECT b FROM Booking b WHERE b.room.id = :roomId AND b.status NOT IN ('CANCELLED', 'CHECKED_OUT') AND (b.checkInDate < :checkOutDate AND b.checkOutDate > :checkInDate)")
    List<Booking> findOverlappingBookings(...);
    ```
  * Truy vấn thống kê doanh thu, tỷ lệ lấp đầy phục vụ tầng Báo cáo.

### 2. 🔄 Đồng Bộ Lịch Kênh OTA & Cảnh Báo
* **[`ChannelRoomBlockRepository.java`](./ChannelRoomBlockRepository.java):** Quản lý các dải ngày bị khóa từ các kênh OTA (Airbnb, Booking.com, Agoda).
* **[`ChannelCalendarSyncLogRepository.java`](./ChannelCalendarSyncLogRepository.java):** Truy vấn lịch sử sync gần nhất và đếm số lỗi kết nối liên tiếp.

### 3. 🧾 Lọc Hóa Đơn & Kiểm Tra Tra Cứu Công Khai
* **[`InvoiceRepository.java`](./InvoiceRepository.java):**
  * Truy vấn hóa đơn liên kết với booking: `findInvoicesCoveringBooking(Long bookingId)`.
  * Hỗ trợ lọc hóa đơn hợp lệ (bỏ qua `DRAFT` và `CANCELLED`) cho cổng tra cứu công khai (`NCL-09-CN-008`).

### 4. 🧹 Phân Bổ Công Việc Buồng Phòng
* **[`RoomCleaningRecordRepository.java`](./RoomCleaningRecordRepository.java):** Truy vấn danh sách phòng cần dọn, thống kê số phòng đang giao cho từng nhân viên để cân bằng tải (Workload Balancing).
