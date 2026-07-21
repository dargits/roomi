# API Documentation — Giá Theo Mùa & Quản Lý Phòng

> Ngày cập nhật: 2025-07-21  
> Base URL: `http://localhost:8080`  
> Authentication: Tất cả API yêu cầu header `Authorization: <token>` (lấy từ login)

---

## Response Format chung

Tất cả API trả về cùng một format:

```json
{
  "mess": "Thông báo",
  "data": { }
}
```

Lỗi trả về:

```json
{
  "mess": "Mô tả lỗi",
  "code": "ERROR_CODE"
}
```

---

## 1. Loại Phòng — `/api/v1/room-types`

### GET `/api/v1/room-types`
Lấy danh sách tất cả loại phòng.

**Response 200:**
```json
{
  "mess": "Thành công",
  "data": [
    {
      "id": 1,
      "name": "Phòng Standard",
      "capacity": 2,
      "amenities": "TV, Điều hòa, WiFi",
      "basePrice": 500000
    }
  ]
}
```

---

### GET `/api/v1/room-types/{id}`
Lấy chi tiết một loại phòng.

**Response 200:**
```json
{
  "mess": "Thành công",
  "data": {
    "id": 1,
    "name": "Phòng Standard",
    "capacity": 2,
    "amenities": "TV, Điều hòa, WiFi",
    "basePrice": 500000
  }
}
```

---

### POST `/api/v1/room-types`
Tạo loại phòng mới.

**Request Body:**
```json
{
  "name": "Phòng Deluxe",
  "capacity": 3,
  "amenities": "TV, Điều hòa, WiFi, Bồn tắm",
  "basePrice": 800000
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| name | string | ✅ | Tên loại phòng, unique |
| capacity | number | ✅ | Sức chứa tối đa |
| amenities | string | ❌ | Mô tả tiện nghi |
| basePrice | number | ✅ | Giá mặc định (VND) |

**Response 201:**
```json
{
  "mess": "Tạo loại phòng thành công",
  "data": {
    "id": 2,
    "name": "Phòng Deluxe",
    "capacity": 3,
    "amenities": "TV, Điều hòa, WiFi, Bồn tắm",
    "basePrice": 800000
  }
}
```

---

### PUT `/api/v1/room-types/{id}`
Cập nhật loại phòng.

**Request Body:** Giống POST

**Response 200:**
```json
{
  "mess": "Cập nhật loại phòng thành công",
  "data": { ... }
}
```

---

### DELETE `/api/v1/room-types/{id}`
Xóa loại phòng.

**Response 200:**
```json
{
  "mess": "Xóa loại phòng thành công",
  "data": null
}
```

---

## 2. Phòng — `/api/v1/rooms`

### GET `/api/v1/rooms`
Lấy danh sách tất cả phòng.

**Response 200:**
```json
{
  "mess": "Thành công",
  "data": [
    {
      "id": 1,
      "roomType": {
        "id": 1,
        "name": "Phòng Standard",
        "capacity": 2,
        "amenities": "TV, Điều hòa, WiFi",
        "basePrice": 500000
      },
      "roomNumber": "101",
      "floor": "1",
      "status": "AVAILABLE",
      "note": "Phòng góc view đẹp"
    }
  ]
}
```

---

### GET `/api/v1/rooms/{id}`
Lấy chi tiết một phòng.

**Response 200:**
```json
{
  "mess": "Thành công",
  "data": {
    "id": 1,
    "roomType": { ... },
    "roomNumber": "101",
    "floor": "1",
    "status": "AVAILABLE",
    "note": "Phòng góc view đẹp"
  }
}
```

---

### POST `/api/v1/rooms`
Tạo phòng mới.

**Request Body:**
```json
{
  "roomTypeId": 1,
  "roomNumber": "101",
  "floor": "1",
  "status": "AVAILABLE",
  "note": "Phòng góc view đẹp"
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| roomTypeId | number | ✅ | ID loại phòng |
| roomNumber | string | ✅ | Số phòng, unique |
| floor | string | ❌ | Tầng |
| status | string | ❌ | Mặc định `AVAILABLE` |
| note | string | ❌ | Ghi chú |

**Các giá trị `status` hợp lệ:**

| Value | Ý nghĩa |
|-------|---------|
| `AVAILABLE` | Trống, sẵn sàng đón khách |
| `OCCUPIED` | Đang có khách ở |
| `NEEDS_CLEANING` | Cần dọn dẹp sau khi khách trả |
| `MAINTENANCE` | Đang bảo trì |

**Response 201:**
```json
{
  "mess": "Tạo phòng thành công",
  "data": {
    "id": 1,
    "roomType": { ... },
    "roomNumber": "101",
    "floor": "1",
    "status": "AVAILABLE",
    "note": "Phòng góc view đẹp"
  }
}
```

---

### PUT `/api/v1/rooms/{id}`
Cập nhật thông tin phòng hoặc **đổi trạng thái phòng** (gán phòng / trả phòng / bảo trì).

**Request Body:** Giống POST

**Vòng đời trạng thái phòng:**
```
AVAILABLE → OCCUPIED     (nhận khách)
OCCUPIED  → NEEDS_CLEANING  (trả phòng)
NEEDS_CLEANING → AVAILABLE  (dọn xong)
AVAILABLE / OCCUPIED → MAINTENANCE  (khóa bảo trì)
MAINTENANCE → AVAILABLE  (bảo trì xong)
```

**Response 200:**
```json
{
  "mess": "Cập nhật phòng thành công",
  "data": { ... }
}
```

---

### DELETE `/api/v1/rooms/{id}`
Xóa phòng.

**Response 200:**
```json
{
  "mess": "Xóa phòng thành công",
  "data": null
}
```

---

## 3. Giá Theo Mùa — `/api/v1/seasonal-rates`

> Quyền CUD (tạo/sửa/xóa): chỉ `ADMIN` và `OWNER`  
> Quyền đọc & tra cứu: tất cả user đã đăng nhập

### GET `/api/v1/seasonal-rates`
Lấy toàn bộ danh sách giá theo mùa.

**Response 200:**
```json
{
  "mess": "Thành công",
  "data": [
    {
      "id": 1,
      "roomTypeId": 1,
      "roomTypeName": "Phòng Standard",
      "startDate": "2025-06-01",
      "endDate": "2025-08-31",
      "price": 750000
    }
  ]
}
```

---

### GET `/api/v1/seasonal-rates/room-type/{roomTypeId}`
Lấy tất cả giá theo mùa của một loại phòng.

**Response 200:**
```json
{
  "mess": "Thành công",
  "data": [
    {
      "id": 1,
      "roomTypeId": 1,
      "roomTypeName": "Phòng Standard",
      "startDate": "2025-06-01",
      "endDate": "2025-08-31",
      "price": 750000
    },
    {
      "id": 2,
      "roomTypeId": 1,
      "roomTypeName": "Phòng Standard",
      "startDate": "2025-12-30",
      "endDate": "2026-01-03",
      "price": 1000000
    }
  ]
}
```

---

### GET `/api/v1/seasonal-rates/{id}`
Lấy chi tiết một mức giá.

**Response 200:**
```json
{
  "mess": "Thành công",
  "data": {
    "id": 1,
    "roomTypeId": 1,
    "roomTypeName": "Phòng Standard",
    "startDate": "2025-06-01",
    "endDate": "2025-08-31",
    "price": 750000
  }
}
```

---

### POST `/api/v1/seasonal-rates`
Tạo mức giá theo mùa. *(ADMIN / OWNER only)*

**Request Body:**
```json
{
  "roomTypeId": 1,
  "startDate": "2025-06-01",
  "endDate": "2025-08-31",
  "price": 750000
}
```

| Field | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| roomTypeId | number | ✅ | ID loại phòng |
| startDate | string | ✅ | Ngày bắt đầu `YYYY-MM-DD` (bao gồm) |
| endDate | string | ✅ | Ngày kết thúc `YYYY-MM-DD` (không bao gồm ngày này) |
| price | number | ✅ | Giá áp dụng (VND, > 0) |

> **Lưu ý:** `endDate` phải sau `startDate`. Nếu khoảng ngày trùng với mức giá đã có cùng loại phòng, API sẽ báo lỗi `RATE_003`.

**Response 201:**
```json
{
  "mess": "Tạo giá theo mùa thành công",
  "data": {
    "id": 1,
    "roomTypeId": 1,
    "roomTypeName": "Phòng Standard",
    "startDate": "2025-06-01",
    "endDate": "2025-08-31",
    "price": 750000
  }
}
```

---

### PUT `/api/v1/seasonal-rates/{id}`
Cập nhật mức giá. *(ADMIN / OWNER only)*

**Request Body:** Giống POST

**Response 200:**
```json
{
  "mess": "Cập nhật giá theo mùa thành công",
  "data": { ... }
}
```

---

### DELETE `/api/v1/seasonal-rates/{id}`
Xóa mức giá. *(ADMIN / OWNER only)*

**Response 200:**
```json
{
  "mess": "Xóa giá theo mùa thành công",
  "data": null
}
```

---

### GET `/api/v1/seasonal-rates/price-lookup`
**Tra cứu giá áp dụng cho một loại phòng vào một ngày cụ thể.**  
API tự động trả về giá theo mùa nếu ngày đó nằm trong khoảng đã cấu hình, ngược lại trả về giá cơ bản.

**Query Params:**

| Param | Type | Bắt buộc | Mô tả |
|-------|------|----------|-------|
| roomTypeId | number | ✅ | ID loại phòng |
| date | string | ✅ | Ngày tra cứu `YYYY-MM-DD` |

**Ví dụ request:**
```
GET /api/v1/seasonal-rates/price-lookup?roomTypeId=1&date=2025-07-15
```

**Response 200 — Ngày nằm trong mùa cao điểm:**
```json
{
  "mess": "Thành công",
  "data": {
    "roomTypeId": 1,
    "roomTypeName": "Phòng Standard",
    "date": "2025-07-15",
    "price": 750000,
    "basePrice": 500000,
    "isSeasonalRate": true,
    "priceSource": "SEASONAL_RATE"
  }
}
```

**Response 200 — Ngày bình thường:**
```json
{
  "mess": "Thành công",
  "data": {
    "roomTypeId": 1,
    "roomTypeName": "Phòng Standard",
    "date": "2025-10-10",
    "price": 500000,
    "basePrice": 500000,
    "isSeasonalRate": false,
    "priceSource": "BASE_PRICE"
  }
}
```

> **Gợi ý dùng cho FE:** Gọi API này khi khách chọn ngày check-in để hiển thị giá chính xác trước khi tạo booking.

---

## 4. Error Codes

| Code | HTTP | Mô tả |
|------|------|-------|
| `AUTH_004` | 400 | Session hết hạn |
| `AUTH_005` | 400 | Token không hợp lệ |
| `VAL_001` | 400 | Dữ liệu đầu vào không hợp lệ |
| `PERM_002` | 400 | Không đủ quyền (cần ADMIN hoặc OWNER) |
| `RATE_001` | 400 | Loại phòng không tồn tại |
| `RATE_002` | 400 | Mức giá không tồn tại |
| `RATE_003` | 400 | Khoảng ngày bị trùng với mức giá đã có |
| `RATE_004` | 400 | Ngày kết thúc phải sau ngày bắt đầu |
| `SYS_001` | 500 | Lỗi hệ thống |
