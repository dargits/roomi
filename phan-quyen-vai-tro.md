# Ma trận phân quyền vai trò – Hệ thống quản lý cơ sở lưu trú

Tài liệu này mô tả các vai trò (role), quyền hạn, phạm vi dữ liệu và giới hạn quyền tương ứng trong hệ thống. Dùng làm tham chiếu cho agent khi xử lý yêu cầu nghiệp vụ hoặc kiểm tra phân quyền trước khi thực hiện hành động.

---

## 1. Quản lý / Chủ cơ sở (Manager / Owner)

**Mục tiêu sử dụng:**
Nắm bức tranh công suất và doanh thu để tối ưu giá và vận hành.

**Quyền hạn chính:**
- Cấu hình loại phòng và giá theo mùa
- Xem toàn bộ báo cáo
- Quản lý phòng và dịch vụ phụ thu

**Dữ liệu được truy cập:**
Toàn bộ dữ liệu của cơ sở lưu trú do mình quản lý.

**Giới hạn quyền:**
- Không tự ý sửa hóa đơn đã thanh toán
- Chỉ lập hóa đơn điều chỉnh theo quy tắc

---

## 2. Lễ tân (Receptionist)

**Mục tiêu sử dụng:**
Nhận đặt phòng, gán phòng chống trùng, làm thủ tục nhận phòng và trả phòng nhanh.

**Quyền hạn chính:**
- Tạo và cập nhật đặt phòng
- Gán phòng trên lịch
- Nhận phòng, trả phòng
- Ghi dịch vụ phụ thu và thu tiền

**Dữ liệu được truy cập:**
Đặt phòng, lịch phòng, khách lưu trú và hóa đơn trong ca làm việc.

**Giới hạn quyền:**
- Không cấu hình giá theo mùa
- Không xem báo cáo doanh thu tổng hợp trừ khi được cho phép

---

## 3. Nhân viên buồng phòng (Housekeeping)

**Mục tiêu sử dụng:**
Nhận danh sách phòng cần dọn và cập nhật phòng thành sẵn sàng đúng lúc.

**Quyền hạn chính:**
- Xem danh sách phòng cần dọn
- Cập nhật trạng thái buồng phòng

**Dữ liệu được truy cập:**
Trạng thái buồng phòng và danh sách phòng cần dọn.

**Giới hạn quyền:**
- Không truy cập đặt phòng, hóa đơn hay báo cáo doanh thu

---

## 4. Kế toán (Accountant)

**Mục tiêu sử dụng:**
Bảo đảm hóa đơn và thanh toán chính xác, xuất báo cáo doanh thu.

**Quyền hạn chính:**
- Xem và đối soát hóa đơn
- Ghi nhận thanh toán
- Lập hóa đơn điều chỉnh
- Xuất báo cáo

**Dữ liệu được truy cập:**
Hóa đơn lưu trú, thanh toán và báo cáo doanh thu.

**Giới hạn quyền:**
- Không thay đổi cấu hình phòng
- Không tự tạo đặt phòng

---

## 5. Quản trị hệ thống (System Admin)

**Mục tiêu sử dụng:**
Bảo đảm hệ thống vận hành an toàn, phân quyền đúng vai trò.

**Quyền hạn chính:**
- Quản lý tài khoản người dùng
- Phân quyền theo vai trò
- Xem nhật ký hoạt động

**Dữ liệu được truy cập:**
Tài khoản người dùng, cấu hình phân quyền và nhật ký hoạt động.

**Giới hạn quyền:**
- Không can thiệp nội dung nghiệp vụ đặt phòng hay hóa đơn khi không cần thiết

---

## Bảng tổng hợp

| Vai trò | Mục tiêu | Quyền hạn chính | Dữ liệu truy cập | Giới hạn |
|---|---|---|---|---|
| Quản lý / Chủ cơ sở | Tối ưu giá và vận hành | Cấu hình giá, xem báo cáo, quản lý phòng & dịch vụ | Toàn bộ dữ liệu cơ sở | Không sửa hóa đơn đã thanh toán |
| Lễ tân | Nhận/trả phòng nhanh, chống trùng | Tạo/cập nhật đặt phòng, gán phòng, thu tiền | Đặt phòng, lịch, khách, hóa đơn trong ca | Không cấu hình giá, không xem báo cáo tổng hợp |
| Nhân viên buồng phòng | Dọn phòng đúng lúc | Xem & cập nhật trạng thái buồng phòng | Trạng thái buồng phòng | Không truy cập đặt phòng/hóa đơn/báo cáo |
| Kế toán | Hóa đơn & doanh thu chính xác | Đối soát, ghi nhận thanh toán, điều chỉnh, xuất báo cáo | Hóa đơn, thanh toán, báo cáo | Không sửa cấu hình phòng, không tạo đặt phòng |
| Quản trị hệ thống | Vận hành an toàn | Quản lý tài khoản, phân quyền, xem nhật ký | Tài khoản, cấu hình phân quyền, nhật ký | Không can thiệp nghiệp vụ đặt phòng/hóa đơn |

---

## Ghi chú cho agent

- Trước khi thực hiện một hành động, xác định vai trò của người yêu cầu và kiểm tra hành động đó có nằm trong "Quyền hạn chính" không.
- Nếu hành động thuộc "Giới hạn quyền", agent phải từ chối hoặc yêu cầu xác nhận/ủy quyền bổ sung.
- Agent chỉ được truy xuất dữ liệu nằm trong phạm vi "Dữ liệu được truy cập" tương ứng với vai trò.
