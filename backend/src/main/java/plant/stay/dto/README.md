# 🔄 Gói Data Transfer Objects (`plant.stay.dto`)

Thư mục `dto/` chứa toàn bộ các đối tượng trung chuyển dữ liệu (DTO) giữa Client và Server. Việc sử dụng DTO giúp đảm bảo tính đóng gói, validation đầu vào chặt chẽ và không làm lộ cấu trúc CSDL thực tế ra ngoài.

---

## 🗂️ Cấu Trúc Thư Mục DTO

```
dto/
├── 📥 request/     # Các DTO nhận dữ liệu từ Client (Create, Update, Filter, Cancel...)
└── 📤 response/    # Các DTO trả kết quả về cho Client (View, List, Detail, Summary, Report...)
```

---

## 📌 Các Đặc Điểm Kỹ Thuật Chính
1. **Validation Chặt Chẽ:** Sử dụng các annotations của Jakarta Bean Validation (`@NotNull`, `@NotBlank`, `@Min`, `@Pattern`, `@DateTimeFormat`) để tự động kiểm tra dữ liệu trước khi chuyển xuống tầng Service.
2. **Tính Tương Thích Ngược (Backward Compatibility):** Khi thêm trường mới, luôn đặt giá trị mặc định hoặc cho phép null để không làm ảnh hưởng tới các phiên bản Frontend/App cũ.
3. **Phân Tách Rõ Ràng:**
   * `request/`: Chứa các model như `BookingRequestDto`, `GuestCancelBookingRequestDto`, `InvoiceCancelRequest`, `RoomCreateRequest`, `ChannelSyncRequest`...
   * `response/`: Chứa các model như `BookingResponse`, `InvoiceResponse`, `ChannelResponse`, `ReportSummaryResponse`, `MultiPeriodComparisonResponse`...
