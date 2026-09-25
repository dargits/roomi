# KỊCH BẢN CHI TIẾT SPRINT REVIEW - SPRINT 10 (CLTSN3)
**Hệ thống Quản lý Khách sạn & Khu Nghỉ dưỡng StayAway PMS**

---

* **Mã Sprint:** CLTSN3 Sprint 10
* **Khoảng thời gian:** 21/09/2026 – 25/09/2026
* **Tổng Story Points cam kết & hoàn thành:** **35 / 35 SP (100% Done)**
* **Mục tiêu Sprint (Sprint Goal):** *Báo cáo & Phân tích: Hoàn thiện báo cáo dịch vụ phụ thu bán chạy, so sánh chỉ số với kỳ trước và tối ưu vận hành thông minh.*
* **Nền tảng triển khai:** Web App (React 18 + Tailwind CSS + Spring Boot 3 + MySQL)
* **Production URL:** [https://stayaway.io.vn](https://stayaway.io.vn) | **Local URL:** http://localhost:5173

---

## I. CHƯƠNG TRÌNH & PHÂN BỔ THỜI GIAN BUỔI REVIEW (25 - 30 PHÚT)

| Phần | Nội dung chính | Người trình bày | Thời lượng |
| :---: | :--- | :--- | :---: |
| **Phần 1** | Giới thiệu mục tiêu Sprint 10, chỉ số cam kết (Sprint Burndown & Velocity) | Scrum Master / Leader | 03 phút |
| **Phần 2** | Live Demo thực tế 8 User Stories trên hệ thống theo luồng nghiệp vụ khép kín | Dev Team (SH, PM, ND, HQ) | 18 phút |
| **Phần 3** | Báo cáo thành quả kỹ thuật (CI/CD Pipeline Xanh 100%, Tối ưu Database, Kiến trúc AI) | Tech Lead / Fullstack Dev | 03 phút |
| **Phần 4** | Q&A, tiếp nhận góp ý từ Product Owner (PO), Khách hàng & Thầy cô hướng dẫn | Toàn đội dự án | 05 phút |

---

## II. KỊCH BẢN LIVE DEMO CHI TIẾT THEO 8 USER STORIES

```
Luồng trải nghiệm Demo End-to-End:
[1. Quản lý Phiên Đăng nhập & Bảo mật]
     └──> [2. Nhập Dữ liệu Lịch sử Đặt phòng từ Excel]
           └──> [3. Báo cáo So sánh Chỉ số Tài chính Kỳ trước]
                 └──> [4. Báo cáo Dịch vụ Phụ thu Bán chạy]
                       └──> [5. Định mức & Đo lường Năng suất Buồng phòng]
                             └──> [6. Thiết lập Giá Thỏa thuận Khách đoàn/B2B]
                                   └──> [7. Khách tự Tra cứu & Tải Hóa đơn Điện tử]
                                         └──> [8. Gợi ý Điều chỉnh Giá theo Công suất & Trợ lý AI]
```

---

### MỤC 1. CLTSN3-438: Theo dõi phiên đăng nhập và buộc đăng xuất từ xa
* **Story Points:** 3 SP | **Thành viên phụ trách:** SH
* **Vai diễn demo:** Chủ sở hữu khách sạn (`chusohuu` / Trần Thị Mai).
* **Đường dẫn màn hình:** Menu góc trên bên phải avatar $\rightarrow$ **Cài đặt tài khoản** (`/manage/profile`) $\rightarrow$ Tab **"Phiên đăng nhập"**.

#### 1. Bối cảnh nghiệp vụ:
Nhân viên hoặc Chủ cơ sở thường xuyên đăng nhập trên máy tính lễ tân, máy tính cá nhân hoặc điện thoại. Khi có nghi vấn lộ mật khẩu hoặc quên đăng xuất ở máy lạ, cần có khả năng kiểm tra danh sách thiết bị đang kết nối và thu hồi phiên truy cập từ xa ngay lập tức.

#### 2. Kịch bản từng bước thao tác:
* **Bước 1:** Mở trình duyệt Chrome chính, đăng nhập tài khoản Chủ khách sạn và truy cập `/manage/profile` $\rightarrow$ chọn tab **"Phiên đăng nhập"**.
* **Bước 2:** Giới thiệu với người xem:
  * Huy hiệu màu xanh lá **"Phiên hiện tại"** gắn liền với địa chỉ IP, tên hệ điều hành (Windows 11) và trình duyệt (Chrome 129).
  * Lịch sử thời gian đăng nhập, thời gian hoạt động gần nhất (Last Active).
* **Bước 3 (Thao tác tương tác):**
  * Mở thêm một cửa sổ Trình duyệt Ẩn danh (Incognito) hoặc Microsoft Edge, đăng nhập cùng tài khoản.
  * Quay lại màn hình Chrome, bấm nút **"Làm mới danh sách"** $\rightarrow$ Hệ thống cập nhật xuất hiện thêm 1 phiên đăng nhập mới.
  * Bấm nút **"Đăng xuất phiên này"** trên dòng phiên phụ vừa tạo.
* **Bước 4:** Quay sang cửa sổ ẩn danh và bấm F5 hoặc chuyển trang $\rightarrow$ Hệ thống lập tức thu hồi Token, hiển thị thông báo an toàn và chuyển hướng về màn hình Đăng nhập.

#### 3. Kết quả & Giá trị mang lại:
* Bảo vệ 100% tài khoản quản trị trước nguy cơ bị đánh cắp dữ liệu kinh doanh hoặc thao túng doanh thu khi quên đăng xuất ở máy quầy.

---

### MỤC 2. CLTSN3-437: Nhập dữ liệu đặt phòng cũ từ tệp bảng tính
* **Story Points:** 5 SP | **Thành viên phụ trách:** SH
* **Vai diễn demo:** Quản lý cơ sở lưu trú.
* **Đường dẫn màn hình:** Menu **Hệ thống** $\rightarrow$ **Sao lưu & Dữ liệu** (`/manage/backup-data`) $\rightarrow$ Phân hệ **"Nhập dữ liệu Excel"**.

#### 1. Bối cảnh nghiệp vụ:
Khách sạn mới chuyển đổi sang sử dụng phần mềm StayAway thường có sẵn danh sách đặt phòng lịch sử nhiều tháng trong file Excel. Việc nhập tay từng đơn sẽ mất hàng tuần. Tính năng này cho phép import hàng loạt dữ liệu lịch sử chuẩn xác chỉ trong vài cú click chuột.

#### 2. Kịch bản từng bước thao tác:
* **Bước 1:** Điều hướng đến trang `/manage/backup-data`, cuộn đến mục **Nhập dữ liệu lịch sử đặt phòng**.
* **Bước 2:** Bấm nút **"Tải tệp mẫu Excel"** (`template_import_bookings.xlsx`). Mở file mẫu lên trình chiếu: Có các cột Tên khách, Số điện thoại, Mã phòng / Loại phòng, Ngày Check-in, Ngày Check-out, Tổng tiền phòng, Trạng thái (Đã hoàn thành / Check-out).
* **Bước 3:** Kéo thả tệp dữ liệu thực tế vào khung upload.
* **Bước 4:** Hệ thống hiển thị bảng xem trước (Preview) 5 bản ghi đầu tiên kèm kết quả kiểm tra dữ liệu (Validation): kiểm tra ngày check-in < check-out, map đúng loại phòng trong danh mục.
* **Bước 5:** Bấm **"Bắt đầu Nhập dữ liệu"** $\rightarrow$ Thanh tiến trình chạy mượt mà $\rightarrow$ Thông báo: *"Đã nhập thành công 120 lượt đặt phòng lịch sử"*.
* **Bước 6:** Vào màn hình **Quản lý Đặt phòng** (`/manage/bookings`) $\rightarrow$ Lọc trạng thái "Đã trả phòng" $\rightarrow$ Dữ liệu vừa nhập hiển thị đầy đủ và được tính toán ngay vào các báo cáo tài chính.

#### 3. Kết quả & Giá trị mang lại:
* Rút ngắn thời gian chuyển đổi hệ thống (Data Migration) cho khách hàng mới từ 2 tuần xuống dưới 3 phút.

---

### MỤC 3. CLTSN3-431: So sánh chỉ số với kỳ trước
* **Story Points:** 3 SP | **Thành viên phụ trách:** HQ
* **Vai diễn demo:** Giám đốc điều hành / Chủ đầu tư khách sạn.
* **Đường dẫn màn hình:** Menu **Tài chính** $\rightarrow$ **Báo cáo doanh thu & công suất** $\rightarrow$ Tab **"So sánh kỳ trước"** (`/manage/reports/period-comparison`).

#### 1. Bối cảnh nghiệp vụ:
Chủ khách sạn không chỉ cần biết tháng này thu được bao nhiêu tiền, mà quan trọng hơn là: *Tăng hay giảm so với tháng trước? Tăng trưởng nhờ bán được nhiều phòng hơn (Occupancy tăng) hay do nâng được giá bán trung bình (ADR tăng)?*

#### 2. Kịch bản từng bước thao tác:
* **Bước 1:** Truy cập `/manage/reports/period-comparison`.
* **Bước 2:** Chọn bộ lọc kỳ so sánh: Chọn nút **"Tháng này vs Tháng trước"** (hoặc tùy chọn Tuần này vs Tuần trước, Quý này vs Quý trước).
* **Bước 3:** Trình diễn 4 thẻ chỉ số điều hành cốt lõi (Executive KPI Cards):
  1. **Doanh thu thuần:** Ví dụ: `215.400.000đ` (Kỳ trước: `182.000.000đ`) $\rightarrow$ Badge xanh nổi bật: **▲ +18.35%**.
  2. **Công suất phòng bình quân (Occupancy):** Ví dụ: `68.2%` vs `55.0%` $\rightarrow$ Tăng **+13.2 điểm %**.
  3. **Giá bán phòng bình quân (ADR - Average Daily Rate):** Giúp đánh giá chiến lược định giá.
  4. **Doanh thu trên mỗi phòng sẵn có (RevPAR - Revenue Per Available Room):** Thước đo chuẩn mực quốc tế của ngành khách sạn.
* **Bước 4:** Bấm nút **"Xuất báo cáo (CSV/Excel)"** $\rightarrow$ Trình chiếu file tải về được format chuẩn chỉnh phục vụ báo cáo hội đồng quản trị.

#### 3. Kết quả & Giá trị mang lại:
* Cung cấp công cụ phân tích tài chính chuyên sâu, giúp đưa ra quyết định kinh doanh dựa trên số liệu thực chứng thay vì cảm tính.

---

### MỤC 4. CLTSN3-430: Báo cáo dịch vụ phụ thu bán chạy
* **Story Points:** 3 SP | **Thành viên phụ trách:** ND
* **Vai diễn demo:** Quản lý dịch vụ & ẩm thực khách sạn.
* **Đường dẫn màn hình:** Menu **Tài chính** $\rightarrow$ **Báo cáo Dịch vụ phụ thu** (`/manage/reports/best-selling-services`).

#### 1. Bối cảnh nghiệp vụ:
Nguồn thu ngoài phòng (Non-room Revenue) như ăn sáng, giặt là, minibar, thuê xe... chiếm từ 20-35% tổng doanh thu khách sạn. Quản lý cần biết chính xác dịch vụ nào đang sinh lời cao và dịch vụ nào "đóng băng" (0 lượt mua) để điều chỉnh nhập hàng hoặc thay đổi gói dịch vụ.

#### 2. Kịch bản từng bước thao tác:
* **Bước 1:** Truy cập `/manage/reports/best-selling-services`.
* **Bước 2:** Giới thiệu các chỉ số tổng quan ở hàng đầu trang:
  * **Tổng doanh thu dịch vụ phụ trong kỳ:** (ví dụ: `28.650.000đ`).
  * **Tổng số lượt phục vụ:** (ví dụ: `142 lượt`).
  * **Dịch vụ quán quân (Best Seller):** *Ăn sáng Buffet*.
* **Bước 3:** Bảng danh mục dịch vụ chi tiết:
  * Hiển thị biểu đồ thanh ngang so sánh tỷ trọng đóng góp doanh thu của từng dịch vụ.
  * Phân tích biên độ: Số lượng bán, Đơn giá niêm yết, Tổng thu.
* **Bước 4 (Tính năng thông minh):**
  * Bấm vào chip lọc **"Dịch vụ 0 doanh số"** $\rightarrow$ Hệ thống lọc nhanh các dịch vụ không phát sinh doanh thu (ví dụ: Dịch vụ giặt khô cao cấp). Quản lý dựa vào đây để cắt giảm hoặc chuyển đổi nhà cung cấp.
  * Bấm nút **"Xuất danh sách"** để gửi kế toán kiểm toán vật tư.

#### 3. Kết quả & Giá trị mang lại:
* Gia tăng biên lợi nhuận ròng của khách sạn thêm 15-20% nhờ tối ưu các gói dịch vụ bán kèm (upselling).

---

### MỤC 5. CLTSN3-441: Định mức thời gian dọn và theo dõi năng suất buồng phòng
* **Story Points:** 5 SP | **Thành viên phụ trách:** PM
* **Vai diễn demo:** Trưởng bộ phận Buồng phòng (Executive Housekeeper) & Nhân viên buồng phòng.
* **Đường dẫn màn hình:** Menu **Phòng** $\rightarrow$ **Buồng phòng** (`/manage/housekeeping`).

#### 1. Bối cảnh nghiệp vụ:
Nút thắt cổ chai lớn nhất khi đón khách giờ cao điểm là phòng bẩn chưa kịp dọn. Tính năng cho phép khách sạn ban hành chuẩn thời gian dọn theo từng hạng phòng, tự động bấm giờ tác nghiệp và thống kê năng suất nhân viên minh bạch.

#### 2. Kịch bản từng bước thao tác:
* **Bước 1 (Thiết lập định mức):**
  * Tại trang Buồng phòng, bấm nút **"Cấu hình định mức"**.
  * Thiết lập thời gian chuẩn:
    * *Phòng Standard:* Dọn sạch khách trả phòng = 25 phút | Dọn lưu khách đang ở = 15 phút.
    * *Phòng Suite / VIP:* Dọn sạch khách trả = 45 phút | Dọn lưu = 20 phút.
  * Bấm **Lưu cấu hình**.
* **Bước 2 (Nhân viên tác nghiệp trên điện thoại/máy tính bảng):**
  * Chọn phòng 202 (Đang ở trạng thái `Cần dọn - DIRTY`).
  * Nhân viên bấm nút **"Bắt đầu dọn"** $\rightarrow$ Đồng hồ bấm giờ thực tế bắt đầu đếm thời gian.
  * Sau khi dọn xong, bấm **"Hoàn thành dọn phòng"**.
* **Bước 3 (Đo lường năng suất tự động):**
  * Hệ thống ghi nhận: Thời gian thực tế: 22 phút (so với chuẩn 25 phút).
  * Hiển thị trạng thái: **Đạt định mức - Tiết kiệm 3 phút (Màu xanh)**.
  * Phòng 202 tự động chuyển trạng thái sang `CLEAN` sẵn sàng đón khách mới.
* **Bước 4 (Báo cáo năng suất nhân viên):**
  * Chuyển sang tab **"Báo cáo Năng suất"**: Xem số phòng đã dọn trong ngày của từng nhân viên, tỷ lệ dọn đúng hạn để tính điểm thi đua và tiền thưởng KPI cuối tháng.

#### 3. Kết quả & Giá trị mang lại:
* Rút ngắn thời gian chờ nhận phòng của khách xuống 30%, giải quyết triệt để tranh cãi về khối lượng công việc giữa các nhân viên dọn phòng.

---

### MỤC 6. CLTSN3-432: Giá thỏa thuận cho khách đoàn và khách công ty (B2B)
* **Story Points:** 5 SP | **Thành viên phụ trách:** ND
* **Vai diễn demo:** Nhân viên Kinh doanh (Sales Corporate) & Lễ tân.
* **Đường dẫn màn hình:** Menu **Khách & Dịch vụ** $\rightarrow$ **Đối tác công ty** & **Giá thỏa thuận** (`/manage/corporate-clients`).

#### 1. Bối cảnh nghiệp vụ:
Các đối tác lưu trú thường xuyên (Công ty công nghệ, Hãng lữ hành...) luôn có hợp đồng khung với mức giá chiết khấu riêng (Contracted/Negotiated Rate). Hệ thống phải tự áp dụng đúng giá hợp đồng mà không làm lộ giá hay ảnh hưởng đến giá bán lẻ trên Website.

#### 2. Kịch bản từng bước thao tác:
* **Bước 1:** Vào trang `/manage/corporate-clients`.
* **Bước 2:** Xem hồ sơ đối tác doanh nghiệp mẫu: **Công ty Cổ phần Viễn thông FPT**:
  * Mã số thuế, đầu mối liên hệ, thời hạn hợp đồng.
  * Bảng giá thỏa thuận riêng theo loại phòng:
    * *Phòng Deluxe:* Giá công khai 1.200.000đ $\rightarrow$ Giá hợp đồng FPT: **950.000đ/đêm**.
    * *Phòng Suite:* Giá công khai 2.200.000đ $\rightarrow$ Giá hợp đồng FPT: **1.800.000đ/đêm**.
* **Bước 3 (Thao tác đặt phòng áp giá tự động):**
  * Chuyển sang màn hình **Đặt phòng mới** (`/manage/bookings`).
  * Chọn nguồn khách: **"Khách công ty / B2B"** $\rightarrow$ Chọn **"FPT Software"**.
  * Chọn hạng phòng Deluxe $\rightarrow$ Đơn giá tự động nhảy về **950.000đ** (thay vì giá niêm yết 1.200.000đ).
  * Hóa đơn thanh toán tự động ghi nhận mã hợp đồng đối tác để cuối tháng đối soát công nợ.

#### 3. Kết quả & Giá trị mang lại:
* Chuyên nghiệp hóa kênh bán phòng B2B, tránh tình trạng nhân viên lễ tân nhớ nhầm giá hoặc áp sai chiết khấu gây thất thoát doanh thu.

---

### MỤC 7. CLTSN3-440: Khách xem và tải hóa đơn của mình (Guest Self-Service Portal)
* **Story Points:** 3 SP | **Thành viên phụ trách:** SH
* **Vai diễn demo:** Khách lưu trú sau khi trả phòng (Thực hiện trên điện thoại/trình duyệt ẩn danh).
* **Đường dẫn màn hình:** Cổng công khai không cần đăng nhập: `/booking-detail/lookup` (hoặc mở trực tiếp từ Chatbot).

#### 1. Bối cảnh nghiệp vụ:
Sau khi check-out, khách hàng thường cần hóa đơn thanh toán để thanh toán công tác phí hoặc lưu trữ. Thay vì phải liên hệ lễ tân xin chụp ảnh hóa đơn, khách có thể tự tra cứu và tải hóa đơn PDF chuẩn chỉ bất kỳ lúc nào.

#### 2. Kịch bản từng bước thao tác:
* **Bước 1:** Mở cửa sổ ẩn danh truy cập đường dẫn: `http://localhost:5173/booking-detail/lookup` (hoặc bấm nút "Tra cứu đặt phòng & hóa đơn" ngay trên cửa sổ Chatbot ở trang chủ).
* **Bước 2:** Nhập thông tin xác thực bảo mật 2 yếu tố:
  * **Mã đặt phòng:** `101`
  * **Số điện thoại:** `0912345678`
  * Bấm nút **"Tra cứu ngay"**.
* **Bước 3:** Màn hình hóa đơn điện tử hiển thị sang trọng:
  * Tiêu đề thương hiệu khách sạn StayAway, logo, địa chỉ, hotline.
  * Thông tin khách hàng đã được che mờ bảo mật (Masking: SĐT `091****678`).
  * Bảng chi tiết: Tiền phòng từng đêm, phí phụ thu ăn sáng, xe máy, giảm trừ tiền đặt cọc.
  * Con dấu điện tử màu xanh: **"ĐÃ THANH TOÁN TOÀN BỘ (PAID)"**.
* **Bước 4 (Tải hóa đơn):**
  * Bấm nút **"In / Tải hóa đơn PDF"**.
  * Cửa sổ in chuẩn A4 hiện lên, định dạng hóa đơn đẹp mắt, chuẩn mực và sắc nét.

#### 3. Kết quả & Giá trị mang lại:
* Nâng cao trải nghiệm khách hàng hiện đại chuẩn 4.0, giảm tải 85% các cuộc gọi/tin nhắn hỗ trợ xin lại hóa đơn tại quầy lễ tân.

---

### MỤC 8. CLTSN3-436: Gợi ý điều chỉnh giá theo công suất dự báo & Trợ lý AI (Dynamic Pricing)
* **Story Points:** 8 SP | **Thành viên phụ trách:** PM
* **Vai diễn demo:** Giám đốc doanh thu (Revenue Manager) & Chủ khách sạn.
* **Đường dẫn màn hình:** Menu **Phòng** $\rightarrow$ **Gợi ý điều chỉnh giá** (`/manage/price-suggestions`).

#### 1. Bối cảnh nghiệp vụ:
Đây là **tính năng trọng điểm và đột phá công nghệ lớn nhất của Sprint 10**. Sử dụng thuật toán dự báo công suất 30 ngày kết hợp mô hình AI Google Gemini Flash để phát hiện ngày nguy cơ "cháy phòng" (để tăng giá tối ưu lợi nhuận) hoặc ngày "vắng khách" (để giảm giá/mở thêm kênh bán kích cầu).

#### 2. Kịch bản từng bước thao tác:
* **Bước 1:** Truy cập `/manage/price-suggestions`.
* **Bước 2:** Nhấn mạnh **Cam kết an toàn (Safety Guarantee)**:
  * Đọc to banner: *"Hệ thống hỗ trợ gợi ý có kiểm soát — Tuyệt đối không tự động đổi giá. Mọi thao tác thay đổi giá do Chủ cơ sở trực tiếp thực hiện qua tính năng cấu hình giá"*.
* **Bước 3 (Trình diễn 4 thẻ dữ liệu phân tích 30 ngày):**
  * **Công suất dự báo trung bình 30 ngày:** `48.5%` (Đã đặt 218 / 450 phòng-đêm).
  * **Số đêm phòng dự kiến bán:** `218 đêm`.
  * **Doanh thu cơ sở ước tính:** `198.500.000 VNĐ`.
  * **Tiềm năng tăng trưởng AI:** `+27.800.000 VNĐ (+14.0%)`.
  * Phân rã công suất Cuối tuần (`78.2%`) so với Giữa tuần (`35.4%`).
* **Bước 4 (Phân rã theo Loại phòng):**
  * Thấy rõ phòng VIP/Suite tỷ lệ lấp đầy cao $\ge 80\%$ (nhãn đỏ: *Nhu cầu cao*).
  * Phòng Standard tỷ lệ lấp đầy thấp $\le 30\%$ (nhãn vàng: *Nhu cầu thấp*).
* **Bước 5 (Kích hoạt AI Gemini Flash phân tích toàn diện 30 ngày):**
  * Bấm nút **"AI Phân tích chiến lược 30 ngày"** (Nút màu xanh Olive chuẩn StayAway).
  * AI Gemini tải dữ liệu và xuất bản báo cáo chiến lược dạng Markdown chuẩn đẹp mắt:
    * *Chẩn đoán:* Cuối tuần các tuần 1 & 2 nhu cầu cao đột biến.
    * *Đề xuất hành động:* Tăng giá 15% cho phòng VIP; Giảm 10% phòng Standard các ngày thứ 2 đến thứ 4 hoặc liên kết thêm OTA.
* **Bước 6 (Tương tác hỏi đáp với Trợ lý AI - Ask AI Bar):**
  * Bấm vào chip gợi ý: *"Chiến lược giá tối ưu cho dịp cuối tuần tới là gì?"* $\rightarrow$ AI phân tích và trả lời ngay tức thì.
* **Bước 7 (Thực thi giá):**
  * Tại ngày có gợi ý, bấm nút **"Xem & Điều chỉnh giá"** $\rightarrow$ Hệ thống chuyển ngay đến trang cấu hình giá để Chủ cơ sở trực tiếp áp dụng mức giá mới.

#### 3. Kết quả & Giá trị mang lại:
* Mang sức mạnh quản trị doanh thu năng động (Dynamic Pricing) chuẩn khách sạn quốc tế vào tay các chủ khách sạn vừa và nhỏ, giúp tăng trưởng từ 10-18% doanh thu phòng mỗi tháng.

---

## III. TỔNG KẾT KỸ THUẬT (ENGINEERING EXCELLENCE)

* **Pipeline CI/CD Tự động hóa hoàn toàn:**
  * Toàn bộ các lần commit được kiểm thử tự động trên GitHub Actions Ubuntu Runner.
  * **Backend:** JUnit 5 test suite với H2 in-memory DB: **PASSED 100%**.
  * **Frontend:** Vitest + React Testing Library (43 test suites, 147 test cases): **PASSED 100%**.
  * **Build Production:** `npm run build` Vite bundle tối ưu hóa dung lượng: **SUCCESS**.
* **Kiến trúc AI Fallback 4 tầng (Resilience Architecture):**
  * Tự động luân chuyển model: `gemini-3.8-flash` $\rightarrow$ `gemini-3.5-flash` $\rightarrow$ `gemini-3.5-flash-lite` $\rightarrow$ `gemini-3.1-flash-lite`.
  * Hỗ trợ danh sách đa API Key dự phòng khi gặp sự cố quota hoặc rate limit.
* **Tối ưu Cơ sở dữ liệu:**
  * Cấu hình Batch Fetch Size = 100, Batch Insert/Update = 50 loại bỏ hoàn toàn vấn đề N+1 query.
  * Tách biệt các tác vụ gọi AI ra ngoài `@Transactional` để bảo vệ connection pool HikariCP.
* **Chuẩn hóa Design System:**
  * Đồng bộ 100% bảng màu thương hiệu StayAway: Xanh tự nhiên `#5E7144`, nền ấm sage `#F4F6F0`, thẻ trắng viền xám tinh tế, chữ đậm nét tương phản cao.

---

## IV. BỘ CÂU HỎI Q&A DỰ PHÒNG CHO PRODUCT OWNER & BAN GIẢM KHẢO

1. **Câu hỏi:** *Nếu AI đưa ra dự báo và khuyến nghị giá không phù hợp với thực tế thị trường thì sao?*
   * **Trả lời:** Hệ thống thiết kế theo triết lý "Human-in-the-loop" - Con người là trung tâm quyết định. AI không tự ý can thiệp vào cơ sở dữ liệu giá mà chỉ đóng vai trò trợ lý cố vấn. Chủ cơ sở là người duyệt và có quyền tùy chỉnh ngưỡng kích hoạt khuyến nghị tại modal "Cấu hình ngưỡng".
2. **Câu hỏi:** *Dữ liệu khách hàng tải hóa đơn trên mạng có bị lộ số CCCD và thông tin riêng tư không?*
   * **Trả lời:** Toàn bộ thông tin nhạy cảm (Số điện thoại, số CCCD/CMND) đều được áp dụng thuật toán che dữ liệu (Data Masking) từ tầng Service Backend trước khi trả về Client. Đồng thời khách bắt buộc phải cung cấp đúng cả Mã đặt phòng và Số điện thoại đã đặt thì mới xem được hóa đơn.
3. **Câu hỏi:** *Khi hệ thống bị mất mạng hoặc API Gemini bị quá tải thì tính năng gợi ý giá và chatbot có bị tê liệt không?*
   * **Trả lời:** Không. Hệ thống có 2 cơ chế dự phòng: (1) Kiến trúc luân chuyển 4 model Gemini cùng nhiều khóa API; (2) Rule-engine dự phòng cục bộ tự động kích hoạt để gợi ý giá theo ngưỡng cứng và trả lời khách hàng mà không gián đoạn dịch vụ.
