# API Documentation — Đổi Phòng (Change Room)

> Ngày tạo: 2026-07-23  
> Base URL: `http://localhost:8080`  
> Authentication: Header `Authorization: <token>` (lấy từ login)

---

## Tổng quan

Tính năng đổi phòng cho phép chuyển khách từ phòng hiện tại sang phòng khác **trong cùng một loại phòng** mà không cần huỷ hay tạo lại booking.

### Điều kiện áp dụng

| Trạng thái booking | Có thể đổi phòng? | Ghi chú |
|--------------------|-------------------|---------|
| `NEW`              | ❌ | Dùng `assign-room` để gán phòng lần đầu |
| `CONFIRMED`        | ✅ | Khách chưa check-in |
| `CHECKED_IN`       | ✅ | Khách đang ở trong phòng |
| `CHECKED_OUT`      | ❌ | Booking đã hoàn thành |
| `CANCELLED`        | ❌ | Booking đã huỷ |
| `NO_SHOW`          | ❌ | Khách không đến |

### Logic thay đổi trạng thái phòng

**Khi booking đang `CONFIRMED` (chưa check-in):**
```
Phòng cũ:  bất kỳ  →  AVAILABLE
Phòng mới: giữ nguyên status hiện tại
```

**Khi booking đang `CHECKED_IN` (khách đang ở):**
```
Phòng cũ:  OCCUPIED  →  NEEDS_CLEANING
Phòng mới: bất kỳ    →  OCCUPIED
```

---

## Endpoint

### PATCH `/api/v1/bookings/{id}/change-room`

Đổi phòng cho một booking đang hoạt động.

**Path Parameter:**

| Tên | Kiểu   | Mô tả          |
|-----|--------|----------------|
| id  | number | ID của booking |

**Request Body:**

```json
{
  "roomId": 5,
  "reason": "Khách yêu cầu phòng tầng cao hơn"
}
```

| Field    | Kiểu   | Bắt buộc | Mô tả                          |
|----------|--------|----------|--------------------------------|
| `roomId` | number | ✅       | ID phòng muốn chuyển sang      |
| `reason` | string | ❌       | Lý do đổi phòng (ghi chú nội bộ) |

**Response thành công (200):**

```json
{
  "mess": "Đổi phòng thành công",
  "data": {
    "id": 12,
    "guestId": 3,
    "guestName": "Nguyễn Văn A",
    "guestFullName": "Nguyễn Văn A",
    "guestPhone": "0901234567",
    "guestIdNumber": "001234567890",
    "guestEmail": "nguyenvana@email.com",
    "roomTypeId": 1,
    "roomTypeName": "Phòng Deluxe",
    "roomId": 5,
    "roomNumber": "205",
    "checkInDate": "2026-08-01",
    "checkOutDate": "2026-08-05",
    "nights": 4,
    "status": "CHECKED_IN",
    "source": "WALK_IN",
    "note": null,
    "expectedPrice": 3200000,
    "createdById": 1,
    "createdByName": "Admin",
    "createdAt": "2026-07-20T10:30:00"
  }
}
```

---

## Các lỗi có thể xảy ra

| Error Code          | HTTP | Mô tả |
|---------------------|------|-------|
| `BOOK_001`          | 400  | Không tìm thấy booking với ID đã cho |
| `BOOK_005`          | 400  | Booking không ở trạng thái CONFIRMED hoặc CHECKED_IN |
| `BOOK_007`          | 400  | Phòng mới trùng với phòng hiện tại |
| `BOOK_008`          | 400  | Booking chưa được gán phòng — dùng `assign-room` thay thế |
| `BOOK_003`          | 400  | Phòng mới đã có booking khác trong cùng khoảng thời gian |
| `BOOK_006`          | 400  | Phòng mới không cùng loại phòng với booking |
| `VAL_001`           | 400  | `roomId` bị thiếu hoặc không hợp lệ |
| `AUTH_004`/`AUTH_005` | 400 | Token hết hạn hoặc không hợp lệ |

**Ví dụ response lỗi — booking sai trạng thái:**

```json
{
  "mess": "Chỉ có thể đổi phòng khi booking ở trạng thái CONFIRMED hoặc CHECKED_IN (hiện tại: NEW)",
  "code": "BOOK_005"
}
```

**Ví dụ response lỗi — phòng mới bị trùng lịch:**

```json
{
  "mess": "Phòng 205 đã được đặt trong khoảng thời gian [2026-08-01 → 2026-08-05]. Vui lòng chọn phòng khác hoặc đổi ngày.",
  "code": "BOOK_003"
}
```

**Ví dụ response lỗi — sai loại phòng:**

```json
{
  "mess": "Phòng 301 thuộc loại \"Phòng Standard\", không khớp với loại phòng yêu cầu \"Phòng Deluxe\"",
  "code": "BOOK_006"
}
```

---

## So sánh với assign-room

| Tiêu chí              | `assign-room`              | `change-room`                     |
|-----------------------|----------------------------|-----------------------------------|
| Mục đích              | Gán phòng lần đầu          | Đổi sang phòng khác               |
| Trạng thái hợp lệ     | `NEW`, `CONFIRMED`         | `CONFIRMED`, `CHECKED_IN`         |
| Booking phải có phòng | Không                      | Có (bắt buộc đã có phòng)         |
| Phòng mới = phòng cũ  | Không áp dụng              | Không cho phép                    |
| Cách gọi              | `PATCH` + query `?roomId=` | `PATCH` + JSON body                |

---

## Ví dụ curl

```bash
# Đổi phòng cho booking ID 12 sang phòng ID 5
curl -X PATCH http://localhost:8080/api/v1/bookings/12/change-room \
  -H "Authorization: your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": 5,
    "reason": "Khách yêu cầu phòng tầng cao hơn"
  }'
```
