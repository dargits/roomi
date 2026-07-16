# API Documentation - Roomi Hotel Management System

## Overview
Base URL: `http://localhost:8080`  
Authentication: Bearer token trong header `Authorization`

## Error Response Format
Tất cả lỗi đều trả về format sau:
```json
{
  "mess": "Error message",
  "code": "ERROR_CODE"
}
```

---

## 📁 Authentication Controller (`/api/v1/auth`)

### 1. Đăng ký tài khoản
**POST** `/api/v1/auth/register`

**Request Body:**
```json
{
  "fullName": "Nguyễn Văn A",
  "username": "nguyenvana",
  "password": "123456",
  "phone": "0123456789"
}
```

**Response Success (200):**
```json
{
  "mess": "Đăng ký thành công",
  "token": "uuid-string-token"
}
```

**Validation Rules:**
- `fullName`: Required, max 150 ký tự
- `username`: Required, max 50 ký tự, unique
- `password`: Required, min 6 ký tự
- `phone`: Optional, max 20 ký tự, unique nếu có

---

### 2. Đăng nhập
**POST** `/api/v1/auth/login`

**Request Body:**
```json
{
  "username": "nguyenvana",
  "password": "123456"
}
```

**Response Success (200):**
```json
{
  "mess": "Đăng nhập thành công",
  "token": "uuid-string-token",
  "role": "RECEPTIONIST"
}
```

**Possible Errors:**
- `AUTH_003`: Username hoặc mật khẩu không đúng
- `ACCESS_DENIED`: Tài khoản đã bị khóa

---

### 3. Đăng xuất
**POST** `/api/v1/auth/logout`

**Headers:**
```
Authorization: your-token-here
```

**Response Success (200):**
```json
{
  "mess": "Đăng xuất thành công"
}
```

---

### 4. Đổi mật khẩu
**POST** `/api/v1/auth/changepass`

**Headers:**
```
Authorization: your-token-here
```

**Request Body:**
```json
{
  "password": "new-password-123"
}
```

**Response Success (200):**
```json
{
  "mess": "Đổi mật khẩu thành công.",
  "data": null
}
```

**Validation Rules:**
- `password`: Required, min 6 ký tự

---

## 👤 User Management Controller (`/api/v1/users`)

### 1. Lấy thông tin profile cá nhân
**GET** `/api/v1/users/profile`

**Headers:**
```
Authorization: your-token-here
```

**Response Success (200):**
```json
{
  "mess": "Thành công",
  "data": {
    "id": 1,
    "fullName": "Nguyễn Văn A",
    "username": "nguyenvana",
    "role": "RECEPTIONIST",
    "phone": "0123456789",
    "active": true,
    "createdAt": "2024-01-15T10:30:00"
  }
}
```

---

### 2. Lấy danh sách tất cả user (Admin only)
**GET** `/api/v1/users/`

**Headers:**
```
Authorization: admin-token-here
```

**Response Success (200):**
```json
{
  "mess": "Thành công",
  "data": [
    {
      "id": 1,
      "fullName": "Nguyễn Văn A",
      "username": "nguyenvana",
      "role": "RECEPTIONIST",
      "phone": "0123456789",
      "active": true,
      "createdAt": "2024-01-15T10:30:00"
    },
    {
      "id": 2,
      "fullName": "Trần Thị B",
      "username": "tranthib",
      "role": "HOUSEKEEPER",
      "phone": "0987654321",
      "active": false,
      "createdAt": "2024-01-16T09:15:00"
    }
  ]
}
```

**Possible Errors:**
- `PERM_002`: Bạn không có quyền thực hiện hành động này (không phải admin)

---

### 3. Thay đổi quyền user (Admin only)
**PUT** `/api/v1/users/role/{id}`

**Headers:**
```
Authorization: admin-token-here
```

**Path Parameters:**
- `id`: ID của user cần thay đổi quyền

**Request Body:**
```json
{
  "role": "HOUSEKEEPER"
}
```

**Response Success (200):**
```json
{
  "mess": "Cập nhật quyền thành công",
  "data": {
    "id": 2,
    "fullName": "Trần Thị B",
    "username": "tranthib",
    "role": "HOUSEKEEPER",
    "phone": "0987654321",
    "active": true,
    "createdAt": "2024-01-16T09:15:00"
  }
}
```

**Available Roles:**
- `OWNER` - Chủ cơ sở
- `RECEPTIONIST` - Lễ tân
- `HOUSEKEEPER` - Nhân viên buồng phòng
- `ACCOUNTANT` - Kế toán
- `ADMIN` - Quản trị viên

**Possible Errors:**
- `USER_001`: Người dùng không tồn tại
- `PERM_002`: Bạn không có quyền thực hiện hành động này

---

### 4. Khóa tài khoản user (Admin only)
**PUT** `/api/v1/users/lock/{id}`

**Headers:**
```
Authorization: admin-token-here
```

**Path Parameters:**
- `id`: ID của user cần khóa

**Response Success (200):**
```json
{
  "mess": "Khóa tài khoản thành công",
  "data": {
    "id": 2,
    "fullName": "Trần Thị B",
    "username": "tranthib",
    "role": "RECEPTIONIST",
    "phone": "0987654321",
    "active": false,
    "createdAt": "2024-01-16T09:15:00"
  }
}
```

**Business Rules:**
- Chỉ admin mới có quyền khóa user
- Admin không thể khóa admin khác
- Không thể khóa user đã bị khóa

**Possible Errors:**
- `USER_001`: Người dùng không tồn tại
- `USER_002`: Không thể khóa tài khoản admin
- `USER_003`: Tài khoản đã bị khóa
- `PERM_002`: Bạn không có quyền thực hiện hành động này

---

### 5. Mở khóa tài khoản user (Admin only)
**PUT** `/api/v1/users/unlock/{id}`

**Headers:**
```
Authorization: admin-token-here
```

**Path Parameters:**
- `id`: ID của user cần mở khóa

**Response Success (200):**
```json
{
  "mess": "Mở khóa tài khoản thành công",
  "data": {
    "id": 2,
    "fullName": "Trần Thị B",
    "username": "tranthib",
    "role": "RECEPTIONIST",
    "phone": "0987654321",
    "active": true,
    "createdAt": "2024-01-16T09:15:00"
  }
}
```

**Possible Errors:**
- `USER_001`: Người dùng không tồn tại
- `USER_004`: Tài khoản đã được mở khóa
- `PERM_002`: Bạn không có quyền thực hiện hành động này

---

## 🔑 Error Codes Reference

| Code | Description |
|------|-------------|
| `AUTH_001` | Username đã tồn tại |
| `AUTH_002` | Số điện thoại đã tồn tại |
| `AUTH_003` | Username hoặc mật khẩu không đúng |
| `AUTH_004` | Session đã hết hạn |
| `AUTH_005` | Session không hợp lệ |
| `VAL_001` | Dữ liệu đầu vào không hợp lệ |
| `USER_001` | Người dùng không tồn tại |
| `USER_002` | Không thể khóa tài khoản admin |
| `USER_003` | Tài khoản đã bị khóa |
| `USER_004` | Tài khoản đã được mở khóa |
| `PERM_001` | Từ chối truy cập |
| `PERM_002` | Không đủ quyền hạn |
| `SYS_001` | Lỗi hệ thống |

---

## 📋 Usage Examples

### 1. Quy trình đăng ký và đăng nhập:
```bash
# 1. Đăng ký
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Nguyễn Văn A",
    "username": "nguyenvana", 
    "password": "123456",
    "phone": "0123456789"
  }'

# 2. Đăng nhập
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nguyenvana",
    "password": "123456"
  }'

# 3. Sử dụng token để truy cập API khác
curl -X GET http://localhost:8080/api/v1/users/profile \
  -H "Authorization: your-token-from-login"
```

### 2. Admin quản lý users:
```bash
# Lấy danh sách user
curl -X GET http://localhost:8080/api/v1/users/ \
  -H "Authorization: admin-token"

# Khóa user ID 2
curl -X PUT http://localhost:8080/api/v1/users/lock/2 \
  -H "Authorization: admin-token"

# Thay đổi quyền user ID 2
curl -X PUT http://localhost:8080/api/v1/users/role/2 \
  -H "Authorization: admin-token" \
  -H "Content-Type: application/json" \
  -d '{"role": "HOUSEKEEPER"}'
```