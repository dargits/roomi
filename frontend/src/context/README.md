# 🌐 Gói Quản Lý Trạng Thái Toàn Cục (`frontend/src/context`)

<p align="center">
  <img src="https://img.shields.io/badge/State_Management-React_Context-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Auth-JWT_Session_Storage-3B82F6?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/Notifications-Toast_Provider-10B981?style=for-the-badge&logo=spring&logoColor=white" />
</p>

> Thư mục `context/` chứa các React Contexts và Custom Hooks quản lý trạng thái toàn cục (Global State) trong toàn bộ ứng dụng Frontend: xác thực phiên, thông báo nổi và cấu hình khách sạn.

---

## 📑 Mục Lục

1. [🔐 1. Xác Thực Phiên Làm Việc (`AuthContext`)](#-1-xác-thực-phiên-làm-việc-authcontext)
2. [🔔 2. Thông Báo Nổi Toàn Cục (`ToastContext`)](#-2-thông-báo-nổi-toàn-cục-toastcontext)
3. [⚙️ 3. Cấu Hình Khách Sạn (`AppConfigContext`)](#-3-cấu-hình-khách-sạn-appconfigcontext)

---

## 🔐 1. Xác Thực Phiên Làm Việc (`AuthContext`)
* **[`AuthContext.tsx`](./AuthContext.tsx):**
  * Lưu trữ thông tin người dùng hiện tại (`user`), vai trò (`role`) và JWT token.
  * Cung cấp các hàm `login()`, `logout()` (tự động xóa session trong DB và LocalStorage).
  * Hook sử dụng: `useAuth()`.

---

## 🔔 2. Thông Báo Nổi Toàn Cục (`ToastContext`)
* **[`ToastContext.tsx`](./ToastContext.tsx):**
  * Quản lý hệ thống thông báo Toast nổi (Success, Error, Warning, Info).
  * Hỗ trợ tự động ẩn sau N giây, xếp chồng thông báo và tùy chỉnh giao diện.
  * Hook sử dụng: `useToast()`.

---

## ⚙️ 3. Cấu Hình Khách Sạn (`AppConfigContext`)
* **[`AppConfigContext.tsx`](./AppConfigContext.tsx):**
  * Quản lý cấu hình chung của khách sạn (Tên cơ sở, giờ check-in/out tiêu chuẩn, chính sách tra cứu hóa đơn trực tuyến).
  * Hook sử dụng: `useAppConfig()`.
