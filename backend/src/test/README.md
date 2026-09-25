# 🧪 Bộ Kiểm Thử Tự Động Backend (`backend/src/test`)

<p align="center">
  <img src="https://img.shields.io/badge/Test_Framework-JUnit_5-25A162?style=for-the-badge&logo=junit5&logoColor=white" />
  <img src="https://img.shields.io/badge/Mocking-Mockito-6DB33F?style=for-the-badge&logo=mockserviceworker&logoColor=white" />
  <img src="https://img.shields.io/badge/Database-H2_In_Memory-3B82F6?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/CI_Gate-100%25_Pass-10B981?style=for-the-badge&logo=checkmarx&logoColor=white" />
</p>

> Thư mục `test/` chứa hơn 60 bài kiểm thử tự động (Unit Tests & Integration Tests) được xây dựng bằng **JUnit 5**, **Mockito** và **H2 In-Memory Database**, đóng vai trò là Quality Gate cốt lõi trong quy trình CI/CD.

---

## 📑 Mục Lục

1. [🏗️ Cấu Trúc Bộ Kiểm Thử](#️-cấu-trúc-bộ-kiểm-thử)
2. [🧪 Danh Sách Các Lớp Kiểm Thử Trọng Tâm](#-danh-sách-các-lớp-kiểm-thử-trọng-tâm)
3. [🚀 Hướng Dẫn Chạy Kiểm Thử](#-hướng-dẫn-chạy-kiểm-thử)

---

## 🏗️ Cấu Trúc Bộ Kiểm Thử

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

## 🧪 Danh Sách Các Lớp Kiểm Thử Trọng Tâm

| Lớp Test | Số lượng test | Mục đích kiểm thử |
| :--- | :---: | :--- |
| **`BookingServiceTest`** | 5 tests | Tạo mới, kiểm tra trùng lịch, check-in, check-out |
| **`InvoiceServiceTest`** | 3 tests | Tạo hóa đơn, ghi nhận thanh toán, chiết khấu |
| **`InvoiceCancelDraftTest`** | 2 tests | Hủy hóa đơn nháp có lý do và kiểm tra AuditLog |
| **`ChannelCalendarSyncWarningTest`**| 3 tests | Đồng bộ iCal, phát hiện Overbooking và cảnh báo mất kết nối |
| **`ReportPeriodComparisonTest`** | 4 tests | Tính toán tăng trưởng PoP / YoY và xuất báo cáo |

---

## 🚀 Hướng Dẫn Chạy Kiểm Thử

Chạy toàn bộ bài test:
```bash
./mvnw test
```

Chạy riêng một lớp kiểm thử cụ thể:
```bash
./mvnw test -Dtest=BookingServiceTest
```
