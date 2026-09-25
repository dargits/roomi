# 🎨 Gói Giao Diện & UI Components Dùng Chung (`frontend/src/components`)

Thư mục `components/` chứa các thành phần giao diện tái sử dụng được thiết kế theo hệ thống **Design System** đồng bộ của StayAway PMS.

---

## 🗂️ Cấu Trúc Các Nhóm Component

```
components/
├── 🤖 chatbot/   # Widget Trợ lý ảo AI hỗ trợ tra cứu nghiệp vụ và tương tác
├── 🧩 common/    # Các components logic chung (GlobalErrorBoundary, LoadingSpinner, EmptyState...)
├── 📐 layout/    # Header, Sidebar thanh điều hướng, Footer và Brand Logo
└── 🎯 ui/        # Atomic UI Components theo chuẩn Design System
    ├── Button.tsx
    ├── Modal.tsx
    ├── Badge.tsx
    ├── Input.tsx
    ├── Tabs/
    └── Toast/
```

---

## 📌 Điểm Nổi Bật Kỹ Thuật
1. **Design System & Semantic Tokens:** Tất cả button, input, badge đều sử dụng bảng màu và kích thước chuẩn xác theo token của Tailwind CSS.
2. **Global Error Boundary:** [GlobalErrorBoundary.tsx](./common/GlobalErrorBoundary.tsx) bắt toàn bộ lỗi render của React, hiển thị màn hình fallback thân thiện và ngăn ngừa ứng dụng bị crash trắng màn hình.
3. **AI Chatbot Widget:** Hỗ trợ tương tác hội thoại với API AI Backend để giải đáp thắc mắc và thao tác nhanh cho người dùng.
