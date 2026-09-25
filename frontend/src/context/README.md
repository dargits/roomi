# 🌐 Gói Quản Lý Trạng Thái Toàn Cục (`frontend/src/context`)

Thư mục `context/` chứa các React Contexts và Custom Hooks quản lý trạng thái toàn cục (Global State) trong toàn bộ ứng dụng Frontend:

---

## 📋 Danh Mục Contexts

* **[`AuthContext.tsx`](./AuthContext.tsx):**
  * Lưu trữ thông tin người dùng hiện tại (`user`), vai trò (`role`) và JWT token.
  * Cung cấp các hàm `login()`, `logout()` (tự động xóa session trong DB và LocalStorage).
  * Hook sử dụng: `useAuth()`.
* **[`ToastContext.tsx`](./ToastContext.tsx):**
  * Quản lý hệ thống thông báo Toast nổi (Success, Error, Warning, Info).
  * Hỗ trợ tự động ẩn sau N giây, xếp chồng thông báo và tùy chỉnh giao diện.
  * Hook sử dụng: `useToast()`.
* **[`AppConfigContext.tsx`](./AppConfigContext.tsx):**
  * Quản lý cấu hình chung của khách sạn (Tên cơ sở, giờ check-in/out tiêu chuẩn, chính sách tra cứu hóa đơn trực tuyến).
  * Hook sử dụng: `useAppConfig()`.
