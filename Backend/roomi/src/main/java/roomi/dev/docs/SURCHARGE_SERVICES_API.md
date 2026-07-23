# API Dịch Vụ Phụ Thu

Tất cả response dùng envelope:

```json
{
  "mess": "Thành công",
  "data": {}
}
```

## Phân quyền

- `OWNER`: quản lý danh mục dịch vụ phụ thu và quản lý phát sinh.
- `RECEPTIONIST`: xem, tạo, sửa và xóa phát sinh theo booking.
- Các vai trò khác nhận lỗi `PERM_002`.

## Danh mục dịch vụ

### `GET /api/v1/surcharge-services?activeOnly=true`

Lấy danh sách dịch vụ. `activeOnly` mặc định là `true`.

### `POST /api/v1/surcharge-services`

Chỉ `OWNER`.

```json
{
  "name": "Giặt ủi",
  "description": "Tính theo kg",
  "unitPrice": 30000,
  "active": true
}
```

### `PUT /api/v1/surcharge-services/{id}`

Chỉ `OWNER`. Cập nhật tên, mô tả, đơn giá hoặc trạng thái.

### `PATCH /api/v1/surcharge-services/{id}/deactivate`

Chỉ `OWNER`. Ngừng cho ghi nhận mới nhưng không thay đổi phát sinh cũ.

### `DELETE /api/v1/surcharge-services/{id}`

Chỉ `OWNER`. Chỉ xóa được dịch vụ chưa từng có phát sinh; ngược lại API trả `SUR_003` và cần dùng deactivate.

## Phát sinh theo booking

### `GET /api/v1/bookings/{bookingId}/service-usages`

Lấy các lần khách sử dụng dịch vụ.

### `POST /api/v1/bookings/{bookingId}/service-usages`

Chỉ `OWNER` hoặc `RECEPTIONIST`; booking phải ở trạng thái `CHECKED_IN`.

```json
{
  "surchargeServiceId": 1,
  "quantity": 2,
  "note": "Giặt 2 kg"
}
```

Response lưu `serviceName` và `unitPrice` tại thời điểm ghi nhận. `lineTotal = unitPrice * quantity`.

### `PUT /api/v1/bookings/{bookingId}/service-usages/{usageId}`

Chỉ `OWNER` hoặc `RECEPTIONIST`; booking phải là `CHECKED_IN` hoặc `CHECKED_OUT`; không được sửa hóa đơn `PAID`. Nếu giữ nguyên `surchargeServiceId`, đơn giá snapshot cũ được giữ lại.

### `DELETE /api/v1/bookings/{bookingId}/service-usages/{usageId}`

Điều kiện tương tự update.

## Hóa đơn

### `GET /api/v1/bookings/{bookingId}/invoice`

Tạo invoice `PENDING` nếu chưa tồn tại và trả chi tiết các phát sinh. Sau mỗi thao tác thêm/sửa/xóa, invoice `PENDING` tự được tính lại:

$$
serviceCharge = \sum lineTotal
$$

$$
totalAmount = roomCharge + serviceCharge - discount
$$

Khi invoice là `PAID`, API thay đổi phát sinh trả `INV_001`.

## Tổng tiền trên booking

`GET /api/v1/bookings` và `GET /api/v1/bookings/{id}` bổ sung:

- `roomCharge`: tiền phòng, mặc định bằng `expectedPrice` khi chưa có invoice.
- `serviceCharge`: tổng phụ thu, mặc định `0`.
- `totalAmount`: tổng phải thanh toán.
