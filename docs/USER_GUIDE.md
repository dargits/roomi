# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ LƯU TRÚ ROOMI (LƯU TRÚ SỐ)

---

## 1. Giới thiệu tổng quan

Hệ thống **Roomi (Lưu Trú Số)** là giải pháp chuyển đổi số toàn diện cho các cơ sở lưu trú (khách sạn, nhà nghỉ, homestay, resort mini). Hệ thống hỗ trợ quản trị đặt phòng đơn, đặt phòng theo đoàn, quản lý buồng phòng, thanh toán VietQR, hóa đơn, đặt cọc và báo cáo doanh thu đa chiều.

---

## 2. Các vai trò trong hệ thống (Roles & Permissions)

| Vai trò | Mã Role | Quyền hạn chính |
|---|---|---|
| **Chủ cơ sở** | `OWNER` | Toàn quyền quản trị hệ thống, cài đặt giá mùa, xem báo cáo tài chính, quản lý nhân sự và phân quyền. |
| **Quản trị viên** | `ADMIN` | Quản trị kỹ thuật, tài khoản người dùng, giám sát nhật ký và sao lưu dữ liệu. |
| **Lễ tân** | `RECEPTIONIST` | Tạo và quản lý đặt phòng, check-in, check-out, quét QR CCCD, thu tiền cọc, xuất hóa đơn, đổi phòng/nâng hạng. |
| **Buồng phòng** | `HOUSEKEEPER` | Xem danh sách phòng cần dọn được phân công, cập nhật tiến độ dọn dẹp và gửi kiểm tra duyệt sạch. |
| **Kế toán** | `ACCOUNTANT` | Xem và đối soát các khoản cọc chưa quyết toán, hóa đơn và báo cáo doanh thu tài chính. |

---

## 3. Quy trình nghiệp vụ cốt lõi

### 3.1. Luồng Đặt phòng & Quản lý (Booking Lifecycle)

```
[Tạo mới (NEW)] 
       ↓ (Gán phòng / Thu cọc)
[Đã xác nhận (CONFIRMED)] 
       ↓ (Check-in & Quét/Upload CCCD 2 mặt)
[Đang ở (CHECKED_IN)] 
       ↓ (Dịch vụ phụ thu / Gia hạn / Nâng hạng / Đổi phòng)
       ↓ (Trả phòng thường hoặc Trả phòng sớm)
[Đã trả phòng (CHECKED_OUT)]
```

#### Các thao tác chính:
1. **Tạo đặt phòng mới:**
   - Vào menu **Đặt phòng** → Bấm nút **"Tạo Booking"**.
   - Tìm kiếm hoặc chọn khách hàng bằng Tên / SĐT / CCCD.
   - Chọn **Loại phòng**, **Ngày nhận phòng** và **Ngày trả phòng**.
   - Hệ thống tự động kiểm tra và hiển thị số lượng phòng trống khả dụng theo thời gian thực.

2. **Quét mã QR & Tải lên 2 mặt CCCD nhanh khi nhận phòng (Check-in):**
   - Mở chi tiết đặt phòng (ở trạng thái `CONFIRMED`) → Bấm **"Nhận phòng"**.
   - Có thể dùng máy quét mã QR để quét mã QR trên CCCD gắn chip (tự động bóc tách số CCCD và họ tên).
   - Tải lên ảnh 2 mặt CCCD (Mặt trước & Mặt sau) để lưu trữ hồ sơ lưu trú nhanh chóng.
   - Bấm **"Xác nhận Nhận phòng"**.

3. **Trả phòng sớm & Tự động tính lại tiền phòng (Early Check-out):**
   - Khi khách có nhu cầu trả phòng trước ngày dự kiến: Bấm nút **"Trả phòng sớm"**.
   - Hệ thống mở modal xem trước: hiển thị số đêm thực tế đã lưu trú, tính lại tiền phòng theo số đêm thực tế và giá mùa, hiển thị khoản chênh lệch được khấu trừ.
   - Bấm **"Xác nhận Trả phòng sớm"** để cập nhật hóa đơn và hoàn tất checkout.

---

### 3.2. Quản lý Đặt cọc & Quyết toán (Deposit Management)

1. **Thu tiền đặt cọc:**
   - Trong chi tiết Booking, chọn tab **"Đặt cọc"**.
   - Hệ thống hiển thị số tiền cọc đề xuất theo chính sách phòng/mùa.
   - Nhập số tiền thực thu, phương thức thanh toán (Tiền mặt / Chuyển khoản VietQR / Thẻ).
2. **Theo dõi danh sách cọc chưa quyết toán:**
   - Vào menu **Đặt phòng** → Chọn tab **"Cọc chưa quyết toán"**.
   - Hiển thị danh sách tất cả các khoản cọc đang giữ (`COLLECTED` hoặc `SHORT_PAID`), tổng tiền cọc toàn hệ thống.
   - Bấm **"Xem chi tiết"** để nhảy trực tiếp vào booking tương ứng để xử lý hoặc khấu trừ vào hóa đơn.

---

### 3.3. Quy trình Buồng phòng 2 bước & Phân công công việc (Housekeeping Workflow)

```
[Phòng bẩn (DIRTY)] 
       ↓ (Quản lý phân công nhân viên dọn)
       ↓ (Nhân viên dọn xong: Bấm "Dọn xong, gửi duyệt")
[Chờ kiểm tra (INSPECTING)] 
       ↓ (Quản lý / Lễ tân kiểm tra phòng)
       ├── Đạt tiêu chuẩn: Bấm "Duyệt sạch (Sẵn sàng)" → [AVAILABLE]
       └── Chưa đạt: Bấm "Yêu cầu dọn lại" → [DIRTY]
```

1. **Phân công phòng cần dọn:**
   - Quản lý / Lễ tân mở menu **Buồng phòng**.
   - Tại mỗi card phòng cần dọn, chọn nhân viên buồng phòng từ dropdown **"Phân công"**.
2. **Nhân viên buồng phòng thực hiện:**
   - Dọn dẹp phòng theo tiêu chuẩn.
   - Bấm **"Dọn xong, gửi duyệt"** → Phòng chuyển sang trạng thái `INSPECTING`.
3. **Nghiệm thu & Duyệt phòng sạch:**
   - Chuyển sang tab **"Chờ duyệt"**.
   - Quản lý kiểm tra phòng thực tế. Nếu đạt, bấm **"Duyệt sạch (Sẵn sàng)"** để đưa phòng vào trạng thái `AVAILABLE` phục vụ khách mới.

---

### 3.4. Báo cáo Doanh thu & Công suất phòng (Reports)

1. **Báo cáo doanh thu đa nguồn:**
   - Vào menu **Tài chính** → **Báo cáo doanh thu & công suất**.
   - Chọn khoảng thời gian (Từ ngày - Đến ngày) và nhóm theo (Ngày / Tháng).
   - Hệ thống tự động tổng hợp:
     - **Tổng thực thu toàn bộ**: Doanh thu phòng + Phí dịch vụ + Phí hủy phòng & Cọc phạt no-show.
     - **Doanh thu tiền phòng**: Từ các booking đã hoàn tất lưu trú.
     - **Phí hủy & Phạt cọc**: Khoản thu giữ lại từ khách hủy phòng hoặc không đến (No-show).
     - **Tổng lượt checkout** và **Doanh thu TB / lượt**.
   - Hỗ trợ xuất dữ liệu ra file **CSV (Excel)**.

---

## 4. Các phím tắt & Tiện ích hỗ trợ

- **Chuyển Tab qua URL Query Parameters:** Mọi module danh sách (`/manage/bookings?tab=list|calendar|groups|deposits|requests`) đều đồng bộ trực tiếp với URL, giúp dễ dàng bookmark hoặc chia sẻ liên kết trực tiếp cho đồng nghiệp.
- **Thanh toán VietQR động:** Tạo mã QR chuẩn NAPAS 247 kèm đúng số tiền và nội dung chuyển khoản tự động.

---
*Tài liệu phát hành bởi Đội ngũ Phát triển Roomi.*
