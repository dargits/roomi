# Luồng Sử Dụng Hệ Thống - Lưu Trú Số MVP

## 0. Ma Trận Phân Quyền Theo Vai Trò (Role-Based Access Control)

| Vai trò (Role) | Chức năng & Luồng nghiệp vụ chính được phép | Màn hình truy cập | API Endpoints |
|---|---|---|---|
| **Quản Trị Viên (`ADMIN`)** | - Quản lý tài khoản nhân viên (đổi vai trò, khóa/mở khóa tài khoản)<br>- Xem nhật ký hoạt động hệ thống (Activity Log)<br>- Báo cáo doanh thu & công suất<br>- Cấu hình thiết lập cơ sở | Nhân viên, Hồ sơ, Báo cáo, Cài đặt, Sơ đồ phòng | `/users/*`, `/activity-logs`, `/reports/*`, `/settings` |
| **Chủ Cơ Sở (`OWNER`)** | - Cấu hình phòng, loại phòng, giá theo mùa<br>- Quản lý danh mục dịch vụ phụ thu<br>- Cấu hình thiết lập cơ sở & chính sách hủy<br>- Xem báo cáo doanh thu & công suất phòng<br>- Khóa phòng bảo trì, xem sơ đồ phòng tổng quan | Sơ đồ phòng, Phòng & Loại, Giá theo mùa, Dịch vụ phụ thu, Báo cáo, Cài đặt cơ sở, Hồ sơ | `/rooms/*`, `/room-types/*`, `/seasonal-rates/*`, `/surcharge-services/*`, `/reports/*`, `/settings` |
| **Lễ Tân (`RECEPTIONIST`)** | - Xem sơ đồ phòng & lịch phòng<br>- Tạo đặt phòng, xác nhận, gán phòng, đổi phòng<br>- Thực hiện Check-in (Nhận phòng)<br>- Ghi nhận dịch vụ phụ thu phát sinh<br>- Ghi nhận thanh toán (Tiền mặt / Chuyển khoản)<br>- Thực hiện Check-out (Trả phòng)<br>- Hủy đặt phòng, Đánh dấu khách không đến (No-show) | Sơ đồ phòng, Đặt phòng, Khách hàng, Giá theo mùa, Dịch vụ phụ thu, Hồ sơ | `/bookings/*`, `/calendar/*`, `/guests/*`, `/surcharge-services`, `/payments` |
| **Kế Toán (`ACCOUNTANT`)** | - Xem danh sách đặt phòng & chi tiết hóa đơn<br>- Xem lịch sử thanh toán đối soát<br>- Xem báo cáo doanh thu & xuất báo cáo ra Excel<br>- Xem giá theo mùa | Sơ đồ phòng, Đặt phòng, Giá theo mùa, Báo cáo doanh thu, Hồ sơ | `GET /bookings/*`, `GET /reports/revenue*`, `GET /rates` |
| **Nhân Viên Buồng Phòng (`HOUSEKEEPER`)** | - Tự động hiển thị danh sách phòng cần dọn dẹp (`CAN_DON` / `NEEDS_CLEANING`) ngay sau khi đăng nhập<br>- Xem danh sách phòng ưu tiên dọn dẹp theo giờ khách sắp nhận phòng<br>- Đánh dấu phòng đã dọn dẹp xong (`SAN_SANG` / `AVAILABLE`) | Sơ đồ phòng (chế độ Buồng phòng), Hồ sơ | `GET /rooms`, `PATCH /rooms/{id}/status`, `GET /calendar/rooms` |

---

## 1. Luồng Khởi Tạo Hệ Thống

### 1.1. Setup Ban Đầu (Quản Trị Viên)
```
1. Đăng nhập với tài khoản quản trị viên mặc định
2. Cấu hình thông tin cơ sở (tên, địa chỉ, giờ nhận/trả phòng)
3. Tạo tài khoản cho Chủ cơ sở
4. Tạo tài khoản cho Lễ tân, Nhân viên buồng phòng, Kế toán
5. Cấu hình chính sách hủy phòng
```

### 1.2. Cấu Hình Phòng (Chủ Cơ Sở)
```
1. Đăng nhập với tài khoản Chủ cơ sở
2. Tạo các loại phòng (VIP, Standard, Deluxe...) với giá cơ bản
3. Tạo danh sách phòng cụ thể (số phòng, gán loại phòng)
4. Cấu hình giá theo mùa cho từng loại phòng
5. Tạo danh mục dịch vụ phụ thu (ăn sáng, giặt là, massage...)
```

## 2. Luồng Hoạt Động Hàng Ngày

### 2.1. Quy Trình Đặt Phòng (Lễ Tân)

#### A. Nhận Yêu Cầu Đặt Phòng
```
1. Khách liên hệ đặt phòng (điện thoại, trực tiếp, mạng xã hội)
2. Lễ tân đăng nhập hệ thống
3. Kiểm tra lịch phòng trống theo ngày và loại phòng
4. Tạo đặt phòng mới:
   - Nhập thông tin khách (tên, số điện thoại, email)
   - Chọn loại phòng và ngày nhận/trả
   - Hệ thống tự động tính giá dự kiến
5. Lưu đặt phòng (trạng thái: MOI_TAO)
```

#### B. Gán Phòng Cụ Thể
```
1. Lễ tân vào màn hình lịch phòng (calendar view)
2. Chọn đặt phòng cần gán phòng
3. Chọn phòng cụ thể còn trống trong khoảng thời gian
4. Hệ thống kiểm tra chống trùng phòng:
   - Nếu OK: gán thành công, chuyển trạng thái DA_XAC_NHAN
   - Nếu trùng: hiển thị cảnh báo, yêu cầu chọn phòng khác
5. Thông báo cho khách về thông tin phòng đã được gán
```

#### C. Xử Lý Xung Đột Đồng Thời
```
Tình huống: 2 lễ tân cùng gán 1 phòng cho 2 khách khác nhau
1. Lễ tân A chọn phòng 101 cho khách X
2. Lễ tân B chọn phòng 101 cho khách Y (gần cùng lúc)
3. Hệ thống chỉ chấp nhận thao tác đầu tiên (A)
4. Thao tác sau (B) nhận thông báo xung đột
5. Lễ tân B phải chọn phòng khác hoặc làm mới lịch để xem cập nhật
```

### 2.2. Quy Trình Nhận Phòng (Lễ Tân)

#### Điều Kiện Tiên Quyết
```
- Đặt phòng đã được gán phòng cụ thể (DA_XAC_NHAN)
- Phòng ở trạng thái SAN_SANG
- Đến ngày nhận phòng
```

#### Các Bước Thực Hiện
```
1. Khách đến làm thủ tục nhận phòng
2. Lễ tân tìm đặt phòng theo tên hoặc số điện thoại
3. Xác nhận danh tính khách và thông tin đặt phòng
4. Thực hiện check-in:
   - Ghi nhận thời gian nhận phòng thực tế
   - Chuyển trạng thái booking: DA_NHAN_PHONG
   - Chuyển trạng thái phòng: CO_KHACH
5. Trao chìa khóa và hướng dẫn khách
```

### 2.3. Quản Lý Dịch Vụ Phụ Thu (Lễ Tân)

#### Trong Thời Gian Lưu Trú
```
1. Khách yêu cầu dịch vụ (ăn sáng, giặt là, spa...)
2. Lễ tân ghi nhận dịch vụ vào đặt phòng:
   - Chọn loại dịch vụ từ danh mục
   - Nhập số lượng
   - Hệ thống tính tiền theo đơn giá
3. Dịch vụ được lưu và sẽ tính vào hóa đơn cuối
```

### 2.4. Quy Trình Trả Phòng (Lễ Tân)

#### A. Chuẩn Bị Trả Phòng
```
1. Trước khi khách trả phòng, Lễ tân kiểm tra:
   - Các dịch vụ phụ thu đã ghi nhận đầy đủ chưa
   - Hóa đơn đã được lập chưa
   - Thanh toán đã đủ số tiền chưa
```

#### B. Lập Hóa Đơn
```
1. Tạo hóa đơn tự động:
   - Tiền phòng (theo số đêm và giá theo mùa)
   - Tiền dịch vụ phụ thu
   - Giảm giá (nếu có)
   - Tổng tiền = Tiền phòng + Dịch vụ - Giảm giá
2. In/gửi hóa đơn cho khách xem
```

#### C. Thu Tiền
```
1. Khách thanh toán (tiền mặt, chuyển khoản, thẻ)
2. Ghi nhận từng lần thanh toán:
   - Số tiền
   - Phương thức
   - Thời gian
   - Người thu
3. Có thể thanh toán nhiều lần cho đến khi đủ
4. Khi thanh toán đủ: hóa đơn chuyển trạng thái DA_THANH_TOAN
```

#### D. Thủ Tục Trả Phòng
```
Điều kiện: Hóa đơn đã thanh toán đầy đủ
1. Thực hiện checkout:
   - Ghi nhận thời gian trả phòng thực tế
   - Chuyển trạng thái booking: DA_TRA_PHONG
   - Chuyển trạng thái phòng: CAN_DON
2. Thu lại chìa khóa
3. Tạm biệt khách
```

### 2.5. Quy Trình Dọn Phòng (Nhân Viên Buồng Phòng - HOUSEKEEPER)

```
1. Đăng nhập hệ thống bằng tài khoản Nhân viên buồng phòng (Role: HOUSEKEEPER)
2. Hệ thống tự động lọc sẵn danh sách các phòng đang cần dọn dẹp (Trạng thái: CAN_DON / NEEDS_CLEANING)
3. Xem danh sách phòng được sắp xếp tự động theo thứ tự ưu tiên:
   - Ưu tiên 1: Các phòng CAN_DON có lịch check-in gần nhất trong ngày (khách chuẩn bị nhận phòng)
   - Ưu tiên 2: Các phòng CAN_DON còn lại theo thứ tự số phòng/tầng
4. Tiến hành dọn dẹp phòng theo đúng tiêu chuẩn vệ sinh khách sạn
5. Hoàn thành dọn dẹp:
   - Chọn phòng và bấm "Hoàn tất dọn phòng (Đánh dấu Sẵn sàng)"
   - Hệ thống cập nhật trạng thái phòng từ CAN_DON → SAN_SANG (AVAILABLE)
6. Phòng sẵn sàng cho Lễ tân thực hiện Check-in cho khách tiếp theo
```

## 3. Các Tình Huống Đặc Biệt

### 3.1. Khách Không Đến (No-show)
```
Tình huống: Khách đặt phòng nhưng không đến trong giờ giữ phòng

1. Quá giờ giữ phòng mặc định (ví dụ 18:00)
2. Lễ tân liên hệ khách hàng xác nhận
3. Nếu khách không đến:
   - Đánh dấu "Khách không đến"
   - Chuyển trạng thái booking: KHACH_KHONG_DEN
   - Giải phóng phòng (chuyển về SAN_SANG)
   - Áp dụng chính sách phí no-show nếu có
```

### 3.2. Hủy Đặt Phòng
```
A. Hủy Trong Hạn Miễn Phí:
1. Khách liên hệ hủy phòng
2. Lễ tân kiểm tra thời gian hủy so với chính sách
3. Nếu trong hạn miễn phí:
   - Hủy đặt phòng không tính phí
   - Chuyển trạng thái: DA_HUY
   - Giải phóng phòng

B. Hủy Quá Hạn:
1. Tính phí hủy theo chính sách
2. Lập hóa đơn phí hủy (nếu có)
3. Chuyển trạng thái: DA_HUY
4. Giải phóng phòng
```

### 3.3. Đổi Phòng
```
Tình huống: Khách muốn đổi sang phòng khác

1. Kiểm tra phòng đích còn trống không
2. So sánh giá giữa phòng cũ và phòng mới
3. Nếu OK:
   - Cập nhật room_id trong booking
   - Tính lại giá nếu khác loại phòng
   - Cập nhật trạng thái phòng (cũ: SAN_SANG, mới: CO_KHACH)
```

### 3.4. Sửa Hóa Đơn Đã Thanh Toán
```
Tình huống: Phát hiện sai sót trong hóa đơn đã thanh toán

1. Không được sửa hóa đơn gốc
2. Tạo hóa đơn điều chỉnh:
   - Tham chiếu hóa đơn gốc
   - Nêu rõ lý do điều chỉnh
   - Số tiền điều chỉnh (dương/âm)
3. Nếu khách phải trả thêm: thu tiền bổ sung
4. Nếu trả lại khách: hoàn tiền và ghi nhận
```

## 4. Luồng Báo Cáo và Quản Lý

### 4.1. Báo Cáo Hàng Ngày (Chủ Cơ Sở)
```
1. Đăng nhập hệ thống
2. Xem báo cáo công suất:
   - Tỷ lệ lấp đầy theo ngày/tuần/tháng
   - So sánh với cùng kỳ năm trước
3. Xem báo cáo doanh thu:
   - Doanh thu tiền phòng
   - Doanh thu dịch vụ phụ thu
   - Breakdown theo loại phòng
4. Phân tích xu hướng để điều chỉnh giá
```

### 4.2. Quản Lý Tài Khoản (Quản Trị Viên)
```
1. Tạo tài khoản mới cho nhân viên
2. Phân quyền theo vai trò
3. Khóa/mở khóa tài khoản khi cần
4. Xem nhật ký hoạt động:
   - Ai làm gì, khi nào
   - Các thay đổi quan trọng
   - Phát hiện hành vi bất thường
```

### 4.3. Theo Dõi Hoạt Động Hệ Thống
```
Mọi thao tác quan trọng đều được ghi log:
- Tạo/sửa/hủy đặt phòng
- Nhận/trả phòng
- Tạo/thanh toán hóa đơn
- Thay đổi trạng thái phòng
- Đăng nhập/đăng xuất

Log bao gồm:
- Người thực hiện
- Thời gian
- Hành động
- Dữ liệu trước/sau thay đổi
```

## 5. Quy Tắc Nghiệp Vụ Quan Trọng

### 5.1. Chống Trùng Phòng
- Một phòng chỉ được gán cho một booking trong cùng khoảng thời gian
- Hệ thống tự động kiểm tra và chặn gán trùng
- Xử lý xung đột khi nhiều người gán đồng thời

### 5.2. Chu Trình Trạng Thái Phòng
```
SAN_SANG → CO_KHACH → CAN_DON → SAN_SANG
```
- Không bỏ qua bước dọn phòng
- Không nhận khách vào phòng chưa sẵn sàng

### 5.3. Điều Kiện Nghiệp Vụ
- Chỉ nhận phòng khi đã gán phòng cụ thể
- Chỉ trả phòng khi đã thanh toán đủ tiền
- Không sửa hóa đơn đã thanh toán (phải tạo điều chỉnh)

### 5.4. Phân Quyền Nghiêm Ngặt
- Mỗi vai trò chỉ truy cập được chức năng được phép
- Kiểm tra quyền ở cấp API, không chỉ UI
- Ghi log mọi truy cập trái phép