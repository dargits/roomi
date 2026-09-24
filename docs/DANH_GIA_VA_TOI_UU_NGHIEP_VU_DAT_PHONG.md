# Báo Cáo Đánh Giá & Tối Ưu Hóa Luồng Nghiệp Vụ Quản Lý Đặt Phòng (Booking System)
**Hệ thống:** StayAway PMS (Roomi)  
**Ngày thực hiện:** 24/09/2026  
**Mục tiêu:** Rà soát toàn diện luồng nghiệp vụ đặt phòng Backend, chỉ ra các điểm nghẽn, mâu thuẫn logic, rủi ro vận hành và đề xuất giải pháp tối ưu.

---

## 1. Tổng quan Kiến trúc Luồng Đặt phòng Hiện tại

Đặt phòng là **hạt nhân trung tâm** điều phối toàn bộ các nghiệp vụ khác trong khách sạn:
```
[ Khách hàng / OTA / Đoàn ]
            │
            ▼
     [ ĐẶT PHÒNG ] ───► [ Sơ đồ phòng & Buồng phòng ]
            │                   │
            ├─────────► [ Đặt cọc & Chính sách cọc ]
            │                   │
            ├─────────► [ Khai báo lưu trú / CCCD ]
            │                   │
            ├─────────► [ Hóa đơn, Dịch vụ & Công nợ ]
            │
            ▼
     [ Báo cáo Doanh thu & Lịch sử thao tác ]
```

Vòng đời trạng thái booking hiện tại (`BookingStatus`):
`NEW` (Mới tạo) ──► `CONFIRMED` (Đã xác nhận) ──► `CHECKED_IN` (Đang ở) ──► `CHECKED_OUT` (Đã đi)
      │                     │
      ▼                     ▼
 `CANCELLED`             `NO_SHOW`

---

## 2. Các điểm Bất Hợp Lý & Rủi Ro Nghiệp Vụ Phát Hiện Trong Backend

### 2.1. Mâu thuẫn trong Máy trạng thái (State Machine & Transitions)

#### A. Trạng thái khi tạo đơn có sẵn phòng
- **Hiện trạng:** Trong `BookingServiceImpl.create()`, dù người dùng đã chọn phòng cụ thể (`roomId != null`) và hệ thống đã kiểm tra phòng trống không trùng lặp, booking vẫn được lưu với trạng thái `NEW`.
- **Bất hợp lý:** Khi tạo đơn walk-in tại quầy (khách vào nhận phòng ngay), lễ tân đã gán phòng nhưng đơn vẫn ở `NEW`. Lễ tân không thể bấm "Nhận phòng" ngay vì `checkIn()` yêu cầu bắt buộc trạng thái phải là `CONFIRMED`. Lễ tân buộc phải trải qua bước "Xác nhận" trung gian thừa thãi.
- **Khác biệt khó hiểu:** Nếu tạo đơn không chọn phòng (`roomId == null`), sau đó gọi API `assignRoom()`, hệ thống lại tự động chuyển status lên `CONFIRMED` (`booking.setStatus(BookingStatus.CONFIRMED)`). Như vậy:
  - Tạo kèm phòng: status = `NEW` (không tự xác nhận).
  - Tạo không phòng rồi gán phòng sau: status = `CONFIRMED` (tự động xác nhận).
- **Khuyến nghị:**
  - Nếu tạo mới có gán phòng hoặc cờ `autoConfirm = true` (đặc biệt đơn Walk-in), hệ thống nên cho phép chuyển thẳng lên `CONFIRMED` hoặc cung cấp API `walkInCheckIn` (Tạo + Nhận phòng trong 1 bước).

#### B. Khách không đến (No-Show) bị chặn nếu đơn còn ở `NEW`
- **Hiện trạng:** Phương thức `noShow()` kiểm tra:
  ```java
  if (booking.getStatus() != BookingStatus.CONFIRMED) {
      throw new IllegalArgumentException("Chỉ có thể đánh dấu no-show khi đặt phòng ở trạng thái CONFIRMED");
  }
  ```
- **Bất hợp lý:** Nhiều khách đặt giữ chỗ qua Web/Điện thoại (đơn ở trạng thái `NEW`) quá giờ nhận phòng không đến và không liên lạc được. Lễ tân muốn đánh dấu `NO_SHOW` để giải phóng công suất phòng nhưng bị chặn, buộc phải "Xác nhận ảo" rồi mới được bấm "Không đến", hoặc phải bấm "Hủy".
- **Khuyến nghị:** Cho phép chuyển sang `NO_SHOW` từ cả `NEW` và `CONFIRMED` khi đã quá giờ check-in mặc định (ví dụ sau 18:00 hoặc 22:00 của ngày nhận phòng).

#### C. Thiếu trạng thái `HOLD` (Giữ phòng tạm thời có thời hạn)
- **Hiện trạng:** Hệ thống đã có trường `bookings.hold_expires_at` và `hotel_settings.temporary_hold_minutes`, nhưng enum `BookingStatus` chỉ có `NEW`, không có `HOLD`. Các đơn giữ chỗ online dễ lẫn lộn với đơn đặt phòng truyền thống.
- **Khuyến nghị:** Bổ sung logic tự động hủy các booking `NEW` giữ chỗ online nếu quá `hold_expires_at` mà chưa hoàn tất cọc/xác nhận thông qua Scheduled Task.

---

### 2.2. Điểm nghẽn trong Quy trình Check-out & Công nợ (Check-out & Debt)

#### A. Chặn cứng Trả phòng khi Hóa đơn chưa `PAID`
- **Hiện trạng:** Trong `BookingServiceImpl.checkOut()`:
  ```java
  if (invoice == null || invoice.getStatus() != InvoiceStatus.PAID) {
      throw new IllegalArgumentException("Phải lập hóa đơn và thanh toán đầy đủ trước khi trả phòng!");
  }
  ```
- **Bất hợp lý:**
  1. Trong thực tế khách sạn, có rất nhiều trường hợp khách trả phòng gấp để ra sân bay, công ty thanh toán chuyển khoản sau, hoặc khách quen được cho nợ.
  2. Hệ thống đã xây dựng module **Duyệt nợ trả sau (`DebtApproval`)**, nhưng nếu lễ tân bấm "Trả phòng" trên danh sách đặt phòng thông thường, hệ thống văng lỗi thô cứng `Phải lập hóa đơn và thanh toán đầy đủ trước khi trả phòng!` mà không hướng dẫn hoặc tích hợp chuyển tiếp sang luồng Duyệt nợ.
- **Khuyến nghị:**
  - Tại phương thức `checkOut()`, nếu hóa đơn chưa `PAID`, kiểm tra xem đã có bản ghi nợ được duyệt (`debtApprovalRepository.existsActiveApprovedDebtByBookingId(bookingId)`) hay chưa. Nếu đã có thì cho phép hoàn tất trả phòng và ghi nhận nợ.
  - Trên giao diện Frontend, khi khách chưa thanh toán, nút thao tác chính phải hiển thị rõ "Thanh toán & Trả phòng" hoặc "Tạo yêu cầu nợ".

---

### 2.3. Mâu thuẫn Nghiệp vụ Đặt cọc Đoàn với Khách hàng Doanh nghiệp (Corporate B2B)

- **Hiện trạng:** Trong `assignRoom()`:
  ```java
  if (booking.getGroupBooking() != null) {
      BigDecimal requiredDeposit = expectedTotal.multiply(BigDecimal.valueOf(0.3))...;
      if (totalCollectedDeposit < requiredDeposit) {
          throw new IllegalArgumentException("Chưa hoàn thành tiền đặt cọc tối thiểu 30%...");
      }
  }
  ```
- **Bất hợp lý:**
  - Khách sạn có các đối tác doanh nghiệp lớn (`CorporateClient`) ký hợp đồng thỏa thuận giá (`NegotiatedPriceAgreement`) cho phép thanh toán sau theo chu kỳ công nợ (Net 15 / Net 30 ngày) không cần cọc tiền mặt.
  - Kiểm tra cứng 30% này khiến lễ tân không thể xếp phòng cho các đoàn công tác B2B dù đã có hợp đồng hợp lệ.
- **Khuyến nghị:**
  - Bổ sung điều kiện miễn cọc: Nếu đoàn thuộc Khách hàng Doanh nghiệp có thỏa thuận thanh toán sau (`agreement.isPostPaidAllowed() == true`), cho phép xếp phòng mà không bắt buộc 30% tiền mặt.

---

### 2.4. Vấn đề Hiệu Năng & Quá Tải Cơ Sở Dữ Liệu (Performance & N+1 Queries)

#### A. Vấn đề N+1 Query trong phương thức `toResponse(Booking b)`
- **Hiện trạng:**
  Mỗi khi chuyển đổi một đối tượng `Booking` sang `BookingResponse`:
  ```java
  Invoice inv = invoiceRepository.findInvoicesCoveringBooking(b.getId()).stream().findFirst().orElse(null);
  if (b.getStatus() == BookingStatus.CHECKED_OUT) {
      payLaterCheckout = debtApprovalRepository.existsActiveApprovedDebtByBookingId(b.getId());
  }
  b.getStayingGuests().stream()...;
  ```
- **Hậu quả:**
  Khi tải danh sách 50 đặt phòng, hệ thống thực hiện:
  - 1 query lấy danh sách booking
  - 50 queries tìm hóa đơn (`invoices`)
  - Hàng chục queries kiểm tra công nợ (`debt_approvals`)
  - 50 queries lazy load danh sách khách cùng phòng (`staying_guests`)
  Tổng cộng lên tới **150+ queries SQL** chỉ để tải một trang danh sách!
- **Giải pháp:**
  1. Sử dụng Projection hoặc Batch Fetching (`JOIN FETCH` hoặc `@EntityGraph`).
  2. Tạo câu truy vấn gộp hoặc lưu cache trạng thái thanh toán trực tiếp trên bảng `bookings` (`payment_status`).

#### B. Vòng lặp truy vấn trùng lặp trong `checkRoomTypeCapacity`
- **Hiện trạng:**
  ```java
  for (LocalDate d = checkIn; d.isBefore(checkOut); d = d.plusDays(1)) {
      // ...
      List<ChannelRoomBlock> activeBlocks = channelRoomBlockRepository.findActiveBlocksByRoomTypeAndDates(
              roomTypeId, checkIn, checkOut); // NẰM TRONG VÒNG LẶP FOR!
  }
  ```
- **Bất hợp lý:** Nếu khách đặt 30 đêm, câu truy vấn `findActiveBlocksByRoomTypeAndDates` bị gọi lặp lại 30 lần với cùng một tham số!
- **Giải pháp:** Đưa lệnh gọi `findActiveBlocksByRoomTypeAndDates` ra ngoài vòng lặp `for`.

---

### 2.5. Rào cản tìm kiếm bất hợp lý (Search Constraint)

- **Hiện trạng:**
  ```java
  if (query != null && !query.trim().isEmpty() && query.trim().length() < 3) {
      throw new IllegalArgumentException("Từ khóa tìm kiếm phải có ít nhất 3 ký tự");
  }
  ```
- **Bất hợp lý:**
  - Trong khách sạn, mã đặt phòng (`#1`, `#2`, `#15`) hoặc số phòng (`1`, `2`, `10`, `3B`) thường chỉ có 1 đến 2 ký tự.
  - Khi lễ tân gõ `#1` hoặc `10`, hệ thống ném ngoại lệ 400 và không cho tìm kiếm.
- **Giải pháp:**
  - Cho phép tìm kiếm số (ID, số phòng) từ 1 ký tự. Chỉ áp dụng ngưỡng ký tự với chuỗi chữ cái tiếng Việt/tìm kiếm toàn văn để bảo vệ chỉ mục (index).

---

## 3. Tổng Hợp Ma Trận Đề Xuất Cải Tiến

| Hạng mục | Mức độ ưu tiên | Tác động | Giải pháp đề xuất |
| :--- | :---: | :--- | :--- |
| **Xóa bỏ N+1 Query tại `toResponse`** | Cao (P0) | Giảm 80% tải Database, phản hồi tức thì | Fetch hóa đơn và công nợ theo danh sách (batch in-clause) thay vì lặp từng ID |
| **Bỏ query lặp trong `checkRoomTypeCapacity`** | Cao (P0) | Tối ưu kiểm tra phòng trống | Đưa query `findActiveBlocksByRoomTypeAndDates` ra ngoài vòng lặp ngày |
| **Tối ưu tìm kiếm < 3 ký tự** | Trung bình (P1) | Trải nghiệm lễ tân mượt mà | Cho phép tìm kiếm ID / số phòng 1-2 ký tự, chỉ giới hạn text search |
| **Tự động xác nhận đơn có sẵn phòng (Walk-in)** | Trung bình (P1) | Cắt giảm 50% thao tác lễ tân | Tự động đặt status `CONFIRMED` khi chọn phòng hoặc hỗ trợ API check-in nhanh |
| **Mở rộng điều kiện No-Show** | Trung bình (P1) | Thu hồi công suất phòng kịp thời | Cho phép No-Show từ cả `NEW` khi quá giờ check-in |
| **Hỗ trợ miễn cọc đoàn B2B có thỏa thuận** | Trung bình (P1) | Linh hoạt bán hàng cho doanh nghiệp | Bỏ qua chặn 30% nếu khách đoàn có hợp đồng công nợ trả sau |
| **Liên kết Trả phòng & Duyệt nợ** | Thấp (P2) | Tránh bế tắc khi khách trả phòng | Cho phép check-out nếu đã có duyệt nợ còn hiệu lực |

---

## 4. Kết luận
Luồng nghiệp vụ Đặt phòng của hệ thống StayAway đã xây dựng rất chi tiết và bao quát được nhiều kịch bản phức tạp (phụ thu người thêm, giá mùa vụ, lịch kênh iCal, kiểm tra xung đột phòng). Tuy nhiên, việc siết chặt một số điều kiện cứng (chặn < 3 ký tự, chặn cọc đoàn, chặn check-out chưa thanh toán) cùng với hiện tượng N+1 SQL queries đang là các nguyên nhân chính gây lag và cảm giác "khó dùng". Việc áp dụng các đề xuất trên sẽ giúp hệ thống vận hành trơn tru, logic và chuyên nghiệp chuẩn khách sạn 4-5 sao.
