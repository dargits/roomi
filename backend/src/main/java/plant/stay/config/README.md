# ⚙️ Gói Cấu Hình & Tác Vụ Ngầm Định Kỳ (`plant.stay.config`)

<p align="center">
  <img src="https://img.shields.io/badge/Schedulers-5_Cron_Jobs-3B82F6?style=for-the-badge&logo=clockify&logoColor=white" />
  <img src="https://img.shields.io/badge/Security-Data_Masking_CORS-10B981?style=for-the-badge&logo=auth0&logoColor=white" />
  <img src="https://img.shields.io/badge/Data-Auto_Seeder_Migration-F59E0B?style=for-the-badge&logo=liquibase&logoColor=white" />
</p>

> Thư mục `config/` chứa các cấu hình hạ tầng của Spring Boot, các tiến trình chạy ngầm định kỳ (Background Schedulers), bảo vệ dữ liệu nhạy cảm (Data Masking) và khởi tạo dữ liệu ban đầu.

---

## 📑 Mục Lục

1. [🕒 1. Các Tiến Trình Chạy Ngầm Tự Động (Schedulers)](#-1-các-tiến-trình-chạy-ngầm-tự-động-schedulers)
2. [🛡️ 2. Bảo Mật & Mạng (Security & Networking)](#️-2-bảo-mật--mạng-security--networking)
3. [🌱 3. Khởi Tạo Dữ Liệu & Nâng Cấp Schema (Database Lifecycle)](#-3-khởi-tạo-dữ-liệu--nâng-cấp-schema-database-lifecycle)

---

## 🕒 1. Các Tiến Trình Chạy Ngầm Tự Động (Schedulers)
* **[`ChannelCalendarScheduler.java`](./ChannelCalendarScheduler.java):** Định kỳ gọi dịch vụ đồng bộ lịch bận với các kênh OTA (Airbnb, Booking.com, Agoda) qua giao thức iCal.
* **[`CheckInReminderScheduler.java`](./CheckInReminderScheduler.java):** Quét các đơn đặt phòng sắp đến hạn nhận phòng trong ngày để gửi email nhắc nhở cho khách lưu trú.
* **[`DebtReminderScheduler.java`](./DebtReminderScheduler.java):** Quét và cảnh báo công nợ đối với các đoàn khách chưa hoàn tất thanh toán.
* **[`PeriodicCleaningScheduler.java`](./PeriodicCleaningScheduler.java):** Tự động tạo công việc dọn dẹp định kỳ cho các phòng trống không có khách quá N ngày.
* **[`StayDeclarationScheduler.java`](./StayDeclarationScheduler.java):** Tự động tổng hợp danh sách khách lưu trú phục vụ công tác khai báo tạm trú.

---

## 🛡️ 2. Bảo Mật & Mạng (Security & Networking)
* **[`PersonalDataMaskingResponseAdvice.java`](./PersonalDataMaskingResponseAdvice.java):** `ResponseBodyAdvice` tự động can thiệp vào dữ liệu JSON trả về từ Controller để che mờ (mask) CCCD và Số điện thoại đối với nhân viên không đủ đặc quyền.
* **[`WebCorsConfig.java`](./WebCorsConfig.java) & [`WebConfig.java`](./WebConfig.java):** Cấu hình CORS và các Header bảo mật cho phép Frontend kết nối an toàn từ `stayaway.io.vn` và `localhost`.

---

## 🌱 3. Khởi Tạo Dữ Liệu & Nâng Cấp Schema (Database Lifecycle)
* **[`DataSeeder.java`](./DataSeeder.java):** Tự động nạp dữ liệu mẫu khi khởi chạy lần đầu: Loại phòng, Phòng theo tầng, Dịch vụ phụ thu, Tài khoản Admin/Lễ tân/Buồng phòng mặc định.
* **[`DatabaseSchemaMigration.java`](./DatabaseSchemaMigration.java):** Tự động kiểm tra và nâng cấp các cột/bảng CSDL phát sinh trong các bản cập nhật mới.
