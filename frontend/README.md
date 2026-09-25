# ⚛️ StayAway PMS — Frontend Application (React 18 + Vite)

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Testing-Vitest-729B1B?style=for-the-badge&logo=vitest&logoColor=white" />
</p>

> **Giao diện người dùng (Frontend)** của StayAway PMS được xây dựng bằng **React 18**, **TypeScript**, **Vite 6**, **TailwindCSS**, thiết kế theo kiến trúc **Feature-Driven**, tích hợp Design System đồng bộ, bắt lỗi toàn cục qua `GlobalErrorBoundary` và trợ lý ảo AI.

---

## 📑 Mục Lục

1. [🏗️ Cấu Trúc Thư Mục Frontend](#️-cấu-trúc-thư-mục-frontend)
2. [🔄 Luồng Hoạt Động & Giao Tiếp API Frontend](#-luồng-hoạt-động--giao-tiếp-api-frontend)
3. [🚀 Hướng Dẫn Khởi Chạy Local](#-hướng-dẫn-khởi-chạy-local)
4. [🧪 Kiểm Thử Tự Động (Vitest)](#-kiểm-thử-tự-động-vitest)
5. [📦 Đóng Gói Production & Nginx Configuration](#-đóng-gói-production--nginx-configuration)

---

## 🏗️ Cấu Trúc Thư Mục Frontend

```
frontend/
├── public/                 # Tài nguyên tĩnh (favicon, logo, icons)
├── src/
│   ├── assets/             # Hình ảnh, fonts, icons SVG
│   ├── components/         # UI Components dùng chung (Button, Modal, Toast, Chatbot)
│   ├── configs/            # Cấu hình Axios, biến môi trường API Base URL
│   ├── constants/          # Hằng số hệ thống, màu sắc trạng thái phòng
│   ├── context/            # React Contexts (AuthContext, ToastContext, AppConfigContext)
│   ├── features/           # Các module chức năng theo từng phân hệ nghiệp vụ
│   │   ├── admin/          # Quản trị hệ thống, loại phòng, tài khoản
│   │   ├── auth/           # Đăng nhập, đổi mật khẩu, quên mật khẩu
│   │   ├── booking/        # Đặt phòng, check-in/out, sơ đồ lịch
│   │   ├── housekeeping/   # Quản lý buồng phòng, phân công dọn dẹp
│   │   ├── invoice/        # Hóa đơn, chiết khấu, sổ quỹ
│   │   ├── landing/        # Trang giới thiệu phần mềm
│   │   ├── notifications/  # Thông báo thời gian thực
│   │   ├── public/         # Cổng đặt phòng & tra cứu công khai cho khách
│   │   ├── reports/        # Báo cáo doanh thu, ADR, RevPAR, so sánh đa kỳ
│   │   └── rooms/          # Sơ đồ ma trận phòng
│   ├── hooks/              # Custom React Hooks (useAuth, useToast, useAppConfig...)
│   ├── layouts/            # Layout giao diện (DashboardLayout, AuthLayout, PublicLayout)
│   ├── routes/             # Định tuyến đường dẫn (React Router DOM)
│   ├── services/           # 43 Axios API Client modules
│   ├── types/              # Định nghĩa kiểu dữ liệu TypeScript
│   └── utils/              # Tiện ích format ngày giờ, tiền tệ, validation
├── nginx.conf              # Cấu hình Nginx tĩnh (Gzip, SPA try_files, Proxy)
├── Dockerfile              # Multi-stage Dockerfile (Node 20 Builder + Nginx Alpine)
└── package.json            # Quản lý thư viện và scripts
```

---

## 🔄 Luồng Hoạt Động & Giao Tiếp API Frontend

```
[ User Interaction: Click / Form Submit ]
                   │
                   ▼
[ React Component / Custom Hook (useAuth / useToast) ]
                   │
                   ▼
[ Axios API Client (services/*Api.ts) ] ──► Tự động đính kèm Bearer JWT Token
                   │
                   ▼ (HTTP REST Call)
[ Backend Spring Boot Core (/api/v1) ]
                   │
                   ▼ (JSON Response / Error)
[ Axios Interceptor (configs/axios.ts) ]
   ├── Thành công: Trả dữ liệu kiểu TypeScript & Render UI
   └── Lỗi (401/403/400/500): Tự động mở Toast cảnh báo hoặc chuyển hướng Đăng nhập
```

---

## 🚀 Hướng Dẫn Khởi Chạy Local

### 1. Cài đặt dependencies
```bash
npm ci --legacy-peer-deps
```

### 2. Chạy môi trường phát triển (Dev Server)
```bash
npm run dev
```
Ứng dụng sẽ chạy tại: `http://localhost:5173`

---

## 🧪 Kiểm Thử Tự Động (Vitest)
```bash
npm test
```
Chạy toàn bộ các bài kiểm thử Component, Hooks, Formatting và Contexts với Vitest và React Testing Library.

---

## 📦 Đóng Gói Production & Nginx Configuration
```bash
npm run build
```
Kết quả build được lưu trong thư mục `dist/` và được phục vụ bởi Nginx Alpine siêu nhẹ (< 25MB) với cơ chế SPA Routing:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```
