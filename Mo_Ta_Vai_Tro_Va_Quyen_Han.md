# Mô tả chi tiết Vai trò và Quyền hạn — Dự án "Lưu Trú Số"

> Tài liệu này được biên soạn lại từ file `Lưu_Trú_Số.xlsx`, tổng hợp thông tin từ các sheet **User Roles**, **Epics**, **Product Backlog (User Stories)** và **Acceptance Criteria** để mô tả chi tiết chức năng và quyền hạn của từng vai trò trong hệ thống.

Hệ thống có **5 vai trò nội bộ** được định nghĩa chính thức (VT-01 → VT-05), cộng thêm **1 vai trò bên ngoài** là "Khách lưu trú" xuất hiện trong nhóm chức năng Cổng đặt phòng trực tiếp (NCL-09).

---

## 1. VT-01 — Chủ cơ sở

**Mô tả:** Người sở hữu hoặc quản lý homestay/khách sạn nhỏ.

**Mục tiêu sử dụng:** Nắm bức tranh công suất và doanh thu để tối ưu giá và vận hành.

**Dữ liệu được truy cập:** Toàn bộ dữ liệu của cơ sở lưu trú do mình quản lý.

**Giới hạn quyền:** Không tự ý sửa hóa đơn đã thanh toán; chỉ được lập hóa đơn điều chỉnh theo quy tắc.

### Quyền hạn chính
- Cấu hình loại phòng và giá theo mùa
- Xem toàn bộ báo cáo (công suất, doanh thu)
- Quản lý phòng và dịch vụ phụ thu

### Chức năng chi tiết (theo User Story)
| Epic | Chức năng | Mô tả |
|---|---|---|
| NCL-02 Quản lý phòng, loại phòng và giá | Quản lý loại phòng | Tạo và sửa loại phòng cùng sức chứa, mô tả tiện nghi |
| NCL-02 | Quản lý phòng | Tạo phòng, gán loại phòng, đặt số phòng và trạng thái ban đầu |
| NCL-02 | Cấu hình giá theo mùa | Khai báo bảng giá theo khoảng thời gian cho từng loại phòng |
| NCL-02 | Quản lý danh mục dịch vụ phụ thu | Tạo danh mục dịch vụ (ăn sáng, đưa đón, giặt là...) kèm đơn giá |
| NCL-04 Nhận phòng, trả phòng | Quản lý khách hàng thân thiết | Cấu hình mức thân thiết theo điểm tích lũy, xem danh sách khách theo mức |
| NCL-05 Dịch vụ phụ thu, hóa đơn, thanh toán | Quản lý kho đồ dùng | Khai báo đồ dùng, số lượng tồn, ngưỡng cảnh báo tồn thấp |
| NCL-06 Quản lý dọn phòng | Khóa phòng bảo trì | Đặt phòng vào trạng thái bảo trì trong một khoảng thời gian, không nhận đặt trong lúc đó |
| NCL-07 Báo cáo | Báo cáo công suất phòng | Xem tỷ lệ phòng có khách trên tổng phòng theo ngày/khoảng thời gian |
| NCL-07 | Báo cáo doanh thu | Xem doanh thu tiền phòng + dịch vụ theo ngày, loại phòng, khoảng thời gian |
| NCL-07 | Bảng điều khiển doanh thu nâng cao | Xem biểu đồ doanh thu trực quan theo nhiều chiều trên một màn hình |
| NCL-07 | Dự báo công suất theo mùa | Xem ước tính công suất phòng sắp tới dựa trên dữ liệu quá khứ |
| NCL-09 Cổng đặt phòng cho khách | Phản hồi đánh giá | Đọc đánh giá của khách và viết phản hồi công khai |
| NCL-10 Quản trị hệ thống | Cấu hình chính sách hủy | Khai báo thời hạn hủy miễn phí và mức phí hủy theo loại phòng |

---

## 2. VT-02 — Lễ tân

**Mô tả:** Nhân viên tiếp nhận và phục vụ khách tại quầy.

**Mục tiêu sử dụng:** Nhận đặt phòng, gán phòng chống trùng, làm thủ tục nhận/trả phòng nhanh.

**Dữ liệu được truy cập:** Đặt phòng, lịch phòng, khách lưu trú và hóa đơn trong ca làm việc.

**Giới hạn quyền:** Không cấu hình giá theo mùa; không xem báo cáo doanh thu tổng hợp trừ khi được cho phép.

### Quyền hạn chính
- Tạo và cập nhật đặt phòng, gán phòng trên lịch
- Nhận phòng, trả phòng
- Ghi nhận dịch vụ phụ thu và thu tiền

### Chức năng chi tiết (theo User Story)
| Epic | Chức năng | Mô tả |
|---|---|---|
| NCL-01 Đăng nhập, phân quyền | Đăng nhập hệ thống | Đăng nhập bằng tài khoản được cấp để vào đúng chức năng theo vai trò |
| NCL-01 | Đổi mật khẩu và đăng xuất | Tự đổi mật khẩu, đăng xuất an toàn |
| NCL-03 Lịch phòng, đặt phòng chống trùng | Xem lịch phòng trực quan | Xem sơ đồ phòng theo hàng phòng – cột ngày, mỗi đặt phòng là một dải thời gian |
| NCL-03 | Tạo đặt phòng | Nhập thông tin khách, loại phòng, ngày nhận/trả để giữ chỗ |
| NCL-03 | Gán phòng trên lịch chống trùng | Chọn phòng trống trên lịch để gán, hệ thống kiểm tra không gối thời gian |
| NCL-03 | Xử lý xung đột đặt phòng đồng thời | Khi 2 lễ tân cùng gán 1 phòng, hệ thống chỉ chấp nhận thao tác trước |
| NCL-03 | Hủy đặt phòng | Hủy đặt phòng chưa nhận phòng theo chính sách, giải phóng phòng |
| NCL-03 | Đổi phòng cho khách | Chuyển đặt phòng sang phòng khác còn trống, tính lại giá nếu khác loại |
| NCL-04 Nhận phòng, trả phòng | Nhận phòng | Xác nhận khách đến, chuyển đặt phòng sang trạng thái đã nhận phòng |
| NCL-04 | Trả phòng | Chốt dịch vụ phụ thu, xác nhận thanh toán, chuyển phòng sang cần dọn |
| NCL-04 | Đánh dấu khách không đến | Giải phóng phòng khi khách không đến sau giờ giữ phòng |
| NCL-04 | Quản lý khách và lịch sử lưu trú | Tra cứu khách theo tên/SĐT, xem lịch sử lưu trú trước |
| NCL-04 | Tra cứu hạng khách thân thiết khi phục vụ | Xem hạng và ưu đãi của khách quen để áp dụng đúng |
| NCL-05 Dịch vụ phụ thu, hóa đơn | Ghi nhận dịch vụ phụ thu | Chọn dịch vụ từ danh mục, gắn vào đặt phòng đang lưu trú |
| NCL-05 | Lập hóa đơn lưu trú | Tổng hợp tiền phòng + dịch vụ phụ thu − giảm giá để tạo hóa đơn |
| NCL-05 | Trừ kho khi ghi dịch vụ phụ thu | Hệ thống tự trừ tồn kho đồ dùng khi ghi dịch vụ có dùng đồ dùng |
| NCL-08 Thông báo, lịch sử | Nhắc nhận phòng và trả phòng | Nhận nhắc các đặt phòng sắp nhận/trả trong ngày |
| NCL-08 | Mô phỏng nhận đặt phòng từ kênh | Nạp tệp đặt phòng mô phỏng từ kênh ngoài vào lịch chung để thử hợp nhất |
| NCL-08 | Trải nghiệm trên thiết bị di động | Xem lịch phòng, nhận/trả phòng trên điện thoại |
| NCL-09 Cổng đặt phòng cho khách | Duyệt yêu cầu đặt phòng | Xem danh sách yêu cầu chờ duyệt, kiểm tra phòng trống, duyệt thành đặt phòng chính thức hoặc từ chối kèm lý do |

---

## 3. VT-03 — Nhân viên buồng phòng

**Mô tả:** Nhân viên phụ trách dọn dẹp và chuẩn bị phòng.

**Mục tiêu sử dụng:** Nhận danh sách phòng cần dọn và cập nhật phòng thành sẵn sàng đúng lúc.

**Dữ liệu được truy cập:** Trạng thái buồng phòng và danh sách phòng cần dọn.

**Giới hạn quyền:** Không truy cập đặt phòng, hóa đơn hay báo cáo doanh thu.

### Quyền hạn chính
- Xem danh sách phòng cần dọn
- Cập nhật trạng thái buồng phòng

### Chức năng chi tiết (theo User Story)
| Epic | Chức năng | Mô tả |
|---|---|---|
| NCL-06 Quản lý dọn phòng | Xem danh sách phòng cần dọn | Xem các phòng ở trạng thái cần dọn theo thứ tự ưu tiên |
| NCL-06 | Cập nhật trạng thái dọn phòng | Đánh dấu phòng đã dọn xong, hệ thống chuyển phòng sang sẵn sàng |
| NCL-08 Thông báo, lịch sử | Thông báo nội bộ phòng cần dọn | Nhận thông báo ngay khi có phòng chuyển sang trạng thái cần dọn |

---

## 4. VT-04 — Kế toán

**Mô tả:** Người phụ trách thu chi và đối soát của cơ sở.

**Mục tiêu sử dụng:** Bảo đảm hóa đơn và thanh toán chính xác, xuất báo cáo doanh thu.

**Dữ liệu được truy cập:** Hóa đơn lưu trú, thanh toán và báo cáo doanh thu.

**Giới hạn quyền:** Không thay đổi cấu hình phòng; không tự tạo đặt phòng.

### Quyền hạn chính
- Xem và đối soát hóa đơn
- Ghi nhận thanh toán
- Lập hóa đơn điều chỉnh
- Xuất báo cáo

### Chức năng chi tiết (theo User Story)
| Epic | Chức năng | Mô tả |
|---|---|---|
| NCL-05 Dịch vụ phụ thu, hóa đơn, thanh toán | Ghi nhận thanh toán | Ghi nhận số tiền khách trả (tiền mặt/chuyển khoản) cho tới khi đủ, chuyển hóa đơn sang đã thanh toán |
| NCL-05 | Lập hóa đơn điều chỉnh | Tạo hóa đơn điều chỉnh tham chiếu hóa đơn gốc đã thanh toán, nêu lý do và số tiền điều chỉnh |
| NCL-07 Báo cáo công suất và doanh thu | Xuất báo cáo | Chọn báo cáo (công suất/doanh thu) và khoảng thời gian, xuất ra tệp để tải về |

---

## 5. VT-05 — Quản trị viên

**Mô tả:** Người quản trị hệ thống và tài khoản người dùng.

**Mục tiêu sử dụng:** Bảo đảm hệ thống vận hành an toàn, phân quyền đúng vai trò.

**Dữ liệu được truy cập:** Tài khoản người dùng, cấu hình phân quyền và nhật ký hoạt động.

**Giới hạn quyền:** Không can thiệp nội dung nghiệp vụ đặt phòng hay hóa đơn khi không cần thiết.

### Quyền hạn chính
- Quản lý tài khoản người dùng
- Phân quyền theo vai trò
- Xem nhật ký hoạt động

### Chức năng chi tiết (theo User Story)
| Epic | Chức năng | Mô tả |
|---|---|---|
| NCL-01 Đăng nhập, phân quyền | Quản lý tài khoản người dùng | Tạo mới, sửa, khóa tài khoản; gán vai trò cho từng người |
| NCL-01 | Phân quyền theo vai trò | Cấu hình quyền xem/tạo/cập nhật/hủy cho từng vai trò trên từng chức năng |
| NCL-08 Thông báo, lịch sử | Xem lịch sử hoạt động | Xem nhật ký các thao tác thay đổi trạng thái đặt phòng, phòng, hóa đơn để truy vết |
| NCL-10 Quản trị hệ thống và cấu hình cơ sở | Cấu hình thông tin cơ sở | Nhập tên, địa chỉ, thông tin liên hệ, giờ nhận/trả phòng mặc định |
| NCL-10 | Nhập dữ liệu ban đầu | Tải lên tệp danh sách phòng và khách; hệ thống kiểm tra và nạp dữ liệu hợp lệ |
| NCL-10 | Xuất dữ liệu hệ thống | Chọn khoảng thời gian và loại dữ liệu (đặt phòng, hóa đơn) để xuất ra tệp |
| NCL-10 | Sao lưu và phục hồi dữ liệu | Tạo bản sao lưu định kỳ, phục hồi hệ thống từ bản sao lưu đã chọn |

---

## 6. Khách lưu trú (vai trò bên ngoài — dùng Cổng đặt phòng trực tiếp)

> Vai trò này không nằm trong bảng "User Roles" chính thức (VT-01 → VT-05) nhưng xuất hiện xuyên suốt Epic **NCL-09 — Cổng đặt phòng trực tiếp cho khách**, nên được liệt kê bổ sung để đầy đủ bức tranh phân quyền của hệ thống.

**Mô tả:** Người có nhu cầu lưu trú, sử dụng cổng đặt phòng trực tuyến của cơ sở (không cần tài khoản nội bộ).

**Mục tiêu sử dụng:** Tự tìm phòng trống, gửi yêu cầu đặt phòng và chia sẻ trải nghiệm sau khi lưu trú.

**Dữ liệu được truy cập:** Danh sách phòng trống công khai theo ngày, thông tin đặt phòng và đánh giá do chính mình gửi.

**Giới hạn quyền:** Không xem được lịch phòng đầy đủ hay dữ liệu của khách khác; yêu cầu đặt phòng phải được lễ tân duyệt mới trở thành đặt phòng chính thức; chỉ được đánh giá sau khi đã hoàn tất trả phòng.

### Chức năng chi tiết (theo User Story)
| Epic | Chức năng | Mô tả |
|---|---|---|
| NCL-09 Cổng đặt phòng trực tiếp cho khách | Xem phòng trống | Chọn khoảng thời gian, xem danh sách phòng còn trống kèm giá theo mùa |
| NCL-09 | Gửi yêu cầu đặt phòng | Chọn phòng trống, nhập thông tin liên hệ, gửi yêu cầu chờ lễ tân duyệt |
| NCL-09 | Đánh giá sau lưu trú | Sau khi trả phòng, chấm điểm và viết nhận xét về lần lưu trú |

---

## 7. Ma trận tổng hợp quyền theo Epic (Nhóm chức năng)

| Mã Epic | Tên Epic | Vai trò liên quan | Độ ưu tiên |
|---|---|---|---|
| NCL-01 | Đăng nhập và phân quyền | Quản trị viên, Chủ cơ sở, Lễ tân, Nhân viên buồng phòng, Kế toán | Bắt buộc |
| NCL-02 | Quản lý phòng, loại phòng và giá | Chủ cơ sở, Lễ tân | Bắt buộc |
| NCL-03 | Lịch phòng và đặt phòng chống trùng | Lễ tân, Chủ cơ sở | Bắt buộc |
| NCL-04 | Nhận phòng và trả phòng | Lễ tân, Chủ cơ sở | Bắt buộc |
| NCL-05 | Dịch vụ phụ thu, hóa đơn và thanh toán | Lễ tân, Kế toán | Bắt buộc |
| NCL-06 | Quản lý dọn phòng | Nhân viên buồng phòng, Lễ tân, Chủ cơ sở | Quan trọng |
| NCL-07 | Báo cáo công suất và doanh thu | Chủ cơ sở, Kế toán | Bắt buộc |
| NCL-08 | Thông báo và lịch sử hoạt động | Lễ tân, Nhân viên buồng phòng, Quản trị viên | Quan trọng |
| NCL-09 | Cổng đặt phòng trực tiếp cho khách | Khách lưu trú, Lễ tân, Chủ cơ sở | Nên có |
| NCL-10 | Quản trị hệ thống và cấu hình cơ sở | Quản trị viên, Chủ cơ sở | Quan trọng |

---

## 8. Ghi chú về kiểm soát quyền (từ Acceptance Criteria)

Nhiều tiêu chí chấp nhận trong file gốc xác nhận nguyên tắc **"Không có quyền" (Không đúng vai trò → từ chối truy cập)** được áp dụng nhất quán, ví dụ:
- Người không phải Quản trị viên mở chức năng quản lý tài khoản → hệ thống từ chối truy cập.
- Người không phải Nhân viên buồng phòng mở danh sách/cập nhật phòng cần dọn → hệ thống từ chối truy cập.
- Người không phải Chủ cơ sở mở chức năng phản hồi đánh giá → hệ thống từ chối truy cập.
- Người dùng không được xem báo cáo doanh thu/công suất mà cố mở → hệ thống từ chối truy cập.

Điều này khẳng định hệ thống áp dụng mô hình **phân quyền theo vai trò (Role-Based Access Control)**, do vai trò Quản trị viên cấu hình tại chức năng "Phân quyền theo vai trò" (NCL-01-CN-003).
