# 🛠️ Gói Tiện Ích Hệ Thống (`plant.stay.util`)

Thư mục `util/` cung cấp các lớp công cụ phụ trợ dùng chung trong toàn bộ hệ thống Backend:

---

## 📋 Danh Mục Các Tiện Ích

* **[`AuthUtil.java`](./AuthUtil.java):** Trích xuất thông tin người dùng từ Header Authorization / JWT Token, kiểm tra quyền hạn (Role-based & Permission-based) và xác định phiên làm việc hiện tại.
* **[`PersonalDataMasker.java`](./PersonalDataMasker.java):** Thuật toán che mờ số CCCD (ví dụ: `07920******12`) và Số điện thoại (ví dụ: `090*****89`) phục vụ bảo vệ dữ liệu nhạy cảm theo quy định bảo mật.
* **[`HashUtil.java`](./HashUtil.java):** Băm mật khẩu và mã hóa chuỗi an toàn với thuật toán SHA-256 / BCrypt.
