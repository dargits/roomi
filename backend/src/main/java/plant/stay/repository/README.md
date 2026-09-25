# 🔍 Gói Truy Xuất CSDL Spring Data JPA (`plant.stay.repository`)

<p align="center">
  <img src="https://img.shields.io/badge/Repositories-53_Interfaces-3B82F6?style=for-the-badge&logo=spring&logoColor=white" />
  <img src="https://img.shields.io/badge/Queries-JPQL_Derived-10B981?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/Performance-Optimized_Index-F59E0B?style=for-the-badge&logo=speedtest&logoColor=white" />
</p>

> Thư mục `repository/` chứa 53 interface Spring Data JPA kế thừa `JpaRepository`, đảm nhiệm toàn bộ việc truy vấn, lọc dữ liệu, lưu trữ và tương tác với cơ sở dữ liệu MySQL.

---

## 📑 Mục Lục

1. [🏨 1. Kiểm Tra Phòng Trống & Xung Đột Lịch](#-1-kiểm-tra-phòng-trống--xung-đột-lịch)
2. [🔄 2. Đồng Bộ Lịch Kênh OTA & Cảnh Báo](#-2-đồng-bộ-lịch-kênh-ota--cảnh-báo)
3. [🧾 3. Lọc Hóa Đơn & Kiểm Tra Tra Cứu Công Khai](#-3-lọc-hóa-đơn--kiểm-tra-tra-cứu-công-khai)
4. [🧹 4. Phân Bổ Công Việc Buồng Phòng](#-4-phân-bổ-công-việc-buồng-phòng)

---

## 🏨 1. Kiểm Tra Phòng Trống & Xung Đột Lịch
* **[`BookingRepository.java`](./BookingRepository.java):**
  * Chứa các câu truy vấn JPQL phức tạp kiểm tra tình trạng phòng trống trong dải ngày:
    ```java
    @Query("SELECT b FROM Booking b WHERE b.room.id = :roomId AND b.status NOT IN ('CANCELLED', 'CHECKED_OUT') AND (b.checkInDate < :checkOutDate AND b.checkOutDate > :checkInDate)")
    List<Booking> findOverlappingBookings(...);
    ```
  * Truy vấn thống kê doanh thu, tỷ lệ lấp đầy phục vụ tầng Báo cáo.

---

## 🔄 2. Đồng Bộ Lịch Kênh OTA & Cảnh Báo
* **[`ChannelRoomBlockRepository.java`](./ChannelRoomBlockRepository.java):** Quản lý các dải ngày bị khóa từ các kênh OTA (Airbnb, Booking.com, Agoda).
* **[`ChannelCalendarSyncLogRepository.java`](./ChannelCalendarSyncLogRepository.java):** Truy vấn lịch sử sync gần nhất và đếm số lỗi kết nối liên tiếp.

---

## 🧾 3. Lọc Hóa Đơn & Kiểm Tra Tra Cứu Công Khai
* **[`InvoiceRepository.java`](./InvoiceRepository.java):**
  * Truy vấn hóa đơn liên kết với booking: `findInvoicesCoveringBooking(Long bookingId)`.
  * Hỗ trợ lọc hóa đơn hợp lệ (bỏ qua `DRAFT` và `CANCELLED`) cho cổng tra cứu công khai (`NCL-09-CN-008`).

---

## 🧹 4. Phân Bổ Công Việc Buồng Phòng
* **[`RoomCleaningRecordRepository.java`](./RoomCleaningRecordRepository.java):** Truy vấn danh sách phòng cần dọn, thống kê số phòng đang giao cho từng nhân viên để cân bằng tải (Workload Balancing).
