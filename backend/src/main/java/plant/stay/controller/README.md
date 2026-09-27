# 🌐 Gói REST API Controllers (`plant.stay.controller`)

<p align="center">
  <img src="https://img.shields.io/badge/REST_Controllers-46_Classes-3B82F6?style=for-the-badge&logo=spring&logoColor=white" />
  <img src="https://img.shields.io/badge/Validation-Jakarta_Valid-10B981?style=for-the-badge&logo=validator&logoColor=white" />
  <img src="https://img.shields.io/badge/Response-ResponseEntity_DTO-8B5CF6?style=for-the-badge&logo=json&logoColor=white" />
</p>

> Thư mục `controller/` là tầng tiếp nhận và điều hướng toàn bộ các yêu cầu HTTP (RESTful APIs) từ giao diện người dùng và webhook bên ngoài, thực thi validation dữ liệu đầu vào và chuyển tiếp xuống tầng Service.

---

## 📑 Mục Lục

1. [🏨 1. Quản Lý Đặt Phòng & Khách Lưu Trú](#-1-quản-lý-đặt-phòng--khách-lưu-trú)
2. [🌐 2. Cổng Thông Tin & Khách Hàng Tự Phục Vụ (Public APIs)](#-2-cổng-thông-tin--khách-hàng-tự-phục-vụ-public-apis)
3. [💳 3. Tài Chính, Hóa Đơn, Cọc & Sổ Quỹ](#-3-tài-chính-hóa-đơn-cọc--sổ-quỹ)
4. [🛏️ 4. Buồng Phòng, Cơ Sở Vật Chất & Kênh OTA](#️-4-buồng-phòng-cơ-sở-vật-chất--kênh-ota)
5. [📊 5. Báo Cáo, Thống Kê & Trí Tuệ Nhân Tạo (AI)](#-5-báo-cáo-thống-kê--trí-tuệ-nhân-tạo-ai)
6. [🔐 6. Xác Thực, Phân Quyền & Nhật Ký Kiểm Toán](#-6-xác-thực-phân-quyền--nhật-ký-kiểm-toán)

---

## 🏨 1. Quản Lý Đặt Phòng & Khách Lưu Trú
* **[`BookingController.java`](./BookingController.java):** CRUD đặt phòng, check-in, check-out, đổi phòng, hủy phòng, tính tiền phụ thu.
* **[`GroupBookingController.java`](./GroupBookingController.java):** Nghiệp vụ đặt phòng đoàn, phân bổ phòng và quản lý cọc đoàn.
* **[`GuestController.java`](./GuestController.java) & [`InHouseGuestController.java`](./InHouseGuestController.java):** Hồ sơ khách hàng, tra cứu lịch sử lưu trú và danh sách khách đang ở trong khách sạn.
* **[`StayDeclarationController.java`](./StayDeclarationController.java) & [`RoomStayGuestController.java`](./RoomStayGuestController.java):** Khai báo tạm trú và danh sách người ở cùng phòng.
* **[`LegacyBookingImportController.java`](./LegacyBookingImportController.java):** Import danh sách đặt phòng lịch sử qua bảng tính Excel với cơ chế Preview Validation.

---

## 🌐 2. Cổng Thông Tin & Khách Hàng Tự Phục Vụ (Public APIs)
* **[`BookingPortalController.java`](./BookingPortalController.java):** API công khai cho khách xem chi tiết đặt phòng, tra cứu hóa đơn trực tuyến, tra cứu và tự hủy yêu cầu đặt phòng (`CLTSN3-439`, `NCL-09-CN-008`).
* **[`PublicCalendarController.java`](./PublicCalendarController.java) & [`PublicGroupBookingRequestController.java`](./PublicGroupBookingRequestController.java):** Tra cứu phòng trống công khai và gửi yêu cầu đặt phòng trực tuyến.

---

## 💳 3. Tài Chính, Hóa Đơn, Cọc & Sổ Quỹ
* **[`InvoiceController.java`](./InvoiceController.java) & [`InvoiceDiscountController.java`](./InvoiceDiscountController.java):** Tạo hóa đơn, áp dụng chiết khấu %, hủy hóa đơn nháp kèm lý do.
* **[`DepositController.java`](./DepositController.java), [`DepositPolicyController.java`](./DepositPolicyController.java) & [`DepositSummaryController.java`](./DepositSummaryController.java):** Vòng đời tiền cọc, chính sách cọc và tổng kết cọc.
* **[`DailyLedgerController.java`](./DailyLedgerController.java) & [`CashierShiftController.java`](./CashierShiftController.java):** Chốt sổ quỹ theo ngày và quản lý ca làm việc của thu ngân.
* **[`DebtApprovalController.java`](./DebtApprovalController.java):** Phê duyệt và theo dõi công nợ khách hàng doanh nghiệp.

---

## 🛏️ 4. Buồng Phòng, Cơ Sở Vật Chất & Kênh OTA
* **[`RoomController.java`](./RoomController.java) & [`RoomTypeController.java`](./RoomTypeController.java):** Quản lý trạng thái phòng, sơ đồ tầng, hạng phòng và phân công dọn phòng.
* **[`ChannelController.java`](./ChannelController.java):** Quản lý kết nối iCal với kênh OTA, xem nhật ký đồng bộ và trạng thái cảnh báo mất kết nối.
* **[`InventoryItemController.java`](./InventoryItemController.java) & [`LostItemController.java`](./LostItemController.java):** Quản lý kho đồ dùng buồng phòng và đồ đạc khách để quên (Lost & Found).
* **[`ExtraServiceController.java`](./ExtraServiceController.java):** Danh mục và bảng giá dịch vụ phụ thu (ăn uống, giặt là, spa...).

---

## 📊 5. Báo Cáo, Thống Kê & Trí Tuệ Nhân Tạo (AI)
* **[`ReportController.java`](./ReportController.java):** Báo cáo doanh thu, công suất phòng, chỉ số ADR/RevPAR, cơ cấu kênh bán và so sánh đa kỳ PoP/YoY (`CLTSN3-431`).
* **[`AiPriceController.java`](./AiPriceController.java) & [`PriceSuggestionController.java`](./PriceSuggestionController.java):** Gợi ý điều chỉnh giá phòng thông minh dựa trên lịch sử lấp đầy và mùa vụ.
* **[`AiChatController.java`](./AiChatController.java):** Trợ lý ảo AI hỗ trợ giải đáp nghiệp vụ và thao tác nhanh.

---

## 🔐 6. Xác Thực, Phân Quyền & Nhật Ký Kiểm Toán
* **[`AuthController.java`](./AuthController.java) & [`PasswordResetController.java`](./PasswordResetController.java):** Đăng nhập JWT, đăng xuất (hủy session) và đặt lại mật khẩu qua email.
* **[`UserController.java`](./UserController.java) & [`UserPermissionController.java`](./UserPermissionController.java):** Quản lý nhân viên và phân quyền vai trò (Admin, Receptionist, Housekeeper).
* **[`AuditLogController.java`](./AuditLogController.java) & [`ConcurrencyLogController.java`](./ConcurrencyLogController.java):** Nhật ký kiểm toán thao tác người dùng và nhật ký xử lý xung đột dữ liệu.
