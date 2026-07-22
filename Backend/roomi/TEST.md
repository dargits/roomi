# Test Thủ Công — Quản Lý Loại Phòng (RoomType)

> Base URL: `http://localhost:8080`  
> Content-Type: `application/json`

---

## Mục lục

1. [Thêm loại phòng — POST /api/v1/room-types](#1-thêm-loại-phòng)
2. [Sửa loại phòng — PUT /api/v1/room-types/{id}](#2-sửa-loại-phòng)
3. [Xóa loại phòng — DELETE /api/v1/room-types/{id}](#3-xóa-loại-phòng)
4. [Lấy danh sách — GET /api/v1/room-types](#4-lấy-danh-sách-phụ-trợ)
5. [Lấy theo id — GET /api/v1/room-types/{id}](#5-lấy-theo-id-phụ-trợ)

---

## 1. Thêm loại phòng

**Endpoint:** `POST /api/v1/room-types`

---

### TC-01 — Thêm thành công

**Request**
```
POST http://localhost:8080/api/v1/room-types
Content-Type: application/json
```
```json
{
  "name": "Deluxe",
  "capacity": 2,
  "amenities": "WiFi, TV, Điều hòa",
  "basePrice": 500000
}
```

**Expected Response — 201 Created**
```json
{
  "mess": "Tạo loại phòng thành công",
  "data": {
    "id": 1,
    "name": "Deluxe",
    "capacity": 2,
    "amenities": "WiFi, TV, Điều hòa",
    "basePrice": 500000
  }
}
```

---

### TC-02 — Thêm thành công không có amenities (field tùy chọn)

**Request**
```json
{
  "name": "Standard",
  "capacity": 1,
  "basePrice": 300000
}
```

**Expected Response — 201 Created**
```json
{
  "mess": "Tạo loại phòng thành công",
  "data": {
    "id": 2,
    "name": "Standard",
    "capacity": 1,
    "amenities": null,
    "basePrice": 300000
  }
}
```

---

### TC-03 — Thất bại: tên loại phòng đã tồn tại

> Chạy sau TC-01 (đã có "Deluxe" trong DB)

**Request**
```json
{
  "name": "Deluxe",
  "capacity": 3,
  "amenities": "WiFi",
  "basePrice": 600000
}
```

**Expected Response — 400 Bad Request**
```json
{
  "mess": "Loại phòng đã tồn tại",
  "code": "VAL_001"
}
```

---

### TC-04 — Thất bại: thiếu `name`

**Request**
```json
{
  "capacity": 2,
  "amenities": "WiFi",
  "basePrice": 500000
}
```

**Expected Response — 400 Bad Request**
```json
{
  "mess": "name không được để trống",
  "code": "VAL_001"
}
```

---

### TC-05 — Thất bại: `name` rỗng

**Request**
```json
{
  "name": "",
  "capacity": 2,
  "amenities": "WiFi",
  "basePrice": 500000
}
```

**Expected Response — 400 Bad Request**
```json
{
  "mess": "name không được để trống",
  "code": "VAL_001"
}
```

---

### TC-06 — Thất bại: thiếu `capacity`

**Request**
```json
{
  "name": "Suite",
  "amenities": "WiFi",
  "basePrice": 500000
}
```

**Expected Response — 400 Bad Request**
```json
{
  "mess": "capacity không được để trống",
  "code": "VAL_001"
}
```

---

### TC-07 — Thất bại: thiếu `basePrice`

**Request**
```json
{
  "name": "Suite",
  "capacity": 2,
  "amenities": "WiFi"
}
```

**Expected Response — 400 Bad Request**
```json
{
  "mess": "basePrice không được để trống",
  "code": "VAL_001"
}
```

---

## 2. Sửa loại phòng

**Endpoint:** `PUT /api/v1/room-types/{id}`

> Giả sử đã có loại phòng với id = 1 (tên "Deluxe") từ bước thêm ở trên.

---

### TC-08 — Sửa thành công

**Request**
```
PUT http://localhost:8080/api/v1/room-types/1
Content-Type: application/json
```
```json
{
  "name": "Deluxe Plus",
  "capacity": 3,
  "amenities": "WiFi, TV, Điều hòa, Minibar",
  "basePrice": 750000
}
```

**Expected Response — 200 OK**
```json
{
  "mess": "Cập nhật loại phòng thành công",
  "data": {
    "id": 1,
    "name": "Deluxe Plus",
    "capacity": 3,
    "amenities": "WiFi, TV, Điều hòa, Minibar",
    "basePrice": 750000
  }
}
```

---

### TC-09 — Sửa thành công giữ nguyên tên (không bị báo duplicate)

**Request**
```
PUT http://localhost:8080/api/v1/room-types/1
```
```json
{
  "name": "Deluxe Plus",
  "capacity": 4,
  "amenities": "WiFi, TV",
  "basePrice": 800000
}
```

**Expected Response — 200 OK**
```json
{
  "mess": "Cập nhật loại phòng thành công",
  "data": {
    "id": 1,
    "name": "Deluxe Plus",
    "capacity": 4,
    "basePrice": 800000
  }
}
```

---

### TC-10 — Thất bại: id không tồn tại

**Request**
```
PUT http://localhost:8080/api/v1/room-types/9999
```
```json
{
  "name": "Superior",
  "capacity": 2,
  "amenities": "WiFi",
  "basePrice": 500000
}
```

**Expected Response — 400 Bad Request**
```json
{
  "mess": "Không tìm thấy loại phòng",
  "code": "VAL_001"
}
```

---

### TC-11 — Thất bại: tên mới đã tồn tại ở bản ghi khác

> Giả sử đã có id=1 tên "Deluxe Plus" và id=2 tên "Standard".  
> Thử đổi id=1 sang tên "Standard".

**Request**
```
PUT http://localhost:8080/api/v1/room-types/1
```
```json
{
  "name": "Standard",
  "capacity": 3,
  "amenities": "WiFi",
  "basePrice": 600000
}
```

**Expected Response — 400 Bad Request**
```json
{
  "mess": "Loại phòng đã tồn tại",
  "code": "VAL_001"
}
```

---

### TC-12 — Thất bại: `name` rỗng khi sửa (validation)

**Request**
```
PUT http://localhost:8080/api/v1/room-types/1
```
```json
{
  "name": "",
  "capacity": 2,
  "amenities": "WiFi",
  "basePrice": 500000
}
```

**Expected Response — 400 Bad Request**
```json
{
  "mess": "name không được để trống",
  "code": "VAL_001"
}
```

---

### TC-13 — Thất bại: `basePrice` null khi sửa (validation)

**Request**
```json
{
  "name": "Superior",
  "capacity": 2,
  "amenities": "WiFi"
}
```

**Expected Response — 400 Bad Request**
```json
{
  "mess": "basePrice không được để trống",
  "code": "VAL_001"
}
```

---

## 3. Xóa loại phòng

**Endpoint:** `DELETE /api/v1/room-types/{id}`

---

### TC-14 — Xóa thành công

**Request**
```
DELETE http://localhost:8080/api/v1/room-types/1
```
*(Không có request body)*

**Expected Response — 200 OK**
```json
{
  "mess": "Xóa loại phòng thành công",
  "data": null
}
```

> Verify lại: gọi `GET /api/v1/room-types/1` sau đó phải nhận 400 "Không tìm thấy loại phòng".

---

### TC-15 — Thất bại: id không tồn tại khi xóa

**Request**
```
DELETE http://localhost:8080/api/v1/room-types/9999
```

**Expected Response — 400 Bad Request**
```json
{
  "mess": "Không tìm thấy loại phòng",
  "code": "VAL_001"
}
```

---

### TC-16 — Thất bại: xóa lại id vừa xóa (double delete)

> Chạy sau TC-14 — id=1 đã bị xóa.

**Request**
```
DELETE http://localhost:8080/api/v1/room-types/1
```

**Expected Response — 400 Bad Request**
```json
{
  "mess": "Không tìm thấy loại phòng",
  "code": "VAL_001"
}
```

---

## 4. Lấy danh sách (phụ trợ)

**Endpoint:** `GET /api/v1/room-types`

**Request**
```
GET http://localhost:8080/api/v1/room-types
```

**Expected Response — 200 OK**
```json
{
  "mess": "Thành công",
  "data": [
    {
      "id": 1,
      "name": "Deluxe",
      "capacity": 2,
      "amenities": "WiFi, TV",
      "basePrice": 500000
    }
  ]
}
```

---

## 5. Lấy theo id (phụ trợ)

**Endpoint:** `GET /api/v1/room-types/{id}`

### Thành công
**Request**
```
GET http://localhost:8080/api/v1/room-types/1
```
**Expected Response — 200 OK**
```json
{
  "mess": "Thành công",
  "data": {
    "id": 1,
    "name": "Deluxe",
    "capacity": 2,
    "amenities": "WiFi, TV",
    "basePrice": 500000
  }
}
```

### Không tìm thấy
**Request**
```
GET http://localhost:8080/api/v1/room-types/9999
```
**Expected Response — 400 Bad Request**
```json
{
  "mess": "Không tìm thấy loại phòng",
  "code": "VAL_001"
}
```

---

## Thứ tự chạy đề xuất trên Postman

| Bước | TC    | Mục đích                                   |
|------|-------|--------------------------------------------|
| 1    | TC-01 | Tạo "Deluxe"                               |
| 2    | TC-02 | Tạo "Standard"                             |
| 3    | TC-03 | Thử tạo "Deluxe" lần 2 → phải lỗi         |
| 4    | TC-04 | Thiếu name → lỗi validation               |
| 5    | TC-05 | Name rỗng → lỗi validation                |
| 6    | TC-06 | Thiếu capacity → lỗi validation           |
| 7    | TC-07 | Thiếu basePrice → lỗi validation          |
| 8    | TC-08 | Sửa id=1 sang "Deluxe Plus"               |
| 9    | TC-09 | Sửa id=1 giữ tên "Deluxe Plus"            |
| 10   | TC-10 | Sửa id=9999 → không tồn tại              |
| 11   | TC-11 | Sửa id=1 sang "Standard" → trùng tên     |
| 12   | TC-12 | Sửa name rỗng → lỗi validation           |
| 13   | TC-13 | Sửa basePrice null → lỗi validation      |
| 14   | TC-14 | Xóa id=1 thành công                       |
| 15   | TC-15 | Xóa id=9999 → không tồn tại             |
| 16   | TC-16 | Xóa id=1 lần 2 → đã xóa rồi             |

---

## Cấu hình Postman nhanh

1. Tạo **Environment** với variable:
   - `base_url` = `http://localhost:8080`
2. Dùng `{{base_url}}/api/v1/room-types` cho tất cả request.
3. Set **Header** mặc định: `Content-Type: application/json`.
4. Sau TC-01, lưu `id` từ response vào variable `room_type_id` để dùng cho các TC tiếp theo:
   ```javascript
   // Postman Test script tab
   const res = pm.response.json();
   pm.environment.set("room_type_id", res.data.id);
   ```
