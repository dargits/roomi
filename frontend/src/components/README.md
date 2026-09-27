# 🎨 Gói Giao Diện & UI Components Dùng Chung (`frontend/src/components`)

<p align="center">
  <img src="https://img.shields.io/badge/Design_System-Tailwind_Tokens-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Error_Boundary-Global_Handler-E11D48?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/AI_Assistant-Chatbot_Widget-8B5CF6?style=for-the-badge&logo=openai&logoColor=white" />
</p>

> Thư mục `components/` chứa các thành phần giao diện tái sử dụng được thiết kế theo hệ thống **Design System** đồng bộ của StayAway PMS.

---

## 📑 Mục Lục

1. [🏗️ Cấu Trúc Các Nhóm Component](#️-cấu-trúc-các-nhóm-component)
2. [🤖 1. Trợ Lý Ảo AI (`chatbot`)](#-1-trợ-lý-ảo-ai-chatbot)
3. [🛡️ 2. Thành Phần Chung & Bắt Lỗi Toàn Cục (`common`)](#️-2-thành-phần-chung--bắt-lỗi-toàn-cục-common)
4. [📐 3. Cấu Trúc Bố Cục Giao Diện (`layout`)](#-3-cấu-trúc-bố-cục-giao-diện-layout)
5. [🎯 4. Atomic UI Components (`ui`)](#-4-atomic-ui-components-ui)

---

## 🏗️ Cấu Trúc Các Nhóm Component

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

## 🤖 1. Trợ Lý Ảo AI (`chatbot`)
Hỗ trợ tương tác hội thoại với API AI Backend để giải đáp thắc mắc và thao tác nhanh cho người dùng.

---

## 🛡️ 2. Thành Phần Chung & Bắt Lỗi Toàn Cục (`common`)
[`GlobalErrorBoundary.tsx`](./common/GlobalErrorBoundary.tsx) bắt toàn bộ lỗi render của React, hiển thị màn hình fallback thân thiện và ngăn ngừa ứng dụng bị crash trắng màn hình.

---

## 📐 3. Cấu Trúc Bố Cục Giao Diện (`layout`)
Bao gồm Header, Sidebar điều hướng đa phân quyền và Footer thương hiệu đồng bộ.

---

## 🎯 4. Atomic UI Components (`ui`)
Tất cả button, input, badge đều sử dụng bảng màu và kích thước chuẩn xác theo token của Tailwind CSS.
