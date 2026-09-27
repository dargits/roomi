# 🧩 Gói Phân Hệ Tính Năng Frontend (`frontend/src/features`)

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-Feature_Driven-3B82F6?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Modules-10_Features-10B981?style=for-the-badge&logo=blueprint&logoColor=white" />
  <img src="https://img.shields.io/badge/Routing-React_Router_DOM-F59E0B?style=for-the-badge&logo=reactrouter&logoColor=white" />
</p>

> Thư mục `features/` được tổ chức theo mô hình **Feature-Driven Architecture** (mỗi thư mục đại diện cho một phân hệ nghiệp vụ hoàn chỉnh gồm các màn hình, modal, components con và tests liên quan).

---

## 📑 Mục Lục

1. [🏨 1. Quản Trị Hệ Thống (`admin`)](#-1-quản-trị-hệ-thống-admin)
2. [🔐 2. Xác Thực Người Dùng (`auth`)](#-2-xác-thực-người-dùng-auth)
3. [📅 3. Đặt Phòng & Sơ Đồ Lịch (`booking`)](#-3-đặt-phòng--sơ-đồ-lịch-booking)
4. [🧹 4. Buồng Phòng & Phân Công (`housekeeping`)](#-4-buồng-phòng--phân-công-housekeeping)
5. [🧾 5. Hóa Đơn & Sổ Quỹ (`invoice`)](#-5-hóa-đơn--sổ-quỹ-invoice)
6. [🌐 6. Cổng Khách Công Khai (`public`)](#-6-cổng-khách-công-khai-public)
7. [📊 7. Báo Cáo & Thống Kê (`reports`)](#-7-báo-cáo--thống-kê-reports)
8. [🛏️ 8. Ma Trận Phòng (`rooms`)](#️-8-ma-trận-phòng-rooms)
9. [📢 9. Thông Báo Thời Gian Thực (`notifications`)](#-9-thông-báo-thời-gian-thực-notifications)
10. [🚀 10. Trang Giới Thiệu (`landing`)](#-10-trang-giới-thiệu-landing)

---

## 🏨 1. Quản Trị Hệ Thống (`admin`)
Quản lý danh mục loại phòng, cấu hình giá mùa vụ/ngày lễ, phân quyền tài khoản nhân sự và cấu hình khách sạn.

---

## 🔐 2. Xác Thực Người Dùng (`auth`)
Giao diện đăng nhập, hiệu ứng chuyển trang mượt mà, quên mật khẩu và đặt lại mật khẩu qua email token.

---

## 📅 3. Đặt Phòng & Sơ Đồ Lịch (`booking`)
Danh sách đặt phòng, sơ đồ lịch phòng (Timeline 7/14/21 ngày), modal chi tiết đặt phòng, check-in/out, quét mã CCCD, import Excel.

---

## 🧹 4. Buồng Phòng & Phân Công (`housekeeping`)
Sơ đồ dọn phòng theo tầng, thanh cân bằng tải phân công việc, quy trình gửi duyệt và nghiệm thu phòng sạch.

---

## 🧾 5. Hóa Đơn & Sổ Quỹ (`invoice`)
Xem chi tiết hóa đơn, áp dụng chiết khấu %, hủy hóa đơn nháp có lý do, chốt sổ quỹ theo ngày.

---

## 🌐 6. Cổng Khách Công Khai (`public`)
Cổng đặt phòng online cho khách, modal tra cứu/tự hủy yêu cầu đặt phòng (`CLTSN3-439`), tra cứu hóa đơn trực tuyến (`NCL-09-CN-008`).

---

## 📊 7. Báo Cáo & Thống Kê (`reports`)
Báo cáo doanh thu, chỉ số ADR/RevPAR, cơ cấu kênh bán, phân tích so sánh đa kỳ PoP/YoY (`CLTSN3-431`) kèm xuất CSV.

---

## 🛏️ 8. Ma Trận Phòng (`rooms`)
Sơ đồ ma trận phòng trực quan theo màu sắc trạng thái (Sẵn sàng, Có khách, Cần dọn, Bảo trì).

---

## 📢 9. Thông Báo Thời Gian Thực (`notifications`)
Trung tâm thông báo thời gian thực cho lễ tân và quản lý khi có yêu cầu mới hoặc cảnh báo trùng phòng.

---

## 🚀 10. Trang Giới Thiệu (`landing`)
Trang landing page giới thiệu sản phẩm và các tính năng nổi bật dành cho khách tham quan.
