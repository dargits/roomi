# 🔌 Gói Kết Nối API Axios Client (`frontend/src/services`)

Thư mục `services/` chứa toàn bộ 43 API Client modules được xây dựng trên thư viện **Axios**, đảm nhiệm việc gửi HTTP requests tới Backend và bóc tách dữ liệu có kiểm tra kiểu dữ liệu TypeScript.

---

## 📌 Các Đặc Điểm Nổi Bật

1. **Axios Instance Dùng Chung ([`api.ts`](./api.ts)):**
   * Tự động đính kèm `Authorization: Bearer <token>` vào headers của mọi request khi người dùng đã đăng nhập.
   * Cấu hình `baseURL` linh hoạt (nhận từ biến môi trường `VITE_API_BASE_URL` hoặc mặc định `/api/v1`).
   * Tự động bắt lỗi HTTP 401 Unauthorized để điều hướng về màn hình đăng nhập.
2. **Phân Tách Module Rõ Ràng:**
   * `bookingApi.ts`: Thao tác đặt phòng, check-in, check-out, đổi phòng.
   * `bookingRequestApi.ts`: Tra cứu và tự hủy yêu cầu đặt phòng trực tuyến (`CLTSN3-439`).
   * `channelApi.ts`: Quản lý kết nối kênh OTA và xem nhật ký đồng bộ iCal.
   * `invoiceApi.ts`: Hóa đơn, thanh toán, chiết khấu và hủy hóa đơn nháp.
   * `reportApi.ts`: Lấy dữ liệu báo cáo doanh thu, ADR, RevPAR, so sánh đa kỳ (`CLTSN3-431`).
