# Tài liệu API (Dành cho Frontend)

## 1. Xác thực (Authentication)

### 1.1. Đăng nhập (Login)
- **Endpoint**: `POST /api/v1/auth/login`
- **Mô tả**: API dùng để xác thực người dùng và nhận về Token kèm thông tin cá nhân.
- **Header**: `Content-Type: application/json`

#### Request Body (`LoginRequest`)
```json
{
  "account": "tài_khoản_của_bạn",
  "password": "mật_khẩu_của_bạn"
}
```

#### Response (`LoginResponse`)
```json
{
  "token": "chuỗi_token_để_gọi_các_api_cần_xác_thực",
  "user": {
    "id": 1,
    "name": "Nguyễn Văn A",
    "account": "nguyenvana",
    "phone": "0987654321",
    "email": "a@gmail.com",
    "createAt": "2024-03-24T12:00:00",
    "avatarImage": "url_anh_dai_dien",
    "active": true,
    "role": "OWNER"
  }
}
```

### 1.2. Đăng ký tài khoản (Register)
- **Endpoint**: `POST /api/v1/auth/register`
- **Mô tả**: Tạo tài khoản mới cho nhân viên. **Yêu cầu Header có Token của tài khoản mang quyền ADMIN hoặc OWNER**.
- **Header**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token_cua_admin_owner>`

#### Request Body (`RegisterRequest`)
```json
{
  "account": "nhanvien1",
  "password": "password123",
  "name": "Trần Thị B",
  "phone": "0988777666",
  "email": "b@gmail.com",
  "avatarImage": "url_anh",
  "role": "RECEPTIONIST" 
}
```
*(Lưu ý: role có thể là OWNER, RECEPTIONIST, HOUSEKEEPER, ACCOUNTANT, ADMIN, CUSTOMER, NONE)*

#### Response (`MessageResponse`)
```json
{
  "message": "Đăng ký tài khoản thành công"
}
```

---

## 2. Quản lý Thông tin cá nhân (Profile)

Tất cả các API dưới đây đều yêu cầu người dùng phải đăng nhập.
- **Header chung**: `Authorization: Bearer <token>`
- **Base URL**: `/api/v1/users`

### 2.1. Lấy thông tin bản thân
- **Endpoint**: `GET /api/v1/users/me`
- **Mô tả**: Lấy thông tin của chính tài khoản đang đăng nhập (dựa vào token).

#### Response (`UserResponse`)
Giống hệt phần `user` trong kết quả trả về của API Đăng nhập (Mục 1.1).

### 2.2. Cập nhật thông tin bản thân
- **Endpoint**: `PUT /api/v1/users/me`
- **Mô tả**: Thay đổi thông tin cá nhân. Không cho phép đổi tên đăng nhập (account) hoặc quyền (role).

#### Request Body (`UserUpdateRequest`)
```json
{
  "name": "Nguyễn Văn A (Đã sửa)",
  "phone": "0987654321",
  "email": "a_new@gmail.com",
  "avatarImage": "url_anh_moi"
}
```

#### Response (`UserResponse`)
Trả về thông tin User sau khi đã cập nhật thành công.

### 2.3. Đổi mật khẩu
- **Endpoint**: `PUT /api/v1/users/me/password`
- **Header**: `Content-Type: application/json`

#### Request Body (`ChangePasswordRequest`)
```json
{
  "oldPassword": "mat_khau_hien_tai",
  "newPassword": "mat_khau_moi"
}
```

#### Response (`MessageResponse`)
```json
{
  "message": "Đổi mật khẩu thành công"
}
```

---

## 3. Quản lý Nhân sự (Staff Management)

Tất cả các API dưới đây đều yêu cầu Header `Authorization` và tài khoản phải có quyền **ADMIN** hoặc **OWNER**.
- **Header chung**: `Authorization: Bearer <token>`
- **Base URL**: `/api/v1/users`

*(Lưu ý: API tạo nhân viên mới đã được định nghĩa ở mục 1.2 `POST /api/v1/auth/register`)*

### 3.1. Lấy danh sách nhân sự
- **Endpoint**: `GET /api/v1/users`
- **Mô tả**: Lấy danh sách toàn bộ người dùng trong hệ thống.

#### Response (Array of `UserResponse`)
```json
[
  {
    "id": 1,
    "name": "Nguyễn Văn A",
    "account": "nguyenvana",
    "phone": "0987654321",
    "email": "a@gmail.com",
    "createAt": "2024-03-24T12:00:00",
    "avatarImage": "url_anh",
    "active": true,
    "role": "OWNER"
  }
]
```

### 3.2. Cập nhật thông tin nhân sự
- **Endpoint**: `PUT /api/v1/users/{id}`
- **Mô tả**: Cập nhật thông tin cá nhân của một nhân viên (Không bao gồm đổi mật khẩu hay đổi Role).

#### Request Body (`UserUpdateRequest`)
```json
{
  "name": "Trần Thị B",
  "phone": "0988777666",
  "email": "b@gmail.com",
  "avatarImage": "url_anh_moi"
}
```

#### Response (`UserResponse`)
Trả về thông tin User sau khi đã cập nhật thành công.

### 3.3. Cập nhật vai trò (Role)
- **Endpoint**: `PUT /api/v1/users/{id}/role`
- **Mô tả**: Thay đổi chức vụ của nhân viên. Dùng **Query Parameter**.

#### Request URL Example
`PUT /api/v1/users/2/role?role=RECEPTIONIST`

#### Response (`MessageResponse`)
```json
{
  "message": "Cập nhật vai trò thành công"
}
```

### 3.4. Khóa tài khoản
- **Endpoint**: `PUT /api/v1/users/{id}/lock`
- **Mô tả**: Khóa tài khoản (chuyển `active` thành `false`), nhân viên sẽ không thể đăng nhập.

#### Response (`MessageResponse`)
```json
{
  "message": "Khóa tài khoản thành công"
}
```

### 3.5. Mở khóa tài khoản
- **Endpoint**: `PUT /api/v1/users/{id}/unlock`
- **Mô tả**: Mở khóa tài khoản (chuyển `active` thành `true`).

#### Response (`MessageResponse`)
```json
{
  "message": "Mở khóa tài khoản thành công"
}
```

---

## 4. Cấu hình cơ sở (Hotel Setting)

### 4.1. Lấy cấu hình (Public)
- **Endpoint**: `GET /api/v1/hotel-setting/public`
- **Mô tả**: Lấy thông tin cấu hình cơ sở để hiển thị cho khách (Không yêu cầu đăng nhập/Token).
- **Header**: Trống

#### Response (`HotelSettingResponse`)
```json
{
  "id": 1,
  "propertyName": "Stay Hotel",
  "address": "123 Đường ABC, Quận X",
  "phone": "0123456789",
  "email": "contact@stayhotel.com",
  "defaultCheckinTime": "14:00:00",
  "defaultCheckoutTime": "12:00:00",
  "homeImage": "url_anh_bia"
}
```

### 4.2. Lấy cấu hình (Admin/Owner)
- **Endpoint**: `GET /api/v1/hotel-setting`
- **Mô tả**: Lấy thông tin cấu hình (Dành cho phần quản trị). Yêu cầu quyền **OWNER**.
- **Header**: `Authorization: Bearer <token>`
- **Response**: Trả về `HotelSettingResponse` giống API 4.1.

### 4.3. Cập nhật cấu hình
- **Endpoint**: `PUT /api/v1/hotel-setting`
- **Mô tả**: Cập nhật thông tin cấu hình của cơ sở. Yêu cầu quyền **OWNER**.
- **Header**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`

#### Request Body (`HotelSettingRequest`)
```json
{
  "propertyName": "Stay Hotel Cập Nhật",
  "address": "123 Đường ABC, Quận X",
  "phone": "0123456789",
  "email": "contact@stayhotel.com",
  "defaultCheckinTime": "14:00:00",
  "defaultCheckoutTime": "12:00:00",
  "homeImage": "url_anh_bia_moi"
}
```
*(Lưu ý: Không gửi trường `id` trong body. Giờ `defaultCheckoutTime` phải sau `defaultCheckinTime`)*

#### Response (`HotelSettingResponse`)
Trả về dữ liệu đã được cập nhật thành công (giống API 4.1).

---

## 5. Quản lý Loại phòng (Room Types)

Tất cả các API dưới đây đều yêu cầu quyền **OWNER** (Ngoại trừ API 5.1).
- **Header chung**: `Authorization: Bearer <token>`
- **Base URL**: `/api/v1/room-types`

### 5.1. Lấy danh sách loại phòng (Public)
- **Endpoint**: `GET /api/v1/room-types/public`
- **Mô tả**: Dành cho khách hàng. Trả về danh sách các loại phòng **đang hoạt động** (`active = true`). Không yêu cầu token.
- **Header**: Trống

#### Response (Array of `RoomTypeResponse`)
Trả về danh sách giống mục 5.2.

### 5.2. Lấy danh sách tất cả loại phòng (Admin)
- **Endpoint**: `GET /api/v1/room-types`
- **Mô tả**: Trả về mảng danh sách tất cả loại phòng (Bao gồm cả active và inactive). Yêu cầu quyền **OWNER**.

#### Response (Array of `RoomTypeResponse`)
```json
[
  {
    "id": 1,
    "name": "Deluxe Double",
    "maxCapacity": 2,
    "basePrice": 1500000.00,
    "amenitiesDescription": "View biển, Tivi 50 inch, Bồn tắm",
    "imageUrls": [
      "https://example.com/image.jpg"
    ],
    "active": true,
    "createdAt": "2024-03-24T12:00:00",
    "updatedAt": "2024-03-24T12:00:00"
  }
]
```

### 5.3. Lấy chi tiết một loại phòng
- **Endpoint**: `GET /api/v1/room-types/{id}`
- **Mô tả**: Truyền `id` của loại phòng lên URL để lấy chi tiết.

#### Response (`RoomTypeResponse`)
Trả về Object giống một phần tử của danh sách ở mục 5.2.

### 5.4. Tạo mới loại phòng
- **Endpoint**: `POST /api/v1/room-types`
- **Header**: `Content-Type: application/json`

#### Request Body (`RoomTypeRequest`)
```json
{
  "name": "Suite Family",
  "maxCapacity": 4,
  "basePrice": 2500000.00,
  "amenitiesDescription": "2 giường đôi, Phòng khách riêng, Sofa",
  "imageUrls": [
    "https://example.com/suite1.jpg",
    "https://example.com/suite2.jpg"
  ],
  "active": true
}
```
*(Lưu ý: Nếu không gửi trường `active`, hệ thống sẽ tự đặt mặc định là `true`)*

#### Response (`RoomTypeResponse`)
Trả về dữ liệu loại phòng vừa được tạo thành công (kèm `id` mới tạo).

### 5.5. Cập nhật loại phòng
- **Endpoint**: `PUT /api/v1/room-types/{id}`
- **Header**: `Content-Type: application/json`

#### Request Body (`RoomTypeRequest`)
Gửi toàn bộ object có cấu trúc giống mục 5.4.

#### Response (`RoomTypeResponse`)
Trả về dữ liệu loại phòng sau khi được cập nhật thành công.

### 5.6. Xoá loại phòng
- **Endpoint**: `DELETE /api/v1/room-types/{id}`
- **Mô tả**: Xóa cứng một loại phòng khỏi hệ thống.

#### Response (`MessageResponse`)
```json
{
  "message": "Đã xóa loại phòng thành công"
}
```

---

## 6. Upload Ảnh (File Upload)

### 6.1. Upload 1 file ảnh
- **Endpoint**: `POST /api/v1/files/upload`
- **Mô tả**: Upload file hình ảnh và nhận lại đường link URL trực tiếp để lưu vào các bảng khác (cơ sở, loại phòng).
- **Header**: `Content-Type: multipart/form-data`

#### Request Body (Form-Data)
- `file`: (Kiểu File) - Chọn file ảnh từ máy.

#### Response
```json
{
  "url": "http://localhost:8080/images/0b154d86-b4d0-4afc-ba3e-fae9b3a72dfa.jpg"
}
```

### 6.2. Upload nhiều file ảnh
- **Endpoint**: `POST /api/v1/files/upload-multiple`
- **Mô tả**: Upload nhiều file hình ảnh cùng một lúc và nhận lại mảng đường link URL trực tiếp.
- **Header**: `Content-Type: multipart/form-data`

#### Request Body (Form-Data)
- `files`: (Kiểu File) - Chọn nhiều file ảnh từ máy (gửi nhiều part có cùng name là `files`).

#### Response
```json
{
  "urls": [
    "http://localhost:8080/images/0b154d86-b4d0-4afc-ba3e-fae9b3a72dfa.jpg",
    "http://localhost:8080/images/1c265e97-c5e1-5bgd-cb4f-gbf0c4b83egb.jpg"
  ]
}
```

---

## 7. Quản lý Dịch vụ Phụ thu (Extra Services)

Các API quản lý (tạo, sửa, xoá) yêu cầu quyền **OWNER**.
Các API lấy danh sách (ngoại trừ public) yêu cầu đăng nhập bằng tài khoản (bất kỳ role nào).
- **Base URL**: `/api/v1/extra-services`

### 7.1. Lấy danh sách dịch vụ (Public)
- **Endpoint**: `GET /api/v1/extra-services/public`
- **Mô tả**: Dành cho khách hàng. Trả về danh sách các dịch vụ phụ thu **đang hoạt động** (`active = true`). Không yêu cầu token.
- **Header**: Trống

#### Response (Array of `ExtraServiceResponse`)
Trả về danh sách giống mục 7.2.

### 7.2. Lấy danh sách tất cả dịch vụ (Admin)
- **Endpoint**: `GET /api/v1/extra-services`
- **Mô tả**: Lấy toàn bộ danh sách dịch vụ (Bao gồm cả active và inactive). Yêu cầu đã đăng nhập (Role bất kỳ).
- **Header**: `Authorization: Bearer <token>`

#### Response (Array of `ExtraServiceResponse`)
```json
[
  {
    "id": 1,
    "name": "Giặt là",
    "description": "Dịch vụ giặt là lấy ngay",
    "unitPrice": 50000.00,
    "unit": "kg",
    "active": true,
    "createdAt": "2024-03-24T12:00:00",
    "updatedAt": "2024-03-24T12:00:00"
  }
]
```

### 7.3. Lấy chi tiết dịch vụ
- **Endpoint**: `GET /api/v1/extra-services/{id}`
- **Header**: `Authorization: Bearer <token>`

### 7.4. Tạo mới dịch vụ
- **Endpoint**: `POST /api/v1/extra-services`
- **Header**: `Authorization: Bearer <token>` (Chỉ OWNER)

#### Request Body (`ExtraServiceRequest`)
```json
{
  "name": "Thuê xe máy",
  "description": "Xe số hoặc tay ga",
  "unitPrice": 150000,
  "unit": "Ngày",
  "active": true
}
```

#### Response (`ExtraServiceResponse`)
Trả về thông tin dịch vụ vừa tạo.

### 7.5. Cập nhật dịch vụ
- **Endpoint**: `PUT /api/v1/extra-services/{id}`
- **Header**: `Authorization: Bearer <token>` (Chỉ OWNER)

#### Request Body
Gửi giống mục 7.4.

### 7.6. Xóa dịch vụ
- **Endpoint**: `DELETE /api/v1/extra-services/{id}`
- **Header**: `Authorization: Bearer <token>` (Chỉ OWNER)

---

## 8. Mã lỗi phổ biến (Common Error Responses)
Tất cả các lỗi xử lý chung trả về theo định dạng (MessageResponse):
```json
{
  "message": "Chi tiết mô tả lỗi"
}
```
Lỗi Validate dữ liệu (`400 Bad Request`) có thể trả về object gồm tên field và thông báo lỗi:
```json
{
  "propertyName": "Tên cơ sở không được để trống",
  "defaultCheckinTime": "Giờ nhận phòng mặc định không được để trống"
}
```

- **400 Bad Request**: Lỗi validate dữ liệu đầu vào hoặc sai logic (ví dụ: giờ không hợp lệ).
- **401 Unauthorized**: Token hết hạn, token sai hoặc user không có quyền OWNER truy cập chức năng này.
- **404 Not Found**: Không tìm thấy tài nguyên.
- **409 Conflict**: Trùng lặp dữ liệu (Ví dụ: Email/Tài khoản đã tồn tại khi đăng ký).
- **500 Internal Server Error**: Lỗi hệ thống Backend.

---

## 8. Quan ly Phong (Rooms)

Yeu cau dang nhap. GET yeu cau OWNER hoac RECEPTIONIST. POST/PUT/DELETE yeu cau OWNER.
- **Base URL**: `/api/v1/rooms`

### 8.1. Lay danh sach phong
- **Endpoint**: `GET /api/v1/rooms`
- **Query Params**: `?status=DIRTY` (tuy chon, loc theo trang thai: AVAILABLE/OCCUPIED/DIRTY/MAINTENANCE)

### 8.2. CRUD Phong
- `GET /api/v1/rooms/{id}` - OWNER/RECEPTIONIST
- `POST /api/v1/rooms` - OWNER
- `PUT /api/v1/rooms/{id}` - OWNER
- `DELETE /api/v1/rooms/{id}` - OWNER

**Request Body (RoomRequest):**
```json
{ "roomNumber": "102", "roomTypeId": 1, "floor": "1", "status": "AVAILABLE", "notes": "Ghi chu" }
```

### 8.3. Danh dau phong da don sach (OWNER/HOUSEKEEPER/RECEPTIONIST) - QTN-05
- `PUT /api/v1/rooms/{id}/mark-clean` - Chi khi phong DIRTY -> AVAILABLE

### 8.4. Khoa phong bao tri (OWNER)
- `PUT /api/v1/rooms/{id}/maintenance`

---

## 9. Gia theo Mua (Seasonal Prices) - OWNER

- **Base URL**: `/api/v1/room-types/{roomTypeId}/seasonal-prices`

| Method | Endpoint | Mo ta |
|--------|----------|-------|
| GET | `/{roomTypeId}/seasonal-prices` | Xem tat ca |
| POST | `/{roomTypeId}/seasonal-prices` | Tao moi |
| PUT | `/{roomTypeId}/seasonal-prices/{priceId}` | Cap nhat |
| DELETE | `/{roomTypeId}/seasonal-prices/{priceId}` | Xoa |

**Request Body (SeasonalPriceRequest):**
```json
{ "startDate": "2024-12-20", "endDate": "2025-01-05", "pricePerNight": 2000000.00 }
```

---

## 10. Khach hang (Guests) - OWNER/RECEPTIONIST

- **Base URL**: `/api/v1/guests`

| Method | Endpoint | Mo ta |
|--------|----------|-------|
| GET | `/api/v1/guests?search=keyword` | Tim kiem theo ten/SDT/CCCD |
| GET | `/api/v1/guests/{id}` | Chi tiet |
| GET | `/api/v1/guests/{id}/history` | Lich su luu tru |
| GET | `/api/v1/guests/{id}/loyalty` | Thong tin loyalty |
| POST | `/api/v1/guests` | Tao moi |
| PUT | `/api/v1/guests/{id}` | Cap nhat |

**Request Body (GuestRequest):**
```json
{ "name": "Tran Thi C", "phone": "0987654321", "idNumber": "034567890123", "email": "c@gmail.com" }
```

**Response (GuestResponse):**
```json
{
  "id": 1, "name": "Tran Thi C", "phone": "0987654321",
  "loyaltyPoints": 150, "loyaltyTierId": 2, "loyaltyTierName": "Vang",
  "createdAt": "2024-01-01T10:00:00"
}
```
*(Diem loyalty: moi 100.000 VND = 1 diem)*

---

## 11. Hang Thanh Vien (Loyalty Tiers)

GET: moi tai khoan. POST/PUT/DELETE: OWNER.
- **Base URL**: `/api/v1/loyalty-tiers`

---

## 12. Dat phong (Bookings) - OWNER/RECEPTIONIST

- **Base URL**: `/api/v1/bookings`

| Method | Endpoint | Mo ta | Story/Rule |
|--------|----------|-------|-----------|
| GET | `/api/v1/bookings` | Danh sach | |
| GET | `/api/v1/bookings/{id}` | Chi tiet | |
| GET | `/api/v1/bookings/calendar?from=&to=` | Lich phong | NCL-03 |
| POST | `/api/v1/bookings` | Tao dat phong | NCL-03 |
| PUT | `/api/v1/bookings/{id}/assign-room?roomId=` | Gan phong (chong trung) | QTN-01 |
| PUT | `/api/v1/bookings/{id}/cancel` | Huy | QTN-06 |
| PUT | `/api/v1/bookings/{id}/change-room?newRoomId=` | Doi phong | QTN-08 |
| PUT | `/api/v1/bookings/{id}/no-show` | Khong den | QTN-07 |
| PUT | `/api/v1/bookings/{id}/check-in` | Nhan phong | QTN-02 |
| PUT | `/api/v1/bookings/{id}/check-out` | Tra phong (phong -> DIRTY) | QTN-04,05 |

**Request Body (BookingRequest):**
```json
{
  "guestId": 5, "roomTypeId": 1, "roomId": null,
  "checkInDate": "2024-03-25", "checkOutDate": "2024-03-28", "note": "Ghi chu"
}
```

---

## 13. Dich vu phu thu trong Booking - OWNER/RECEPTIONIST

| Method | Endpoint | Mo ta |
|--------|----------|-------|
| GET | `/api/v1/bookings/{id}/services` | Xem dich vu |
| POST | `/api/v1/bookings/{id}/services` | Them dich vu |
| DELETE | `/api/v1/bookings/{bookingId}/services/{usageId}` | Xoa dich vu |

---

## 14. Hoa don & Thanh toan (Invoice & Payment)

| Method | Endpoint | Role | Mo ta | Rule |
|--------|----------|------|-------|------|
| GET | `/api/v1/bookings/{id}/invoice` | OWNER/ACCOUNTANT/RECEPTIONIST | Xem hoa don | |
| POST | `/api/v1/bookings/{id}/invoice` | OWNER/ACCOUNTANT | Lap hoa don | QTN-12 |
| GET | `/api/v1/invoices/{id}` | OWNER/ACCOUNTANT/RECEPTIONIST | Xem theo ID | |
| POST | `/api/v1/invoices/{id}/payments` | OWNER/ACCOUNTANT/RECEPTIONIST | Ghi thanh toan | |
| GET | `/api/v1/invoices/{id}/payments` | OWNER/ACCOUNTANT/RECEPTIONIST | Xem thanh toan | |
| POST | `/api/v1/invoices/{id}/adjust` | OWNER/ACCOUNTANT | Hoa don dieu chinh | QTN-11 |

*(Hoa don PAID la immutable - moi sua phai tao hoa don dieu chinh moi)*

---

## 15. Kho do dung (Inventory) - OWNER

- `GET /api/v1/inventory-items` - Tat ca
- `GET /api/v1/inventory-items/low-stock` - Canh bao sap het
- `POST /api/v1/inventory-items` - Them
- `PUT /api/v1/inventory-items/{id}` - Cap nhat
- `DELETE /api/v1/inventory-items/{id}` - Xoa

---

## 16. Bao cao (Reports)

| Endpoint | Role | Mo ta |
|----------|------|-------|
| `GET /api/v1/reports/occupancy?from=&to=` | OWNER | Bao cao cong suat |
| `GET /api/v1/reports/revenue?from=&to=&groupBy=` | OWNER/ACCOUNTANT | Bao cao doanh thu |
| `GET /api/v1/reports/dashboard` | OWNER | Dashboard tong quan |
| `GET /api/v1/reports/export?type=bookings&from=&to=` | OWNER | Xuat CSV |

---

## 17. Thong bao - OWNER/RECEPTIONIST

- `GET /api/v1/notifications/today-checkinout` - Nhac check-in/check-out trong ngay

---

## 18. Lich su hoat dong (Audit Logs) - OWNER/ADMIN

- `GET /api/v1/audit-logs?entity=Booking&actorId=1&from=2024-03-01&to=2024-03-31`

---

## 19. Cong dat phong cho khach (Booking Portal)

| Method | Endpoint | Auth | Mo ta |
|--------|----------|------|-------|
| GET | `/api/v1/room-types/public/availability?from=&to=` | Public | Xem phong trong |
| POST | `/api/v1/booking-requests` | Public | Gui yeu cau dat phong |
| GET | `/api/v1/booking-requests` | OWNER/RECEPTIONIST | Xem danh sach yeu cau |
| PUT | `/api/v1/booking-requests/{id}/approve` | OWNER/RECEPTIONIST | Duyet -> tao Booking |
| PUT | `/api/v1/booking-requests/{id}/reject?reason=` | OWNER/RECEPTIONIST | Tu choi |

---

## 20. Chinh sach huy phong (Cancellation Policies)

GET: moi tai khoan. POST/PUT/DELETE: OWNER.
- **Base URL**: `/api/v1/cancellation-policies`

*(roomTypeId = null = ap dung cho tat ca loai phong)*

---

## 21. Import / Export du lieu - OWNER/ADMIN

| Method | Endpoint | Mo ta |
|--------|----------|-------|
| POST | `/api/v1/data/import?type=rooms` | Import phong tu CSV |
| POST | `/api/v1/data/import?type=guests` | Import khach tu CSV |
| GET | `/api/v1/data/export?type=bookings` | Export dat phong ra CSV |
| GET | `/api/v1/data/export?type=guests` | Export khach ra CSV |

**Dinh dang CSV phong**: header `roomNumber,roomTypeId,floor`
**Dinh dang CSV khach**: header `name,phone,idNumber`

---

## 22. Enum Reference

| Enum | Gia tri |
|------|---------|
| `RoomStatus` | AVAILABLE, OCCUPIED, DIRTY, MAINTENANCE |
| `BookingStatus` | NEW, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW |
| `InvoiceStatus` | PENDING, PAID, ADJUSTED |
| `PaymentMethod` | CASH, TRANSFER |
| `BookingRequestStatus` | PENDING, APPROVED, REJECTED |

---

## 23. Luong nghiep vu chinh

**Nhan phong tieu chuan:**
`POST /bookings (NEW) -> PUT assign-room (CONFIRMED, QTN-01) -> PUT check-in -> POST services -> PUT check-out (DIRTY, QTN-05) -> POST invoice (QTN-12) -> POST payments (PAID) -> PUT mark-clean (AVAILABLE)`

**Dat phong online (QTN-13):**
`GET availability -> POST booking-requests (PENDING) -> PUT approve (CONFIRMED Booking)`
