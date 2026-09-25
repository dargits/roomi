# 📚 Tài Liệu Đặc Tả Nghiệp Vụ & Hướng Dẫn Vận Hành (StayAway PMS)

<p align="center">
  <img src="https://img.shields.io/badge/Documentation-Business_Specs-6366F1?style=for-the-badge&logo=gitbook&logoColor=white" />
  <img src="https://img.shields.io/badge/Test_Suite-E2E_Cases-22C55E?style=for-the-badge&logo=testinglibrary&logoColor=white" />
  <img src="https://img.shields.io/badge/Role_Guides-Admin_Rec_HK-F59E0B?style=for-the-badge&logo=readme&logoColor=white" />
</p>

> Thư mục `docs/` chứa toàn bộ các tài liệu phân tích nghiệp vụ chuyên sâu, đặc tả quy trình vận hành khách sạn, kịch bản kiểm thử luồng người dùng (E2E Test Cases) và hướng dẫn sử dụng chi tiết cho hệ thống **StayAway PMS**.

---

## 📑 Mục Lục Tài Liệu Nghiệp Vụ

| Tên tài liệu | Nội dung & Phạm vi nghiệp vụ |
| :--- | :--- |
| 📄 [`USER_GUIDE.md`](./USER_GUIDE.md) | **Hướng dẫn sử dụng toàn diện:** Dành cho Quản trị viên (Admin), Lễ tân (Receptionist) và Nhân viên Buồng phòng (Housekeeper). |
| 📄 [`LUONG_DAT_PHONG_DOAN_CHI_TIET.md`](./LUONG_DAT_PHONG_DOAN_CHI_TIET.md) | **Đặc tả nghiệp vụ Đặt phòng theo đoàn (Group Booking):** Quy trình gom nhóm phòng, đặt cọc phân bổ, tính giá ưu đãi và quyết toán hóa đơn tổng. |
| 📄 [`DANH_GIA_VA_TOI_UU_NGHIEP_VU_DAT_PHONG.md`](./DANH_GIA_VA_TOI_UU_NGHIEP_VU_DAT_PHONG.md) | **Phân tích tối ưu hóa luồng đặt phòng:** Đánh giá trải nghiệm người dùng (UX), tối ưu hiệu năng truy vấn phòng trống và cơ chế chống xung đột lịch. |
| 📄 [`E2E_TEST_CASES.md`](./E2E_TEST_CASES.md) | **Kịch bản kiểm thử toàn trình (End-to-End Test Suite):** Danh mục 15+ ca kiểm thử từ đặt cọc, check-in, gọi dịch vụ, buồng phòng đến xuất hóa đơn và chốt sổ quỹ. |
| 📑 [`TAI_LIEU_TONG_HOP_KIEN_TRUC_VA_TINH_NANG_STAYAWAY_PMS.doc`](./TAI_LIEU_TONG_HOP_KIEN_TRUC_VA_TINH_NANG_STAYAWAY_PMS.doc) | **Báo cáo tổng hợp xuất ra Word:** Bản in tài liệu kỹ thuật & kiến trúc đầy đủ nhất. |

---

## 🎯 Mục Đích Sử Dụng
1. **Dành cho Developers:** Nắm rõ quy tắc nghiệp vụ (Business Rules) trước khi mở rộng tính năng mới hoặc chỉnh sửa luồng dữ liệu.
2. **Dành cho QA / Tester:** Dùng làm chuẩn đối soát khi thực hiện kiểm thử chức năng (Functional Testing) và kiểm thử chấp nhận người dùng (UAT).
3. **Dành cho Vận hành / Onboarding:** Tài liệu đào tạo nghiệp vụ nhanh cho nhân viên khách sạn mới tiếp cận hệ thống.
