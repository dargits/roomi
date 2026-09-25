# 🧪 Bộ Kiểm Thử Tự Động Backend (`backend/src/test`)

Thư mục `test/` chứa hơn 60 bài kiểm thử tự động (Unit Tests & Integration Tests) được xây dựng bằng **JUnit 5**, **Mockito** và **H2 In-Memory Database**, đóng vai trò là Quality Gate cốt lõi trong quy trình CI/CD.

---

## 🗂️ Cấu Trúc Bộ Kiểm Thử

```
backend/src/test/
├── java/plant/stay/
│   ├── StayApplicationTests.java     # Kiểm thử nạp Spring Context
│   ├── controller/                   # Kiểm thử tầng API Controller (MockMvc)
│   │   ├── BookingPortalControllerTest.java
│   │   ├── PublicInvoiceLookupTest.java
│   │   └── ReportControllerPeriodComparisonTest.java
│   ├── service/                      # Kiểm thử tầng Business Logic (Mockito)
│   │   ├── BookingServiceTest.java
│   │   ├── InvoiceServiceTest.java
│   │   ├── ChannelCalendarSyncServiceTest.java
│   │   └── GuestServiceTest.java
│   └── util/                         # Kiểm thử các hàm tiện ích & băm dữ liệu
└── resources/
    └── application.properties        # Cấu hình H2 Database riêng biệt cho môi trường test
```

---

## 🚀 Cách Chạy Test

Chạy toàn bộ bài test:
```bash
./mvnw test
```

Chạy riêng một lớp kiểm thử:
```bash
./mvnw test -Dtest=BookingServiceTest
```
