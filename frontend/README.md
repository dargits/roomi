# ⚛️ StayAway PMS — Frontend Application (React 18 + Vite)

Giao diện người dùng (Frontend) của hệ thống quản lý cơ sở lưu trú **StayAway**, được xây dựng bằng **React 18**, **TypeScript**, **Vite 6**, **TailwindCSS** và kiểm thử với **Vitest**.

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
│   ├── context/            # React Contexts (AuthContext, ToastContext)
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
│   ├── hooks/              # Custom React Hooks
│   ├── layouts/            # Layout giao diện (DashboardLayout, AuthLayout, PublicLayout)
│   ├── routes/             # Định tuyến đường dẫn (React Router DOM)
│   ├── services/           # Tầng kết nối API (Axios client services)
│   ├── types/              # Định nghĩa kiểu dữ liệu TypeScript interfaces/types
│   └── utils/              # Tiện ích format ngày giờ, tiền tệ, validation
├── nginx.conf              # Cấu hình máy chủ Nginx tĩnh (Gzip, SPA try_files, Proxy)
├── Dockerfile              # Multi-stage Dockerfile (Node 20 Builder + Nginx Alpine)
└── package.json            # Quản lý thư viện và scripts
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

### 3. Chạy kiểm thử tự động (Vitest)
```bash
npm test
```

### 4. Đóng gói bản Production (Build)
```bash
npm run build
```
Kết quả build được lưu trong thư mục `dist/`.
