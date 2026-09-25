# ⚠️ Gói Xử Lý Ngoại Lệ Toàn Cục (`plant.stay.exception`)

<p align="center">
  <img src="https://img.shields.io/badge/Exception_Handler-RestControllerAdvice-E11D48?style=for-the-badge&logo=spring&logoColor=white" />
  <img src="https://img.shields.io/badge/Error_Format-Standard_JSON-3B82F6?style=for-the-badge&logo=json&logoColor=white" />
  <img src="https://img.shields.io/badge/Security-No_StackTrace_Leak-10B981?style=for-the-badge&logo=snyk&logoColor=white" />
</p>

> Thư mục `exception/` chứa cơ chế bắt lỗi tập trung (**Global Exception Handling**) của ứng dụng Spring Boot, đảm bảo toàn bộ mã lỗi trả về cho Client đều có định dạng chuẩn, thân thiện và không để lộ stack trace nội bộ của máy chủ.

---

## 📑 Mục Lục

1. [🌐 1. Bộ Bắt Lỗi Toàn Cục (`GlobalExceptionHandler`)](#-1-bộ-bắt-lỗi-toàn-cục-globalexceptionhandler)
2. [📋 2. Danh Mục Các Lớp Ngoại Lệ Tùy Chỉnh](#-2-danh-mục-các-lớp-ngoại-lệ-tùy-chỉnh)
3. [📄 3. Cấu Trúc JSON Phản Hồi Lỗi Chuẩn](#-3-cấu-trúc-json-phản-hồi-lỗi-chuẩn)

---

## 🌐 1. Bộ Bắt Lỗi Toàn Cục (`GlobalExceptionHandler`)
* **[`GlobalExceptionHandler.java`](./GlobalExceptionHandler.java):** Class gắn `@RestControllerAdvice` tự động bắt toàn bộ các ngoại lệ phát sinh trong hệ thống (`MethodArgumentNotValidException`, `DataIntegrityViolationException`, `Exception`...) và chuyển đổi thành HTTP Response JSON chuẩn.

---

## 📋 2. Danh Mục Các Lớp Ngoại Lệ Tùy Chỉnh

| Tên Ngoại Lệ | Mã HTTP Status | Mục đích sử dụng |
| :--- | :--- | :--- |
| **`ResourceNotFoundException`** | `404 Not Found` | Không tìm thấy phòng, khách hàng hoặc hóa đơn |
| **`UnauthorizedException`** | `401 / 403` | Sai thông tin đăng nhập hoặc không đủ quyền truy cập |
| **`DuplicateResourceException`** | `409 Conflict` | Trùng số phòng, trùng tài khoản hoặc trùng lịch đặt |
| **`BusinessException`** | `400 Bad Request` | Vi phạm quy tắc nghiệp vụ (hủy đơn đã check-in...) |

---

## 📄 3. Cấu Trúc JSON Phản Hồi Lỗi Chuẩn
```json
{
  "status": 400,
  "message": "Số điện thoại không khớp với thông tin đăng ký của đặt phòng này.",
  "timestamp": "2026-09-25T08:30:00"
}
```
