# KỊCH BẢN KIỂM THỬ ĐẦU CUỐI (E2E TEST CASES) — ROOMI

---

## Danh mục Kịch bản Kiểm thử

| Mã Test | Tên Kịch bản | Tính năng liên quan | Trạng thái dự kiến |
|---|---|---|---|
| **TC-E2E-01** | Tạo đặt phòng & kiểm tra số phòng khả dụng | Hiển thị phòng khả dụng theo ngày thực tế | Pass |
| **TC-E2E-02** | Thu tiền đặt cọc & theo dõi cọc chưa quyết toán | Quản lý cọc, Tab cọc chưa quyết toán | Pass |
| **TC-E2E-03** | Check-in nhận phòng & quét/upload ảnh 2 mặt CCCD | Nhận phòng, upload ảnh CCCD, QR scan | Pass |
| **TC-E2E-04** | Trả phòng sớm & tự động tính lại tiền phòng | Trả phòng sớm, điều chỉnh hóa đơn | Pass |
| **TC-E2E-05** | Luồng phân công và duyệt phòng sạch 2 bước | Buồng phòng (DIRTY -> INSPECTING -> AVAILABLE) | Pass |
| **TC-E2E-06** | Hủy phòng / No-show & phản ánh cọc phạt vào Báo cáo doanh thu | Báo cáo tài chính, cọc phạt no-show | Pass |
| **TC-E2E-07** | Đồng bộ tab qua URL query parameters | URL query params synchronization | Pass |

---

## Chi tiết các Kịch bản Kiểm thử

### TC-E2E-01: Tạo đặt phòng & kiểm tra số phòng khả dụng
- **Bước thực hiện:**
  1. Đăng nhập bằng tài khoản Lễ tân (`receptionist` / `password`).
  2. Truy cập `/manage/bookings`.
  3. Bấm **"Tạo Booking"**.
  4. Chọn khách hàng: `Nguyễn Văn A`.
  5. Chọn Loại phòng: `Phòng Deluxe`.
  6. Chọn ngày nhận phòng: `2026-09-01`, ngày trả phòng: `2026-09-05`.
- **Kết quả mong đợi:**
  - Ngay khi chọn xong loại phòng và khoảng ngày, hệ thống hiển thị badge xanh: `✓ X phòng trống cho khoảng ngày này`.
  - Nếu chọn khoảng ngày đã hết phòng, badge chuyển sang đỏ: `⚠️ Không còn phòng trống`.

---

### TC-E2E-02: Thu tiền đặt cọc & theo dõi cọc chưa quyết toán
- **Bước thực hiện:**
  1. Mở chi tiết đặt phòng vừa tạo.
  2. Chuyển sang tab **"Đặt cọc"** (`?tab=deposit`).
  3. Nhập số tiền cọc: `500,000 VND`, chọn phương thức `Chuyển khoản (VietQR)`.
  4. Bấm **"Xác nhận Thu cọc"**.
  5. Chuyển sang menu **Đặt phòng** → Tab **"Cọc chưa quyết toán"** (`?tab=deposits`).
- **Kết quả mong đợi:**
  - Khoản cọc `500,000 VND` hiển thị trong danh sách cọc chưa quyết toán với trạng thái `Đã thu đủ`.
  - Tổng tiền cọc toàn hệ thống được cập nhật tăng thêm `500,000 VND`.

---

### TC-E2E-03: Check-in nhận phòng & tải lên ảnh 2 mặt CCCD
- **Bước thực hiện:**
  1. Gán phòng `101` cho đặt phòng trên.
  2. Bấm nút **"Nhận phòng"** trên Header chi tiết đặt phòng.
  3. Kiểm tra số CCCD của khách.
  4. Tại mục ảnh 2 mặt CCCD, chọn file ảnh cho **Mặt trước** và **Mặt sau**.
  5. Bấm nút xem phóng to để kiểm tra chất lượng ảnh.
  6. Bấm **"Xác nhận Nhận phòng"**.
- **Kết quả mong đợi:**
  - Ảnh upload thành công, thumbnail hiển thị rõ ràng.
  - Booking chuyển sang trạng thái `CHECKED_IN` (Đang ở).
  - Phòng `101` chuyển sang trạng thái `OCCUPIED`.

---

### TC-E2E-04: Trả phòng sớm & tự động tính lại tiền phòng
- **Bước thực hiện:**
  1. Giả định khách đã ở 2 đêm và muốn trả phòng trước hạn (hạn gốc là 4 đêm).
  2. Tại chi tiết Booking, bấm nút **"Trả phòng sớm"**.
  3. Modal xem trước xuất hiện hiển thị:
     - Số đêm ban đầu: `4 đêm` → Số đêm thực tế: `2 đêm`.
     - Tiền phòng ban đầu: `2,000,000 VND` → Tiền phòng điều chỉnh: `1,000,000 VND`.
     - Khoản giảm trừ: `-1,000,000 VND`.
  4. Bấm **"Xác nhận Trả phòng sớm"**.
- **Kết quả mong đợi:**
  - Booking chuyển sang `CHECKED_OUT`.
  - Hóa đơn được cập nhật tiền phòng theo số đêm thực tế.
  - Phòng `101` chuyển sang trạng thái `DIRTY` (Cần dọn).

---

### TC-E2E-05: Luồng phân công và duyệt phòng sạch 2 bước
- **Bước thực hiện:**
  1. Đăng nhập tài khoản Quản lý (`owner` / `password`).
  2. Vào menu **Buồng phòng** → Tab **"Phòng cần dọn"**.
  3. Tại card Phòng `101`, chọn phân công cho nhân viên `Trần Thị B`.
  4. Đăng nhập tài khoản Buồng phòng `Trần Thị B`.
  5. Thấy phòng `101` đã được giao, tiến hành dọn phòng xong rồi bấm **"Dọn xong, gửi duyệt"**.
  6. Đăng nhập lại tài khoản Quản lý / Lễ tân, chuyển sang tab **"Chờ duyệt"**.
  7. Kiểm tra thực tế phòng `101` và bấm **"Duyệt sạch (Sẵn sàng)"**.
- **Kết quả mong đợi:**
  - Bước 5: Phòng chuyển sang `INSPECTING` (Chờ duyệt).
  - Bước 7: Phòng chuyển sang `AVAILABLE` (Trống sẵn sàng), phân công được xóa sạch để sẵn sàng cho chu kỳ tiếp theo.

---

### TC-E2E-06: No-show / Phí hủy & Phản ánh vào Báo cáo doanh thu
- **Bước thực hiện:**
  1. Tạo 1 booking có đặt cọc `300,000 VND`.
  2. Khách không đến, thực hiện xử lý **No-show** và tịch thu cọc làm phí phạt vi phạm chính sách.
  3. Đăng nhập tài khoản Kế toán (`accountant` / `password`), vào menu **Báo cáo doanh thu & công suất**.
  4. Chọn khoảng thời gian chứa ngày xử lý No-show, bấm **"Xem báo cáo"**.
- **Kết quả mong đợi:**
  - Thẻ **"Phí hủy & Phạt cọc"** ghi nhận khoản thu `300,000 VND`.
  - Thẻ **"Tổng thực thu toàn bộ"** cộng dồn đầy đủ doanh thu phòng + phí phạt cọc.

---

### TC-E2E-07: Đồng bộ tab qua URL Query Parameters
- **Bước thực hiện:**
  1. Mở trang `/manage/bookings`.
  2. Lần lượt bấm chuyển các tab: **Lịch phòng**, **Đoàn**, **Cọc chưa quyết toán**, **Yêu cầu từ Web**, **Danh sách**.
  3. Quan sát thanh địa chỉ trình duyệt.
  4. Thử F5 (Reload trang) tại URL `/manage/bookings?tab=deposits`.
- **Kết quả mong đợi:**
  - URL thay đổi mượt mà tương ứng: `?tab=calendar`, `?tab=groups`, `?tab=deposits`, `?tab=requests`, `?tab=list`.
  - Khi reload lại trang, tab đang chọn được giữ nguyên chính xác.
