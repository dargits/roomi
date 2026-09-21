# DESIGN SYSTEM: LODGIFY HOSPITALITY PMS

Tài liệu này là chuẩn thiết kế bắt buộc cho toàn bộ giao diện frontend của dự án. Mọi thay đổi về màu sắc, kiểu chữ, bo góc, component và màn hình phải tuân thủ nghiêm ngặt theo tài liệu này.

---

## 1. TRIẾT LÝ & CHỦ ĐỀ THIẾT KẾ (DESIGN PHILOSOPHY)

* **Chủ đề**: **Modern Boutique Hospitality PMS** (Lấy cảm hứng từ hệ thống quản trị khách sạn quốc tế cao cấp **Lodgify**).
* **Cảm xúc mang lại**: Dịu mát, sang trọng, thanh lịch chuẩn không gian nghỉ dưỡng (*Resort & Boutique Hotel*), thay thế hoàn toàn giao diện phẳng, xám lạnh và vuông vức.
* **Nguyên tắc cốt lõi**:
  1. **Visual Hierarchy (Phân cấp thị giác rõ ràng)**: Thông tin quan trọng nhất (doanh thu, phòng trống, khách sắp nhận hôm nay) phải đập vào mắt người dùng đầu tiên.
  2. **Organic Curves (Bo góc hữu cơ tự nhiên)**: Loại bỏ các cạnh nhọn thô cứng, dùng chuẩn bo góc mềm mại (`rounded-2xl`, `rounded-xl`, `rounded-full`).
  3. **Real Operational Data (Gắn liền với nghiệp vụ)**: Mọi thẻ hiển thị đều phải có ý nghĩa vận hành thực tế (giá phòng, tên khách lưu trú, giờ dọn dẹp, nhân viên phụ trách), không dùng placeholder giả định.

---

## 2. HỆ THỐNG BẢNG MÀU (COLOR PALETTE & TOKENS)

### 2.1. Màu Thương Hiệu & Nền (Brand & Canvas Tokens)
| Token Name | Hex Code | Ứng dụng thực tế |
| :--- | :--- | :--- |
| **Signature Accent** | `#D4F63D` (hoặc `#D2F346`) | Menu item đang chọn (Active Pill), Hero Card Doanh thu, nút CTA "+ Tạo đặt phòng", thanh tiến độ nổi bật |
| **Brand Primary** | `#626F47` | Nút hành động chính (`primary`), tiêu đề thương hiệu, cột biểu đồ lưu trú |
| **Dark Neutral** | `#1A2411` | Chữ tiêu đề chính, nút chip khi được chọn (`bg-[#1A2411]`), lớp phủ mờ modal |
| **Canvas Background** | `#F4F6F0` | Màu nền trang chủ đạo toàn hệ thống (dịu mắt, không chói lóa như trắng tinh) |
| **Surface White** | `#FFFFFF` | Nền các thẻ card, container nội dung, popup modal |
| **Border / Line** | `#E5E9E0` / `#DCE2D6` | Đường viền thanh mảnh 1px, tạo khối tinh tế mà không bị nặng nề |

### 2.2. Màu Trạng Thái Nghiệp Vụ (Semantic Status Colors)
| Trạng thái | Mã Hex Nền / Chữ / Viền | Ứng dụng |
| :--- | :--- | :--- |
| **Trống / Sẵn sàng (Available)** | Nền: `#ECFDF5` · Chữ/Icon: `#16A34A` · Viền: `#A7F3D0` | Phòng trống nhận khách, thẻ thanh toán hoàn tất |
| **Đang lưu trú (Occupied)** | Nền: `#EFF6FF` · Chữ/Icon: `#2563EB` · Viền: `#BFDBFE` | Phòng đang có khách ở, thẻ khách lưu trú |
| **Cần dọn dẹp (Dirty)** | Nền: `#FFF7ED` · Chữ/Icon: `#EA580C` · Viền: `#FED7AA` | Phòng bẩn chờ buồng phòng vệ sinh |
| **Chờ nghiệm thu (Inspecting)** | Nền: `#FAF5FF` · Chữ/Icon: `#9333EA` · Viền: `#E9D5FF` | Phòng đã dọn xong chờ quản lý kiểm tra duyệt sạch |
| **Ưu tiên đón khách hôm nay (Urgent)** | Nền: `#FEF2F2` · Chữ/Icon: `#DC2626` · Viền: `#FECACA` | Khách nhận phòng hôm nay (kèm icon ngọn lửa 🔥) |
| **Bảo trì / Sự cố (Maintenance)** | Nền: `#FFFBEB` · Chữ/Icon: `#D97706` · Viền: `#FDE68A` | Phòng đang bảo trì hoặc có báo cáo sự cố |

---

## 3. KIỂU CHỮ & BO GÓC HÌNH HỌC (TYPOGRAPHY & GEOMETRY)

### 3.1. Typography
* **Font chữ chính**: **`Plus Jakarta Sans`** kết hợp **`Outfit`** cho số liệu và tiêu đề lớn.
* **Quy tắc hiển thị**:
  * KHÔNG dùng viết hoa toàn bộ (`uppercase`) cứng nhắc trên các nút bấm.
  * Giữ `tracking-normal` cho tiếng Việt để các dấu thanh không bị dính vào nhau.
  * Tiêu đề lớn dùng font đậm `font-extrabold` hoặc `font-black`.

### 3.2. Bo Góc Hình Học (Border Radius)
* **Card lớn / Container chính**: `rounded-2xl` (16px – 24px).
* **Nút bấm & Ô nhập liệu**: `rounded-xl` (12px – 14px), chiều cao tiêu chuẩn `min-h-[40px]`.
* **Badge trạng thái & Filter Chips**: `rounded-full` (dạng viên thuốc tròn mềm mại).

---

## 4. CÁC THÀNH PHẦN GIAO DIỆN CỐT LÕI (CORE UI COMPONENTS)

### 4.1. Sidebar Navigation
* Logo thương hiệu có huy hiệu viên thuốc `0.1%` đặc trưng.
* **Active Navigation Pill**: Viên thuốc màu vàng chanh sáng `#D4F63D` với chữ đen rêu in đậm (`text-[#1A2411] font-bold`), hiệu ứng chuyển tab mượt mà.
* **Thẻ Lodgify Smart PMS**: Nằm ở chân menu với đường viền tinh tế và nút chuyển nhanh sang lịch phòng.

### 4.2. Hệ Thống Nút Bấm (Button System)
* `primary`: Nền Deep Olive `#626F47`, chữ trắng, hover `#525E3B`.
* `secondary`: Nền trắng `#FFFFFF`, viền xám râm `#DCE2D6`, chữ `#1A2411`, hover `#F2F6EC`.
* `lime`: Nền vàng chanh `#D4F63D`, chữ đen than `#1A2411`, hover `#C7E934`.
* Tránh hoàn toàn việc cắt cụt chữ hoặc co giật (`whitespace-nowrap shrink-0`).

### 4.3. Hộp Thoại Popup (Modal System)
* Khung nền trắng `bg-white` bo góc `rounded-2xl` với đổ bóng `shadow-2xl`.
* Lớp phủ mờ nền ô liu `bg-[#1A2411]/50 backdrop-blur-xs`.
* Nút đóng chữ X tròn tinh tế (`w-8 h-8 rounded-full hover:bg-[#F2F6ED]`).
* Thanh phân cách chân trang `border-t border-border-grey pt-4 mt-4`. Nút `Hủy` là `secondary`, nút hành động là `primary`.
* Triệt tiêu hoàn toàn lỗi tự động đổi màu nền xanh khi autofill trên trình duyệt.

### 4.4. Tabs Điều Hướng (Sliding Pill Tabs)
* Khung nền xám ngọc `#F4F6F0` bo góc `rounded-2xl` hoặc `rounded-xl`.
* Tab active là viên thuốc màu trắng nổi khối (`bg-white shadow-xs font-bold`) bo góc `rounded-xl` hoặc `rounded-full`.

---

## 5. YÊU CẦU CHI TIẾT THEO TỪNG MÀN HÌNH

### 5.1. Trang Tổng Quan (Dashboard - `/manage/dashboard`)
* **Hero Card Doanh thu tháng**: Nền gradient vàng chanh tươi sáng `from-[#E8FAA0] via-[#DDF672] to-[#D2F346]`, hiển thị số tiền đã thu và công nợ với hiệu ứng số chạy `AnimatedCounter`.
* **3 Thẻ Phụ**: Phòng trống khả dụng, Đang lưu trú, Chờ buồng phòng.
* **Biểu Đồ Cột Kép**: Vàng chanh `#D4F63D` (Đặt phòng mới) và Deep Olive `#626F47` (Khách đã nhận phòng) theo từng ngày.
* **Biểu Đồ Donut**: Tỷ lệ lấp đầy ở giữa và cơ cấu nguồn khách (Website, OTA, Khách quen, Vãng lai).
* **Bảng Nhận / Trả phòng hôm nay**: Avatar tròn chữ cái, tag số phòng, badge sự kiện dạng pill.
* **100% Dữ liệu thật**: Kết nối API báo cáo và vận hành.

### 5.2. Trang Sơ Đồ Phòng (Room Matrix - `/manage/rooms`)
* **Thẻ phòng theo trạng thái**:
  * *Trống*: Giá tiêu chuẩn (`500.000 ₫/đêm`), chấm xanh báo sẵn sàng, nút CTA `+ Đặt ngay`.
  * *Đang ở*: Card xanh dương dịu với Tên khách lưu trú và thời gian lưu trú (`09-15 → 09-17`).
  * *Cần dọn & Chờ duyệt*: Tên nhân viên phụ trách kèm nút `Đổi` và nút thao tác nhanh `Đã dọn` / `Duyệt sạch` / `Bảo trì`.
* **Thanh công suất theo tầng**: `X trống • Y đang ở • Z cần dọn • Công suất: XX%` kèm thanh tiến độ phân màu.
* **Thanh công cụ**: Ô tìm kiếm nhanh (phòng, loại phòng, khách) và nút `+ Tạo đặt phòng` màu vàng chanh `#D4F63D`.

### 5.3. Trang Quản Lý Buồng Phòng (Housekeeping - `/manage/housekeeping`)
* **Trung tâm chỉ huy KPI**: 4 thẻ chỉ số *Cần dọn*, *Chờ nghiệm thu*, *Khách nhận hôm nay 🔥*, *Chưa phân công ⚠️*.
* **Thanh phân bổ nhân sự (Workload Distribution)**: Avatar chữ cái tên nhân viên, số điện thoại, chip đếm phòng, lọc 1-click.
* **Thanh lọc nhanh**: *Tất cả*, *Khách nhận hôm nay 🔥*, *Chưa phân công ⚠️*, *Định kỳ ✨*.
* **Thẻ phòng dọn dẹp**:
  * Viền chuyển sắc đỉnh thẻ phân biệt mức độ ưu tiên.
  * Tag thời lượng ước tính (`⏱️ ~30 - 45 phút`) và loại dọn (`🧹 Dọn sau trả phòng` / `Dọn định kỳ`).
  * Banner thông tin khách sắp nhận phòng.
  * Hộp chọn phân công nhân viên có số điện thoại và nút `Gỡ`.
  * Nút chính `Đánh dấu phòng đã sạch` màu `#626F47`, cùng cụm nút phụ `Sự cố` và `Đồ để quên`.
