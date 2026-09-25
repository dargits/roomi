# ⚠️ Gói Xử Lý Ngoại Lệ Toàn Cục (`plant.stay.exception`)

Thư mục `exception/` chứa cơ chế bắt lỗi tập trung (**Global Exception Handling**) của ứng dụng Spring Boot, đảm bảo toàn bộ mã lỗi trả về cho Client đều có định dạng chuẩn, thân thiện và không để lộ stack trace nội bộ của server.

---

## 📋 Danh Mục Các Ngoại Lệ Chính

* **[`GlobalExceptionHandler.java`](./GlobalExceptionHandler.java):** Class gắn `@RestControllerAdvice` bắt toàn bộ các ngoại lệ phát sinh trong hệ thống (`MethodArgumentNotValidException`, `DataIntegrityViolationException`, `Exception`...) và chuyển đổi thành HTTP Response JSON chuẩn:
  ```json
  {
    "status": 400,
    "message": "Số điện thoại không khớp với thông tin đăng ký của đặt phòng này.",
    "timestamp": "2026-09-25T08:30:00"
  }
  ```
* **[`ResourceNotFoundException.java`](./ResourceNotFoundException.java):** Trả về mã lỗi `404 Not Found` khi không tìm thấy phòng, khách hàng hoặc hóa đơn.
* **[`UnauthorizedException.java`](./UnauthorizedException.java):** Trả về mã lỗi `401 Unauthorized` / `403 Forbidden` khi sai thông tin đăng nhập hoặc không đủ quyền truy cập.
* **[`DuplicateResourceException.java`](./DuplicateResourceException.java):** Trả về mã lỗi `409 Conflict` khi trùng số phòng, trùng tài khoản hoặc trùng lịch đặt phòng.
* **[`BusinessException.java`](./BusinessException.java):** Ngoại lệ chung cho các vi phạm quy tắc nghiệp vụ (ví dụ: hủy đặt phòng đã check-in).
