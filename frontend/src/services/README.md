# 🔌 Gói Kết Nối API Axios Client (`frontend/src/services`)

<p align="center">
  <img src="https://img.shields.io/badge/API_Clients-43_Modules-3B82F6?style=for-the-badge&logo=axios&logoColor=white" />
  <img src="https://img.shields.io/badge/Security-Bearer_JWT_Interceptor-10B981?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-Type_Safe_Payloads-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

> Thư mục `services/` chứa toàn bộ 43 API Client modules được xây dựng trên thư viện **Axios**, đảm nhiệm việc gửi HTTP requests tới Backend và bóc tách dữ liệu có kiểm tra kiểu dữ liệu TypeScript.

---

## 📑 Mục Lục

1. [⚙️ 1. Cấu Hình Axios Instance Dùng Chung (`api.ts`)](#️-1-cấu-hình-axios-instance-dùng-chung-apits)
2. [📋 2. Danh Mục Các API Modules Trọng Tâm](#-2-danh-mục-các-api-modules-trọng-tâm)

---

## ⚙️ 1. Cấu Hình Axios Instance Dùng Chung (`api.ts`)
* **Tự động đính kèm Token:** Đính kèm `Authorization: Bearer <token>` vào headers của mọi request khi đã đăng nhập.
* **Base URL linh hoạt:** Nhận từ biến môi trường `VITE_API_BASE_URL` hoặc fallback về `/api/v1`.
* **Bắt lỗi tập trung:** Tự động bắt lỗi HTTP 401 để chuyển hướng về trang đăng nhập.

---

## 📋 2. Danh Mục Các API Modules Trọng Tâm

| Module API | File Code | Nghiệp vụ tương ứng |
| :--- | :--- | :--- |
| **Đặt phòng** | [`bookingApi.ts`](./bookingApi.ts) | Đặt phòng, check-in, check-out, đổi phòng |
| **Yêu cầu Portal** | [`bookingRequestApi.ts`](./bookingRequestApi.ts) | Tra cứu và tự hủy yêu cầu đặt phòng (`CLTSN3-439`) |
| **Kênh OTA** | [`channelApi.ts`](./channelApi.ts) | Kết nối kênh OTA, xem nhật ký đồng bộ iCal |
| **Hóa đơn** | [`invoiceApi.ts`](./invoiceApi.ts) | Hóa đơn, chiết khấu, hủy hóa đơn nháp |
| **Báo cáo** | [`reportApi.ts`](./reportApi.ts) | Báo cáo doanh thu, ADR, RevPAR, so sánh đa kỳ (`CLTSN3-431`) |
| **Buồng phòng** | [`roomApi.ts`](./roomApi.ts) | Trạng thái phòng, phân công dọn dẹp |
