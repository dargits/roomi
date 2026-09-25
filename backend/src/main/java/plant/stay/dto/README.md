# 🔄 Gói Data Transfer Objects (`plant.stay.dto`)

<p align="center">
  <img src="https://img.shields.io/badge/DTO-Request_Response-3B82F6?style=for-the-badge&logo=databricks&logoColor=white" />
  <img src="https://img.shields.io/badge/Validation-Bean_Validation-10B981?style=for-the-badge&logo=spring&logoColor=white" />
  <img src="https://img.shields.io/badge/Compatibility-Backward_Safe-F59E0B?style=for-the-badge&logo=semanticrelease&logoColor=white" />
</p>

> Thư mục `dto/` chứa toàn bộ các đối tượng trung chuyển dữ liệu (DTO) giữa Client và Server. Việc sử dụng DTO giúp đảm bảo tính đóng gói, validation đầu vào chặt chẽ và không làm lộ cấu trúc CSDL thực tế ra ngoài.

---

## 📑 Mục Lục

1. [🏗️ Cấu Trúc Thư Mục DTO](#️-cấu-trúc-thư-mục-dto)
2. [📌 Các Đặc Điểm Kỹ Thuật Chính](#-các-đặc-điểm-kỹ-thuật-chính)
3. [📋 Danh Mục Các DTOs Trọng Tâm](#-danh-mục-các-dtos-trọng-tâm)

---

## 🏗️ Cấu Trúc Thư Mục DTO

```
dto/
├── 📥 request/     # Các DTO nhận dữ liệu từ Client (Create, Update, Filter, Cancel...)
└── 📤 response/    # Các DTO trả kết quả về cho Client (View, List, Detail, Summary, Report...)
```

---

## 📌 Các Đặc Điểm Kỹ Thuật Chính
* **Validation Chặt Chẽ:** Sử dụng các annotations của Jakarta Bean Validation (`@NotNull`, `@NotBlank`, `@Min`, `@Pattern`, `@DateTimeFormat`) để tự động kiểm tra dữ liệu trước khi chuyển xuống tầng Service.
* **Tính Tương Thích Ngược (Backward Compatibility):** Khi thêm trường mới, luôn đặt giá trị mặc định hoặc cho phép null để không làm ảnh hưởng tới các phiên bản Frontend/App cũ.
* **Cách ly Entity:** Ngăn chặn tuyệt đối việc trả trực tiếp Entity ra ngoài API để bảo vệ mật khẩu, token và thông tin nội bộ.

---

## 📋 Danh Mục Các DTOs Trọng Tâm

| Phân hệ | Request DTOs (Nhận vào) | Response DTOs (Trả về) |
| :--- | :--- | :--- |
| **Đặt phòng** | `BookingRequestDto`, `GuestCancelBookingRequestDto` | `BookingResponse`, `BookingDetailResponse` |
| **Hóa đơn** | `InvoiceCancelRequest`, `InvoiceDiscountRequest` | `InvoiceResponse`, `InvoiceSummaryResponse` |
| **Kênh OTA** | `ChannelSyncRequest`, `ChannelBlockRequest` | `ChannelResponse`, `ChannelWarningSummaryResponse` |
| **Báo cáo** | `ReportFilterRequest`, `PeriodComparisonRequest` | `ReportSummaryResponse`, `MultiPeriodComparisonResponse` |
| **Phòng & Khách** | `RoomCreateRequest`, `GuestProfileRequest` | `RoomResponse`, `GuestResponse`, `InHouseGuestResponse` |
