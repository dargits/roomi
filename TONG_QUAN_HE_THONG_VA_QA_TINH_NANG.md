# 🏨 TỔNG QUAN TOÀN DIỆN HỆ THỐNG STAY AWAY PMS (ROOMI)
### Hệ Thống Quản Lý Lưu Trú Khách Sạn & Chuỗi Căn Hộ Thông Minh
*Tài liệu tổng hợp Kiến trúc hệ thống, Danh mục tính năng, Luồng vận hành chi tiết & Bộ câu hỏi phản biện chuyên sâu (Q&A)*

---

## 📑 MỤC LỤC NỘI DUNG

1. [TỔNG QUAN DỰ ÁN & KIẾN TRÚC HỆ THỐNG](#1-tổng-quan-dự-án--kiến-trúc-hệ-thống)
   - 1.1. Bối cảnh & Bài toán thực tế giải quyết
   - 1.2. Kiến trúc kỹ thuật tổng thể (High-Level Architecture)
   - 1.3. Ngăn xếp công nghệ (Technology Stack)
   - 1.4. Ma trận phân quyền người dùng (RBAC Matrix)
2. [DANH MỤC PHÂN HỆ & TÍNH NĂNG TOÀN DIỆN (FEATURE MATRIX)](#2-danh-mục-phân-hệ--tính-năng-toàn-diện)
   - Module 1: Quản lý Đặt phòng Lẻ & Sơ đồ Phòng (Bookings & Calendar)
   - Module 2: Quản lý Đặt phòng Đoàn & Thao tác Hàng loạt (Group Booking & Bulk Ops)
   - Module 3: Động cơ Định giá Động & Gợi ý giá AI (Smart Pricing & AI Advisor)
   - Module 4: Quản lý Tiền cọc & Thanh toán VietQR Động (Deposit & Payment Flow)
   - Module 5: Nhận phòng, Quét CCCD Gắn Chip & Khai báo Tạm trú (Check-in & Declaration)
   - Module 6: Dịch vụ Phát sinh, Minibar & Tồn kho (Extra Services & Inventory)
   - Module 7: Trả phòng, Quyết toán Hóa đơn & Phê duyệt Nợ (Check-out & Debt Approval)
   - Module 8: Buồng phòng 2 bước, Đo lường Năng suất & Sự cố (Housekeeping & Incidents)
   - Module 9: Đồng bộ Lịch 2 chiều Kênh OTA Quốc tế (Channel Manager - iCal)
   - Module 10: Cổng Khách hàng Công khai & Báo giá Đoàn (Public Guest Portal)
   - Module 11: Trợ lý Ảo AI Đàm thoại Thông minh (AI Chatbot Assistant)
   - Module 12: Khách hàng Thân thiết & Thẻ Thành viên (Loyalty & CRM)
   - Module 13: Ca làm việc Thu ngân, Sổ cái Kế toán & Chỉ số Doanh thu (Finance & Reports)
   - Module 14: Giám sát Trùng phòng, Nhật ký Audit & Sao lưu Dữ liệu (Audit & Security)
3. [CÁC LUỒNG VẬN HÀNH NGHIỆP VỤ CỐT LÕI (CORE BUSINESS FLOWS)](#3-các-luồng-vận-hành-nghiệp-vụ-cốt-lõi)
   - Luồng 1: Vòng đời đơn đặt phòng lẻ (Individual Booking Lifecycle)
   - Luồng 2: Quy trình đặt phòng đoàn & Bulk Check-in / Bulk Check-out
   - Luồng 3: Thuật toán giải quyết thứ tự ưu tiên Định giá thông minh
   - Luồng 4: Quy trình thu cọc VietQR & Khấu trừ dòng tiền tự động
   - Luồng 5: Quy trình tiếp nhận khách, giải mã CCCD & Masking dữ liệu
   - Luồng 6: Quy trình Check-out, Kiểm soát hóa đơn & Bảo lãnh công nợ
   - Luồng 7: Quy trình Buồng phòng 2 bước & Vòng tuần hoàn phòng
   - Luồng 8: Cơ chế đồng bộ 2 chiều với Airbnb / Booking.com / Agoda
   - Luồng 9: Quy trình mở/kết ca thu ngân và chốt sổ cái hàng ngày
   - Luồng 10: Quy trình hủy phòng & Tính phạt hoàn tiền tự động
4. [BỘ CÂU HỎI & TRẢ LỜI CHUYÊN SÂU THEO TÍNH NĂNG (COMPREHENSIVE Q&A)](#4-bộ-câu-hỏi--trả-lời-chuyên-sâu-theo-tính-năng)
   - Nhóm 1: Quản lý Đặt phòng, Chống trùng phòng & Đồng bộ OTA
   - Nhóm 2: Động cơ Tính giá Động & Trí tuệ Nhân tạo AI
   - Nhóm 3: Đặt phòng Đoàn, Thao tác Bulk & Đàm phán Giá B2B
   - Nhóm 4: Tài chính, Tiền cọc, VietQR & Cơ chế Kiểm soát Nợ
   - Nhóm 5: Check-in, Bóc tách CCCD số & Tuân thủ Nghị định 13
   - Nhóm 6: Buồng phòng 2 bước, Đo lường KPI & Quản lý Sự cố/Đồ thất lạc
   - Nhóm 7: Ca thu ngân, Sổ cái kế toán & Báo cáo quản trị khách sạn
   - Nhóm 8: Kiến trúc kỹ thuật, Hiệu năng, Bảo mật & Vận hành Production
5. [TỔNG KẾT GIÁ TRỊ DỰ ÁN & TIỀM NĂNG PHÁT TRIỂN](#5-tổng-kết-giá-trị-dự-án--tiềm-năng-phát-triển)

---

# 1. TỔNG QUAN DỰ ÁN & KIẾN TRÚC HỆ THỐNG

### 1.1. Bối cảnh & Bài toán thực tế giải quyết
Trong ngành khách sạn và căn hộ dịch vụ vừa và nhỏ (Boutique Hotels, Homestays, Service Apartments) tại Việt Nam, các cơ sở kinh doanh đối mặt với 6 thách thức vận hành lớn:
1. **Trùng phòng (Overbooking):** Bán phòng thủ công song song trên kênh trực tiếp (walk-in/hotline) và các nền tảng OTA (Airbnb, Booking.com, Agoda) dẫn đến tình trạng hủy phòng giờ chót hoặc đền bù uy tín.
2. **Thất thoát tài chính & Quên thu cọc:** Khách đặt giữ chỗ nhưng không đến (No-show); nhân viên quên cấn trừ tiền cọc khi trả phòng, hoặc thanh toán sót dịch vụ minibar.
3. **Thủ tục nhận phòng thủ công chậm chạp:** Lễ tân gõ tay từng ký tự trên thẻ CMND/CCCD, vừa sai sót họ tên/ngày sinh, vừa làm khách chờ đợi và không đáp ứng kịp quy định khai báo tạm trú của Công an địa phương.
4. **Định giá cứng nhắc:** Không linh hoạt điều chỉnh giá theo mùa cao điểm, cuối tuần, ngày lễ hoặc đối tác doanh nghiệp, dẫn đến tối ưu hóa doanh thu kém.
5. **Gãy liên kết giữa Lễ tân và Buồng phòng:** Lễ tân trả phòng nhưng buồng phòng không biết phòng nào cần dọn trước; buồng dọn xong nhưng phòng không được kiểm tra nghiệm thu kịp thời để đón khách mới.
6. **Bất đối xứng thông tin giữa Ca làm việc:** Ca sáng bàn giao ca tối bằng sổ tay dễ thất lạc tiền mặt chênh lệch.

**Stay Away PMS (Roomi)** được phát triển nhằm giải quyết triệt để các nỗi đau trên bằng một nền tảng vận hành số hóa khép kín 100%, bảo mật cao và tự động hóa tối đa.

---

### 1.2. Kiến trúc kỹ thuật tổng thể (High-Level Architecture)

```
                            [ TRÌNH DUYỆT KHÁCH HÀNG / NHÂN VIÊN ]
                             (Desktop, Tablet, Mobile Responsive)
                                              │
                                              ▼ HTTPS / WSS
                                 [ NGINX REVERSE PROXY ]
                                  (SSL / TLS, Rate Limiting)
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
          [ FRONTEND STATIC APP ]                            [ BACKEND REST API ]
          React 18 + TypeScript + Vite                       Spring Boot 3 (Java 17)
          TailwindCSS + Lucide Icons                         Spring Security + JWT
                     │                                                 │
                     │                                                 ├─► Controller Layer (REST Endpoints)
                     │                                                 ├─► Validation Gate (@Valid, Logic)
                     │                                                 ├─► Service Layer (Business Logic)
                     │                                                 ├─► Event Publisher (Async Events)
                     │                                                 └─► Data Access Layer (Spring Data JPA)
                     │                                                                 │
                     │                                                                 ▼
                     │                                                        [ DATABASE ENGINE ]
                     │                                                        MySQL 8.0 (InnoDB)
                     │                                                                 │
                     └─────────────────────── TÍCH HỢP NGOÀI ──────────────────────────┘
                                              ├─► Resend API (Transactional Email)
                                              ├─► VietQR Napas247 (Dynamic Banking QR)
                                              ├─► Google Gemini API (AI Chatbot & Smart Pricing)
                                              └─► iCal Channels (Airbnb, Booking.com, Agoda)
```

---

### 1.3. Ngăn xếp công nghệ (Technology Stack)

| Phân tầng | Công nghệ / Thư viện chính | Vai trò kỹ thuật trong hệ thống |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite | Xây dựng Single Page Application hiệu năng cao, type-safe, hot reload nhanh. |
| **Styling & UI** | TailwindCSS, Lucide React, HeadlessUI | Giao diện chuẩn Enterprise, Responsive hoàn hảo từ mobile đến desktop, tối ưu UX lễ tân. |
| **Quản lý State & Gọi API** | Axios Interceptors, React Router v6 | Đính kèm Bearer Token tự động, bắt mã lỗi 401/403 tập trung, điều hướng trang mượt mà. |
| **Backend Core** | Java 17 LTS, Spring Boot 3.x | Nền tảng micro-service monolithic kiến trúc chuẩn Clean Architecture, xử lý luồng giao dịch cao. |
| **Bảo mật & Phân quyền** | Spring Security 6, JJWT (HMAC SHA-256) | Xác thực phi trạng thái (Stateless Authentication), phân quyền Role-Based Access Control (RBAC). |
| **Tầng dữ liệu (ORM)** | Spring Data JPA, Hibernate, HikariCP | Quản lý vòng đời Entity, Connection Pooling hiệu năng cao, giao dịch ACID (`@Transactional`). |
| **Cơ sở dữ liệu** | MySQL 8.0 Community | Lưu trữ dữ liệu quan hệ, thiết lập chỉ mục (Indexes) trên các trường tra cứu thường xuyên (checkIn, checkOut, phone, cccd). |
| **Tích hợp Email** | Resend REST API | Gửi phiếu xác nhận đặt phòng song ngữ tự động, OTP khôi phục mật khẩu tốc độ dưới 1s. |
| **Thanh toán & Ngân hàng** | VietQR Open API (Napas247) | Tạo mã QR động chuẩn hóa quốc gia có số tiền và nội dung đơn cọc, không tốn phí cổng thanh toán. |
| **Trí tuệ nhân tạo (AI)** | Google Gemini 1.5 Pro / Flash | Phân tích xu hướng thị trường, đề xuất khoảng giá thông minh và chatbot tư vấn lưu trú 24/7. |
| **Đồng bộ Kênh OTA** | iCalendar (RFC 5545) Parser / Generator | Đồng bộ lịch phòng 2 chiều với Airbnb, Booking.com để ngăn chặn Overbooking. |
| **Đóng gói & Triển khai** | Docker, Docker Compose, Nginx, Let's Encrypt | Ổn định môi trường production, tự động cấp phát SSL miễn phí, triển khai chỉ bằng 1 lệnh. |

---

### 1.4. Ma trận phân quyền người dùng (RBAC Matrix)

| Quyền hạn / Nghiệp vụ | ADMIN | OWNER (Chủ cơ sở) | RECEPTIONIST | HOUSEKEEPER | ACCOUNTANT | GUEST (Portal) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Quản lý tài khoản nhân viên & Cấu hình KS | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem bảng điều khiển & Báo cáo doanh thu (ADR/RevPAR) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Phê duyệt bảo lãnh công nợ trả phòng (`DebtApproval`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tạo đặt phòng mới (Lẻ & Đoàn) | ✅ | ❌ *(Chỉ xem/quản lý)* | ✅ | ❌ | ❌ | Gửi yêu cầu qua Web |
| Cập nhật / Hủy / Đổi phòng / Check-in / Check-out | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Thu tiền cọc & Quyết toán hóa đơn | ✅ | ✅ | ✅ | ❌ | ✅ | Chỉ thanh toán |
| Xem dữ liệu CCCD đầy đủ (Không bị Masking) | ✅ | ✅ | ❌ (Bị che) | ❌ | ❌ | ❌ |
| Nhận việc buồng phòng & Bấm giờ dọn phòng | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Nghiệm thu kiểm tra phòng sạch (`INSPECTING` $\rightarrow$ `AVAILABLE`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Mở / Đóng ca thu ngân & Khóa sổ cái (`DailyLedger`) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Sao lưu & Phục hồi cơ sở dữ liệu (`Backup/Restore`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

# 2. DANH MỤC PHÂN HỆ & TÍNH NĂNG TOÀN DIỆN

### Module 1: Quản lý Đặt phòng Lẻ & Sơ đồ Phòng Trực quan (Bookings & Calendar)
- **Tạo đặt phòng tức thì:** Nhập thông tin khách, tự động gợi ý lịch sử khách cũ qua số điện thoại; chọn khoảng ngày và hạng phòng.
- **Sơ đồ phòng trực quan (Interactive Timeline Calendar):** Hiển thị trực quan theo dạng lưới ma trận giữa Danh sách phòng vật lý (trục tung) và Dòng thời gian (trục hoành). Hỗ trợ kéo thả (drag-and-drop), đổi phòng nhanh.
- **Kiểm tra tình trạng trống thời gian thực (Real-time Availability Checker):** Ngăn chặn việc chọn khoảng ngày đã kín phòng.
- **In phiếu xác nhận & Phiếu đăng ký lưu trú:** Tự động tạo bản PDF song ngữ (Việt - Anh) kèm mã QR tra cứu đơn hàng để in hoặc gửi email tự động cho khách.
- **Điều chỉnh linh hoạt trong lưu trú:**
  - *Đổi phòng (Change Room):* Chuyển khách sang phòng khác cùng hạng hoặc phòng sạch khác.
  - *Gia hạn lưu trú (Extend Stay):* Kiểm tra xung đột các đêm tiếp theo và tính bù trừ tiền phòng.
  - *Nâng hạng phòng (Upgrade Room):* Chuyển lên hạng cao hơn và tự động tính chênh lệch giá.

### Module 2: Quản lý Đặt phòng Đoàn & Thao tác Hàng loạt (Group Booking & Bulk Ops)
- **Khởi tạo Đơn Đoàn (Master Group Booking):** Tạo một đơn cha đại diện cho công ty lữ hành hoặc đoàn khách với thông tin Trưởng đoàn (`Leader`) và chính sách riêng.
- **Tách phòng con linh hoạt (Sub-Bookings):** Gán nhiều phòng khác loại vào cùng một mã đoàn, mỗi phòng con có thể có danh sách khách ở và thời gian lưu trú độc lập.
- **Nhận phòng hàng loạt (Bulk Check-in):** Check-in một chạm cho toàn bộ danh sách phòng con trong đoàn khi đoàn xe tới khách sạn, tiết kiệm 90% thời gian so với check-in từng phòng.
- **Trả phòng hàng loạt (Bulk Check-out):** Tự động đối soát tổng chi phí toàn đoàn, kiểm tra hóa đơn đoàn đã thanh toán hay chưa trước khi nhả phòng hàng loạt.
- **Hóa đơn tổng hợp toàn đoàn (Master Group Invoice):** Tùy chọn gộp chung tiền phòng của cả đoàn vào 1 hóa đơn tổng do công ty thanh toán, các chi phí phát sinh cá nhân (minibar) có thể thanh toán riêng tại từng phòng.

### Module 3: Động cơ Định giá Động & Gợi ý Giá Thông minh (Smart Pricing & AI Advisor)
- **Định giá đa tầng tự động:** Tự động phân tích từng đêm lưu trú để áp dụng mức giá chính xác nhất:
  - *Giá thỏa thuận B2B:* Dành cho công ty/đối tác doanh nghiệp có hợp đồng dài hạn.
  - *Giá Lễ/Tết (`HolidayPrice`):* Tự động áp dụng mức giá cao điểm vào các ngày lễ quốc gia.
  - *Phụ thu cuối tuần (`WeekendPriceConfig`):* Tự động cộng phụ thu đêm Thứ 6, Thứ 7.
  - *Giá mùa vụ (`SeasonalPrice`):* Tự động áp giá theo khoảng ngày mùa du lịch.
  - *Phụ thu quá số người:* Tự động tính tiền thêm người lớn/trẻ em vượt định mức tiêu chuẩn của phòng.
- **Trợ lý AI Đề xuất Giá (`AiPriceController`):** Sử dụng Google Gemini AI để phân tích công suất phòng lịch sử, dự báo nhu cầu thị trường và gợi ý mức giá tối ưu (Dynamic Revenue Optimization) theo từng thời điểm.

### Module 4: Quản lý Tiền cọc & Thanh toán VietQR Động (Deposit & Payment Flow)
- **Cấu hình chính sách cọc thông minh (`DepositPolicy`):** Thiết lập tỷ lệ cọc bắt buộc (ví dụ: 50% tổng đơn nếu ở trên 2 đêm hoặc rơi vào mùa lễ hội).
- **Sinh mã VietQR động chuẩn Napas247:** Sinh trực tiếp mã QR ngân hàng nhúng sẵn số tiền cọc chính xác và cú pháp chuẩn hóa (VD: `CK COC 108`), loại bỏ hoàn toàn lỗi gõ sai tài khoản hoặc nhầm tiền.
- **Đối soát cọc đa trạng thái:** Quản lý vòng đời tiền cọc: `PENDING` (Chờ thu) $\rightarrow$ `COLLECTED` (Đã thu) $\rightarrow$ `REFUNDED` (Hoàn trả) hoặc `FORFEITED` (Tịch thu do khách hủy phòng vi phạm chính sách).
- **Tự động kích hoạt trạng thái đơn:** Khi tiền cọc đã thu $\ge$ tiền cọc yêu cầu, đơn hàng tự động chuyển từ `NEW` sang `CONFIRMED`.

### Module 5: Nhận phòng, Quét QR CCCD Gắn Chip & Khai báo Tạm trú (Check-in & Declaration)
- **Giải mã mã QR thẻ CCCD gắn chip (12 số):** Tích hợp camera và parser giải mã trực tiếp chuỗi ký tự theo quy chuẩn Bộ Công An, bóc tách chính xác: Số CCCD, Số CMND cũ, Họ tên, Ngày sinh, Giới tính, Quê quán, Ngày cấp.
- **Bảo vệ dữ liệu cá nhân (Data Masking - Nghị định 13):** Toàn bộ số CCCD và SĐT trên giao diện lễ tân đều được ẩn các ký tự giữa (ví dụ: `001096***456`). Chỉ Quản lý cấp cao mới có quyền tra cứu toàn văn và bị ghi lại trong `PersonalDataAuditLog`.
- **Hồ sơ Khai báo Tạm trú tự động (`StayDeclaration`):** Khi bấm check-in, hệ thống tự động gom dữ liệu khách lưu trú để sinh bản kê khai báo tạm trú trực tuyến xuất file gửi Công an địa phương.
- **Quản lý khách đi cùng phòng (`RoomStayGuest`):** Cho phép một phòng có nhiều khách lưu trú, quét CCCD cho từng người để đảm bảo 100% người ở trong khách sạn đều được định danh hợp pháp.

### Module 6: Quản lý Dịch vụ Phát sinh, Minibar & Tồn kho (Extra Services & Inventory)
- **Danh mục dịch vụ phong phú:** Quản lý danh mục Giặt là, Ăn uống, Thuê xe, Đồ uống minibar...
- **Snapshot đơn giá:** Khi ghi nhận dịch vụ vào phòng, hệ thống lưu lại mức giá tại thời điểm sử dụng, đảm bảo bảng giá dịch vụ sau này có tăng thì hóa đơn cũ vẫn chuẩn xác.
- **Quản lý kho minibar tự động:** Tự động trừ tồn kho khi lễ tân thêm đồ uống vào phòng, cảnh báo khi số lượng hàng trong kho chạm ngưỡng tối thiểu.

### Module 7: Trả phòng, Quyết toán Hóa đơn & Phê duyệt Nợ (Check-out & Debt Approval)
- **Tự động cấn trừ tiền cọc:** Khi check-out, hệ thống tự động cấn trừ số tiền cọc đã thu trước đó vào tổng bill.
- **Kiểm soát cổng thanh toán nghiêm ngặt:** Chặn tuyệt đối hành vi Check-out nếu hóa đơn chưa đạt trạng thái `PAID`, ngăn ngừa thất thoát dòng tiền do nhân viên quên thu tiền.
- **Cơ chế Phê duyệt Bảo lãnh Công nợ (`DebtApproval`):** Trong trường hợp khách VIP hoặc khách công ty được phép nợ tiền phòng thanh toán sau, Quản lý/Chủ cơ sở (`OWNER`/`ADMIN`) có thể tạo và ký duyệt một phiếu bảo lãnh nợ điện tử. Chỉ khi có phiếu này, lễ tân mới được phép check-out đơn chưa thanh toán.
- **In hóa đơn chuyên nghiệp:** Hỗ trợ xem trước và in hóa đơn thanh toán chi tiết (tiền phòng từng đêm, phụ thu, dịch vụ, giảm giá, cấn trừ cọc, VAT).

### Module 8: Buồng phòng 2 bước, Đo lường Năng suất & Sự cố Phòng (Housekeeping & Incidents)
- **Quy trình buồng phòng 2 bước khép kín:**
  - *Bước 1 (Dọn dẹp):* Nhân viên nhận phòng $\rightarrow$ Chuyển sang `IN_PROGRESS` (Hệ thống bấm giờ thực tế). Dọn xong $\rightarrow$ Chuyển sang `INSPECTING` (Chờ nghiệm thu).
  - *Bước 2 (Kiểm tra & Nghiệm thu):* Trưởng ca/Lễ tân đi kiểm tra chất lượng vệ sinh $\rightarrow$ Bấm nghiệm thu $\rightarrow$ Phòng mới chính thức chuyển thành `AVAILABLE` để đón khách mới.
- **Đo lường năng suất (Housekeeping KPI Analytics):** Ghi nhận thời gian dọn thực tế so với thời gian tiêu chuẩn để đánh giá hiệu suất nhân viên.
- **Quản lý Sự cố Phòng (`RoomIncident`):** Ghi nhận hỏng hóc thiết bị (máy lạnh hỏng, vỡ gương...), tự động khóa phòng chuyển sang trạng thái `OUT_OF_SERVICE` để kỹ thuật sửa chữa.
- **Quản lý Đồ thất lạc (`LostItem`):** Lưu trữ thông tin đồ khách bỏ quên khi check-out (ảnh chụp, ngày nhặt, người nhặt, phòng nhặt, trạng thái bàn giao lại cho khách).

### Module 9: Đồng bộ Lịch 2 chiều Kênh OTA Quốc tế (Channel Manager - iCal)
- **Chuẩn giao thức quốc tế iCalendar (RFC 5545):** Tương thích chuẩn đồng bộ lịch với Airbnb, Booking.com, Agoda, Vrbo.
- **Xuất lịch phòng nội bộ (Export iCal):** Cung cấp đường dẫn URL iCal công khai cho từng phòng vật lý để các sàn OTA định kỳ kéo lịch về, bảo đảm khi phòng đã bán tại quầy thì sàn OTA sẽ tự khóa ngày.
- **Nhập lịch từ kênh ngoài (Import iCal):** Định kỳ quét hoặc kích hoạt đồng bộ tức thì các file lịch từ Airbnb/Booking.com, tự động tạo các bản ghi `ChannelRoomBlock` để chặn phòng trên hệ thống nội bộ.

### Module 10: Cổng Khách hàng Công khai & Báo giá Đoàn (Public Guest Portal)
- **Tra cứu đơn hàng không cần đăng nhập:** Khách hàng chỉ cần quét mã QR trên phiếu xác nhận hoặc nhập Mã đơn hàng + Số điện thoại là có thể xem trạng thái đơn, giờ check-in, lịch trình phòng và hóa đơn trực tuyến.
- **Thanh toán trực tuyến:** Cổng công khai hiển thị mã VietQR động để khách tự chuyển khoản tiền cọc tại nhà mà không cần liên hệ lễ tân.
- **Gửi Yêu cầu Báo giá Đặt đoàn Công khai (`PublicGroupBookingRequest`):** Doanh nghiệp lữ hành có thể tự điền số lượng phòng, ngày đến, ngân sách dự kiến. Yêu cầu sẽ đổ về màn hình Quản trị để quản lý liên hệ báo giá và duyệt thành đơn đoàn chính thức.

### Module 11: Trợ lý Ảo AI Đàm thoại Thông minh (AI Chatbot Assistant)
- **Tích hợp LLM Google Gemini:** Hỗ trợ giải đáp thắc mắc về chính sách phòng, bảng giá dịch vụ, quy định nhận phòng/trả phòng 24/7.
- **Hiểu ngữ cảnh nghiệp vụ:** Nắm rõ tình trạng phòng và các dịch vụ nổi bật của khách sạn để tư vấn chính xác cho khách hàng và hỗ trợ nhân viên mới tra cứu nghiệp vụ nhanh chóng.

### Module 12: Khách hàng Thân thiết & Thẻ Thành viên (Loyalty & CRM)
- **Tự động tích lũy điểm thưởng:** Cứ mỗi 100.000 VNĐ chi tiêu hợp lệ sau khi check-out, khách hàng được tích lũy 1 điểm Loyalty.
- **Phân hạng thành viên tự động (Loyalty Tiers):** Bạc (Silver) $\rightarrow$ Vàng (Gold) $\rightarrow$ Bạch kim (Platinum) $\rightarrow$ Kim cương (Diamond).
- **Chiết khấu tự động:** Khi khách hàng thân thiết đặt phòng, hệ thống tự động trừ % giảm giá tương ứng với hạng thẻ thành viên.

### Module 13: Ca làm việc Thu ngân, Sổ cái Kế toán & Chỉ số Doanh thu (Finance & Reports)
- **Quản lý Ca Thu ngân (`CashierShift`):** Bắt buộc nhân viên khai báo số tiền đầu ca (Opening Cash), ghi nhận toàn bộ biến động tiền mặt trong ca và đối soát số tiền thực tế cuối ca (Closing Cash) với phần chênh lệch (Variance) để chống thất thoát.
- **Sổ cái Doanh thu Hàng ngày (`DailyLedger`):** Tự động tổng hợp doanh thu tiền phòng, dịch vụ, tiền cọc thu vào, hoàn cọc và tiền mặt/chuyển khoản mỗi ngày. Khóa sổ cái kế toán để bảo vệ dữ liệu lịch sử không bị can thiệp.
- **Báo cáo chuyên sâu chuẩn khách sạn quốc tế:**
  - **ADR (Average Daily Rate):** Giá bán phòng bình quân mỗi ngày.
  - **RevPAR (Revenue Per Available Room):** Doanh thu trên mỗi phòng sẵn có.
  - **Occupancy Rate:** Tỷ lệ lấp đầy phòng theo tuần/tháng/năm.
  - **Báo cáo nguồn khách (Market Segment):** Tỷ lệ khách trực tiếp, khách OTA, khách đoàn B2B.

### Module 14: Giám sát Trùng phòng, Nhật ký Audit & Sao lưu Dữ liệu (Audit & Security)
- **Nhật ký Xung đột Phòng (`ConcurrencyLog`):** Ghi lại mọi lần xảy ra xung đột khi 2 người cùng thao tác trên 1 phòng hoặc xung đột giữa OTA và lễ tân để truy vết nguyên nhân.
- **Nhật ký Vết thao tác (`AuditLog`):** Ghi lại 100% hành vi nhạy cảm: Ai là người sửa giá, ai là người hủy đơn, ai là người hoàn cọc, địa chỉ IP nào truy cập.
- **Sao lưu & Khôi phục Dữ liệu 1 Chạm (`Backup/Restore`):** Cho phép Quản trị viên xuất file nén sao lưu toàn bộ cơ sở dữ liệu MySQL và khôi phục khi gặp sự cố thảm họa.

---

# 3. CÁC LUỒNG VẬN HÀNH NGHIỆP VỤ CỐT LÕI

### Luồng 1: Vòng đời đơn đặt phòng lẻ (Individual Booking Lifecycle)

```
[ KHÁCH LIÊN HỆ / ĐẾN QUẦY ]
       │
       ▼ (1) Lễ tân nhập thông tin khách, chọn ngày & hạng phòng
[ HỆ THỐNG KIỂM TRA PHÒNG TRỐNG & TÍNH SMART PRICING ]
       │
       ▼ (2) Khởi tạo Booking (Status: NEW)
  Cần cọc? ──► KHÔNG ─────────────────────────────────────┐
       │                                                  │
       ▼ CÓ                                               │
[ TẠO YÊU CẦU CỌC & XUẤT VIETQR ĐỘNG ]                     │
       │                                                  │
       ▼ Khách quét QR chuyển khoản                       │
[ XÁC NHẬN THU CỌC (Deposit: COLLECTED) ]                 │
       │                                                  │
       ▼ (3) Tự động chuyển Booking sang CONFIRMED ◄──────┘
       │
       ▼ (4) Đến ngày nhận phòng: Lễ tân Gán phòng vật lý (AVAILABLE)
[ CHECK-IN: QUÉT MÃ QR CCCD GẮN CHIP ]
       │
       ├─► (4a) Booking: CHECKED_IN | Phòng: OCCUPIED
       ├─► (4b) Tự động tạo Hồ sơ Khai báo Tạm trú (PENDING)
       └─► (4c) Tự động tạo Hóa đơn nháp (Invoice DRAFT)
       │
       ▼ (5) Trong thời gian lưu trú: Sử dụng Minibar / Dịch vụ
[ GHI NHẬN DỊCH VỤ PHÁT SINH VÀO HÓA ĐƠN ]
       │
       ▼ (6) Đến ngày trả phòng: Mở tab Hóa đơn & Quyết toán
[ ĐỐI SOÁT: TỔNG TIỀN = TIỀN PHÒNG + DỊCH VỤ - TIỀN CỌC ĐÃ THU ]
       │
       ▼ Khách thanh toán số tiền còn lại (Tiền mặt / VietQR)
  Hóa đơn: PAID hoặc Có Phiếu Duyệt Nợ (DEBT_APPROVED)?
       │
       ├─► KHÔNG ──► [ CHẶN CHECK-OUT - BÁO LỖI ]
       │
       ▼ CÓ
[ HOÀN TẤT CHECK-OUT ]
       ├─► Booking: CHECKED_OUT | Tích điểm Loyalty cho khách
       └─► Phòng: Tự động đổi sang DIRTY (Chờ dọn dẹp)
       │
       ▼ (7) Bắn thông báo cho bộ phận Buồng phòng
[ BUỒNG PHÒNG DỌN DẸP 2 BƯỚC ] ──► [ PHÒNG SẴN SÀNG (AVAILABLE) ]
```

---

### Luồng 2: Quy trình đặt phòng đoàn & Bulk Check-in / Bulk Check-out

```
[ DOANH NGHIỆP / CÔNG TY DU LỊCH GỬI YÊU CẦU ĐẶT ĐOÀN ]
       │
       ▼
[ LỄ TÂN / QUẢN LÝ TẠO MASTER GROUP BOOKING ]
       │ • Thông tin công ty & Trưởng đoàn
       │ • Hợp đồng giá thỏa thuận (Negotiated Price)
       │ • Hạn thanh toán & Mức cọc đoàn
       ▼
[ TẠO CÁC SUB-BOOKINGS (PHÒNG CON) ]
       │ • Phòng 101 (Deluxe - 2 người)
       │ • Phòng 102 (Deluxe - 2 người)
       │ • Phòng 201 (Suite - 1 người)
       ▼
[ THU CỌC ĐOÀN QUA VIETQR / CHUYỂN KHOẢN DOANH NGHIỆP ]
       │
       ▼ ĐOÀN KHÁCH ĐẾN KHÁCH SẠN
[ LỄ TÂN BẤM NÚT 'BULK CHECK-IN' (NHẬN PHÒNG HÀNG LOẠT) ]
       │
       ▼ Hệ thống kiểm tra điều kiện toàn đoàn:
       ├─► Kiểm tra tất cả phòng được gán đều đang AVAILABLE?
       ├─► Nạp danh sách khách đi kèm theo từng phòng
       └─► Đồng loạt chuyển tất cả phòng con sang CHECKED_IN & OCCUPIED
       │
       ▼ ĐOÀN KHÁCH KẾT THÚC LƯU TRÚ
[ QUYẾT TOÁN HÓA ĐƠN TỔNG HỢP TOÀN ĐOÀN (MASTER INVOICE) ]
       │ • Cấn trừ tiền cọc cả đoàn
       │ • Xuất hóa đơn VAT cho Công ty
       ▼
[ LỄ TÂN BẤM NÚT 'BULK CHECK-OUT' (TRẢ PHÒNG HÀNG LOẠT) ]
       │
       └─► Đồng loạt chuyển tất cả phòng con sang CHECKED_OUT
       └─► Đồng loạt chuyển tất cả các phòng vật lý sang DIRTY
```

---

### Luồng 3: Thuật toán giải quyết thứ tự ưu tiên Định giá thông minh

Khi khách chọn lưu trú từ ngày $D_{\text{in}}$ đến $D_{\text{out}}$, hệ thống chạy vòng lặp bóc tách qua từng đêm $d \in [D_{\text{in}}, D_{\text{out}}-1]$ và xác định đơn giá đêm đó theo thứ tự ưu tiên giảm dần:

$$\text{FinalPrice}(d) = \text{ResolvedBasePrice}(d) + \text{ExtraGuestSurcharge}$$

```
                ┌─────────────────────────────────────────────────────────┐
                │             BẮT ĐẦU ĐỊNH GIÁ CHO ĐÊM d                  │
                └────────────────────────────┬────────────────────────────┘
                                             │
                        Có hợp đồng thỏa thuận B2B?
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │ CÓ                                        │ KHÔNG
                       ▼                                           ▼
             [ GIÁ THỎA THUẬN ]                       Đêm d rơi vào Ngày Lễ/Tết?
          (NegotiatedPriceAgreement)                               │
                                                      ┌────────────┴────────────┐
                                                      │ CÓ                      │ KHÔNG
                                                      ▼                         ▼
                                            [ GIÁ NGÀY LỄ ]           Đêm d là Thứ 6/Thứ 7?
                                            (HolidayPrice)                      │
                                                                       ┌────────┴────────┐
                                                                       │ CÓ              │ KHÔNG
                                                                       ▼                 ▼
                                                            [ PHỤ THU CUỐI TUẦN ]  Rơi vào Mùa cao điểm?
                                                            (WeekendPriceConfig)         │
                                                                                ┌────────┴────────┐
                                                                                │ CÓ              │ KHÔNG
                                                                                ▼                 ▼
                                                                        [ GIÁ MÙA VỤ ]     [ GIÁ GỐC TIÊU CHUẨN ]
                                                                        (SeasonalPrice)     (Base Room Type Price)
                                                                                │                 │
                                                                                └────────┬────────┘
                                                                                         ▼
                                                                           Cộng phụ thu dôi dư số người:
                                                                         max(0, Guests - StandardCapacity)
                                                                                 * ExtraPricePerPerson
```

---

### Luồng 4: Quy trình thu cọc VietQR & Khấu trừ dòng tiền tự động

1. **Khởi tạo cọc:** Đơn hàng tạo xong, nếu thuộc diện chính sách cọc, hệ thống sinh bản ghi `Deposit` với `amount = Booking.totalPrice * DepositPolicy.percentage`.
2. **Hiển thị VietQR:** Hệ thống gọi Open API sinh mã VietQR:
   $$\text{QR\_URL} = \texttt{https://img.vietqr.io/image/}\{\text{BankId}\}\texttt{-}\{\text{AccNum}\}\texttt{-compact2.png?amount=}\{\text{DepositAmount}\}\texttt{\&addInfo=CK COC }\{\text{BookingId}\}$$
3. **Xác nhận thu cọc:** Nhân viên đối soát tài khoản và bấm "Xác nhận đã nhận cọc":
   - Cập nhật `deposit.status = COLLECTED`.
   - Cập nhật `booking.status = CONFIRMED`.
   - Phát sinh `AuditLog` và bắn sự kiện đồng bộ lịch phòng.
4. **Quyết toán tại Check-out:** Khi tạo hóa đơn thanh toán:
   - Hệ thống quét tất cả phiếu cọc có trạng thái `COLLECTED` thuộc booking này.
   - Tự động tạo bản ghi dòng thanh toán khấu trừ tiền cọc: `PaymentType = DEPOSIT_DEDUCTION`.
   - `Số tiền còn phải trả = (Tiền phòng + Tiền dịch vụ) - Tiền cọc đã thu - Giảm giá`.
   - Ngăn chặn hoàn toàn lỗi nhân viên thu trùng hoặc quên trừ tiền cọc của khách.

---

### Luồng 5: Quy trình tiếp nhận khách, giải mã CCCD & Masking dữ liệu

```
[ KHÁCH XUẤT TRÌNH THẺ CCCD GẮN CHIP ]
                  │
                  ▼
[ CAMERA QUÉT MÃ QR HOẶC TẢI ẢNH CHỤP 2 MẶT ]
                  │
                  ▼ Chuỗi ký tự giải mã dạng chuẩn BCA:
    12_SỐ_CCCD | CMND_CŨ | HỌ_VÀ_TÊN | NGÀY_SINH | GIỚI_TÍNH | QUÊ_QUÁN | NGÀY_CẤP
                  │
                  ▼
[ FRONTEND PARSER BÓC TÁCH TỰ ĐỘNG VÀO FORM CHECK-IN ]
                  │
                  ▼ Gửi POST /bookings/{id}/check-in lên Backend
[ BACKEND SERVICE XỬ LÝ LƯU TRỮ VÀ MASKING ]
                  │
     ┌────────────┴──────────────────────────┐
     ▼                                       ▼
[ LƯU DỮ LIỆU TẠM THỜI ]            [ CHE DỮ LIỆU HIỂN THỊ (DATA MASKING) ]
Bảng `IdentityDocument`             DTO gửi về trình duyệt lễ tân:
Phục vụ đối soát & Khai báo lưu trú  • Số CCCD: 001096***456
                  │                  • Số ĐT: 0912***678
                  │                  • Giới tính, Quê quán: hiển thị bình thường
                  ▼                          │
[ HOÀN TẤT KHAI BÁO LƯU TRÚ ]                ▼
Tự động XÓA TOÀN BỘ ảnh CCCD/Hộ chiếu  Quản lý cấp cao cần xem bản rõ?
theo Nghị định 13/2023/NĐ-CP                 │
để bảo vệ an toàn dữ liệu cá nhân!           ▼
                                       Bấm "Xem đầy đủ CCCD"
                                       Ghi vết ngay vào bảng `PersonalDataAuditLog`
```

---

### Luồng 6: Quy trình Check-out, Kiểm soát hóa đơn & Bảo lãnh công nợ

```
                       [ KHÁCH YÊU CẦU TRẢ PHÒNG (CHECK-OUT) ]
                                          │
                                          ▼
                       [ HỆ THỐNG KIỂM TRA TRẠNG THÁI HÓA ĐƠN ]
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
             Hóa đơn đã PAID?                           Hóa đơn chưa PAID?
                    │                                           │
                    ▼ CÓ                                        ▼
             [ CHO PHÉP CHECK-OUT ]                    Khách xin nợ tiền phòng?
                                                                │
                                            ┌───────────────────┴───────────────────┐
                                            │ KHÔNG                                 │ CÓ
                                            ▼                                       ▼
                                 [ YÊU CẦU THANH TOÁN ]                  [ TẠO PHIẾU BẢO LÃNH NỢ ]
                                 Thu nốt bằng Tiền mặt / VietQR           (DebtApprovalRequest)
                                                                                    │
                                                                                    ▼
                                                                         QUẢN LÝ / CHỦ DUYỆT?
                                                                                    │
                                                                   ┌────────────────┴────────────────┐
                                                                   │ TỪ CHỐI                         │ ĐÃ DUYỆT
                                                                   ▼                                 ▼
                                                        [ CHẶN CHECK-OUT ]                [ CHO PHÉP CHECK-OUT ]
                                                        Báo lỗi không đủ điều kiện         Ghi nhận nợ vào Sổ cái
```

---

### Luồng 7: Quy trình Buồng phòng 2 bước & Vòng tuần hoàn phòng

Vòng đời của một phòng vật lý (Physical Room) tuân thủ chặt chẽ cỗ máy trạng thái sau:

```
                          ┌─────────────┐
          ┌──────────────►│  AVAILABLE  │◄───────────────────────────┐
          │               │ (Sạch sẽ)   │                            │
          │               └──────┬──────┘                            │
          │                      │ Check-in                          │
          │                      ▼                                   │
          │               ┌─────────────┐                            │
          │               │  OCCUPIED   │                            │
          │               │ (Đang ở)    │                            │
          │               └──────┬──────┘                            │
          │                      │ Check-out                         │
          │                      ▼                                   │
          │               ┌─────────────┐                            │
          │               │    DIRTY    │                            │
          │               │ (Cần dọn)   │                            │
          │               └──────┬──────┘                            │
          │                      │ Nhận phòng (Housekeeper)          │
          │                      ▼                                   │
          │               ┌─────────────┐                            │
          │               │ IN_PROGRESS │ (Bấm giờ đo lường KPI)     │
          │               └──────┬──────┘                            │
          │                      │ Dọn xong                          │
          │                      ▼                                   │
          │               ┌─────────────┐                            │
          │               │ INSPECTING  │                            │
          │               │ (Chờ duyệt) │                            │
          │               └──────┬──────┘                            │
          │                      │                                   │
          │       Nghiệm thu ĐẠT?│                                   │
          │       ┌──────────────┴──────────────┐                    │
          │       │ ĐẠT                         │ KHÔNG ĐẠT (Bẩn)    │
          └───────┘                             └────────────────────┘
                  (Phòng sạch, mở bán)          (Quay lại dọn tiếp)
```

---

### Luồng 8: Cơ chế đồng bộ 2 chiều với Airbnb / Booking.com / Agoda

1. **Chiều Xuất (Export iCal - Outbound Sync):**
   - Khách sạn cung cấp endpoint `/api/v1/public/calendar/{roomUuid}.ics`.
   - Các sàn Airbnb/Booking.com cấu hình URL này. Cứ mỗi 15-30 phút, sàn OTA sẽ gửi request tải file lịch iCal.
   - Backend Roomi tạo file `.ics` chuẩn RFC 5545 chứa tất cả các khoảng thời gian phòng đó đang có khách (`CHECKED_IN`, `CONFIRMED`).
   - Sàn OTA tự động khóa các ngày tương ứng trên ứng dụng của họ.

2. **Chiều Nhập (Import iCal - Inbound Sync):**
   - Lễ tân dán link iCal của phòng trên Airbnb/Booking.com vào phần Cấu hình kênh (`ChannelController`).
   - Một tác vụ định kỳ Scheduled Job (hoặc nút bấm "Đồng bộ ngay"):
     - Tải file `.ics` từ Airbnb/Booking.com về.
     - Phân tích cú pháp (`iCalParser`) lấy danh sách các sự kiện `VEVENT` có `DTSTART` và `DTEND`.
     - Lưu vào bảng `channel_room_blocks`.
     - Kiểm tra nếu có xung đột với booking nội bộ $\rightarrow$ Ghi log vào `ConcurrencyLog` để cảnh báo lễ tân xử lý gấp.
     - Chặn không cho phép lễ tân tạo booking nội bộ đè lên các ngày đã bị chặn từ OTA.

---

### Luồng 9: Quy trình mở/kết ca thu ngân và chốt sổ cái hàng ngày

1. **Mở ca (Open Shift):**
   - Nhân viên đăng nhập vào đầu ca làm việc, mở màn hình Ca thu ngân (`/shifts`).
   - Nhập số tiền mặt đầu ca có trong két (Opening Cash, ví dụ: 2.000.000 VNĐ).
   - Hệ thống kích hoạt trạng thái ca: `ACTIVE`.

2. **Giao dịch trong ca:**
   - Mọi khoản thu tiền cọc, thu thanh toán trả phòng, tiền mặt hay chuyển khoản đều được tự động gắn mã `shift_id` của ca hiện tại.

3. **Kết thúc ca & Bàn giao (Close Shift):**
   - Cuối ca, nhân viên đếm số tiền mặt thực tế đang có trong két và nhập vào hệ thống (Closing Cash).
   - Hệ thống tự động so khớp:
     $$\text{Expected Cash} = \text{Opening Cash} + \text{Total Cash Inflow} - \text{Total Cash Outflow}$$
     $$\text{Variance} = \text{Closing Cash} - \text{Expected Cash}$$
   - Nếu $\text{Variance} \neq 0$ (thừa hoặc thiếu tiền), hệ thống bắt buộc nhân viên nhập lý do giải trình.
   - Đóng ca và bàn giao sang ca tiếp theo.

4. **Khóa sổ cái hàng ngày (`DailyLedger`):**
   - Lúc 23:59:59 hàng ngày, hệ thống chạy cronjob tự động chốt doanh thu cả ngày của cơ sở: Tổng doanh thu tiền phòng, dịch vụ, nợ phát sinh, tiền cọc thu mới.
   - Sổ cái được khóa cứng để phục vụ công tác kế toán và kiểm toán độc lập.

---

### Luồng 10: Quy trình hủy phòng & Tính phạt hoàn tiền tự động

1. **Khách yêu cầu hủy:** Lễ tân bấm "Hủy đặt phòng" trên giao diện chi tiết booking.
2. **Kiểm tra chính sách hủy (`CancellationPolicy`):**
   - Hệ thống tính toán khoảng thời gian từ thời điểm hiện tại đến giờ nhận phòng quy định:
     $$\Delta T = \text{CheckInTime} - \text{CurrentTime}$$
   - Đối chiếu với các mốc quy định của khách sạn:
     - Hủy trước $\ge 7$ ngày: Hoàn tiền 100% tiền cọc (Phí phạt 0%).
     - Hủy trước từ $3$ đến $7$ ngày: Phạt 50% tiền cọc, hoàn lại 50%.
     - Hủy trước $< 3$ ngày hoặc Không đến (`NO_SHOW`): Phạt 100% tiền cọc (Không hoàn cọc).
3. **Thực thi hoàn tiền / Tịch thu:**
   - Cập nhật `BookingStatus = CANCELLED`.
   - Nhả phòng vật lý và mở lại tình trạng phòng trống trên lịch.
   - Cập nhật trạng thái phiếu cọc: `REFUNDED` (kèm số tiền hoàn) hoặc `FORFEITED` (Tịch thu).
   - Ghi nhận khoản phạt vào mục Thu nhập khác trên Sổ cái kế toán.

---

# 4. BỘ CÂU HỎI & TRẢ LỜI CHUYÊN SÂU THEO TÍNH NĂNG (Q&A)

Dưới đây là bộ câu hỏi và câu trả lời chuyên sâu thường gặp trong các buổi đánh giá kỹ thuật, phản biện tốt nghiệp hoặc phỏng vấn tuyển dụng về dự án:

---

### NHÓM 1: ĐẶT PHÒNG, CHỐNG TRÙNG PHÒNG & ĐỒNG BỘ OTA

#### **Câu hỏi 1.1:** Hệ thống giải quyết bài toán chống trùng phòng (Overbooking) như thế nào khi có 2 lễ tân cùng bấm xếp 1 phòng cho 2 khách khác nhau tại cùng 1 giây?
> **Trả lời:**
> Hệ thống giải quyết bằng 3 lớp bảo vệ (Defense in Depth):
> 1. **Kiểm tra giao thoa khoảng thời gian (Interval Overlap Logic):** Hai đơn vị lưu trú $[A_{\text{in}}, A_{\text{out}}]$ và $[B_{\text{in}}, B_{\text{out}}]$ bị coi là xung đột khi và chỉ khi:
>    $$(A_{\text{in}} < B_{\text{out}}) \land (A_{\text{out}} > B_{\text{in}})$$
> 2. **Cơ chế Khóa giao dịch (Transaction Isolation & Locking):** Phương thức xếp phòng được gắn annotation `@Transactional`. Khi thực hiện gán phòng, hệ thống sử dụng khóa bi quan (`PESSIMISTIC_WRITE`) hoặc kiểm tra lại điều kiện xung đột ngay trước khi lưu bản ghi:
>    ```java
>    boolean isConflicted = bookingRepository.existsConflictingBooking(
>        roomId, checkIn, checkOut, excludeBookingId
>    );
>    if (isConflicted) {
>        throw new RoomAlreadyBookedException("Phòng đã có khách đặt trong khoảng thời gian này!");
>    }
>    ```
> 3. **Ràng buộc cơ sở dữ liệu (Database Constraint):** Nếu cả hai luồng vượt qua tầng ứng dụng, ràng buộc duy nhất hoặc trigger nghiệp vụ sẽ khiến luồng đến sau bị dính lỗi `DataIntegrityViolationException`, giao dịch tự động Rollback an toàn và trả thông báo lỗi rõ ràng về cho người dùng thứ hai. Mọi xung đột đều được ghi vết vào bảng `ConcurrencyLog`.

#### **Câu hỏi 1.2:** Vì sao dự án lựa chọn giao thức iCal để đồng bộ với Airbnb, Booking.com thay vì sử dụng API Channel Manager trực tiếp?
> **Trả lời:**
> 1. **Chuẩn công nghiệp phổ quát (Industry Standard):** iCal (RFC 5545) là chuẩn mở được 100% các sàn OTA lớn trên toàn cầu (Airbnb, Booking.com, Agoda, Vrbo, Google Calendar) hỗ trợ miễn phí mà không yêu cầu khách sạn phải ký quỹ hay trả phí duy trì API hàng tháng đắt đỏ.
> 2. **Phù hợp với phân khúc vừa và nhỏ:** Các khách sạn dưới 50 phòng hoặc homestay không có ngân sách mua kết nối SiteMinder/Channex (thường tốn hàng ngàn USD/năm). Giải pháp iCal 2 chiều tự động đáp ứng trọn vẹn nhu cầu chống trùng phòng với chi phí bằng 0.
> 3. **Kiến trúc linh hoạt:** Hệ thống đã trừu tượng hóa tầng `ChannelSyncService`. Trong tương lai, nếu khách sạn mở rộng quy mô, chỉ cần viết thêm Adapter kết nối REST API của sàn mà không cần đập đi xây lại luồng xử lý phòng bên dưới.

---

### NHÓM 2: ĐỘNG CƠ TÍNH GIÁ ĐỘNG & TRÍ TUỆ NHÂN TẠO AI

#### **Câu hỏi 2.1:** Nếu một booking kéo dài 5 đêm, trong đó có 2 đêm ngày thường, 2 đêm cuối tuần và 1 đêm trùng vào ngày Lễ 30/4 thì hệ thống tính giá như thế nào?
> **Trả lời:**
> Thuật toán `PricingService.calculateBreakdown(...)` không nhân giá trung bình mà chia nhỏ khoảng thời gian thành một danh sách từng đêm lưu trú riêng lẻ:
> - **Đêm 1 & Đêm 2 (Ngày thường):** Áp dụng Base Price của hạng phòng.
> - **Đêm 3 & Đêm 4 (Thứ 6, Thứ 7):** Đối chiếu bảng `WeekendPriceConfig`, tự động áp dụng giá cuối tuần (hoặc cộng thêm phụ thu cuối tuần).
> - **Đêm 5 (Rơi vào 30/4):** Hệ thống tìm thấy bản ghi trong bảng `HolidayPrice`, mức giá ngày Lễ có độ ưu tiên cao nhất sẽ ghi đè lên giá cuối tuần và giá thường.
> - Sau đó, hệ thống cộng tổng tiền phòng 5 đêm và áp dụng phụ thu người vượt chuẩn (nếu số khách vượt quá sức chứa tiêu chuẩn của phòng). Bảng chiết tính chi tiết từng đêm được gửi về Frontend để lễ tân và khách hàng đối soát trực quan, minh bạch.

#### **Câu hỏi 2.2:** Trí tuệ nhân tạo (Google Gemini AI) được ứng dụng ở những điểm nào trong dự án, hay chỉ là gắn API cho có?
> **Trả lời:**
> AI được tích hợp sâu vào 2 bài toán kinh doanh cụ thể, có giá trị thực tiễn:
> 1. **Động cơ Gợi ý Giá Thông minh (`AiPriceController`):** Thay vì quản lý khách sạn phải tự phỏng đoán thị trường, module AI sẽ đọc dữ liệu lịch sử lấp đầy phòng (Occupancy Rate) trong 30 ngày qua, kết hợp với thông tin ngày lễ sắp tới và khoảng giá hiện tại của đối thủ để phân tích và đưa ra khuyến nghị: *Nên tăng giá 15% vào cuối tuần tới vì tỷ lệ lấp đầy đã đạt 85%, hoặc nên giảm giá 10% vào giữa tuần để kích cầu*.
> 2. **Trợ lý ảo hỗ trợ vận hành và khách hàng (`AiChatController`):** Nhúng prompt nghiệp vụ chuyên sâu về quy chế khách sạn Stay Away, có khả năng tra cứu thông tin chính sách cọc, giờ check-in/out, hướng dẫn lễ tân xử lý các tình huống khó và giải đáp cho khách hàng 24/7.

---

### NHÓM 3: ĐẶT PHÒNG ĐOÀN, THAO TÁC HÀNG LOẠT & ĐÀM PHÁN GIÁ B2B

#### **Câu hỏi 3.1:** Tính năng Đặt phòng đoàn (Group Booking) khác gì so với việc lễ tân tạo nhiều đơn đặt phòng lẻ riêng lẻ?
> **Trả lời:**
> Khác biệt căn bản ở 4 yếu tố:
> 1. **Quan hệ Cha - Con (Master - Sub Hierarchy):** Đoàn khách có 1 đơn cha đại diện (`GroupBooking`), liên kết với một Công ty lữ hành hoặc Trưởng đoàn. Nhiều phòng con (`Booking`) được gom chung vào nhóm này.
> 2. **Thao tác 1 chạm (Bulk Operations):** Khi xe 45 chỗ chở đoàn đến, lễ tân không thể bấm check-in từng phòng 20 lần. Nút `Bulk Check-in` cho phép xác thực và nhận phòng đồng loạt cho 20 phòng chỉ trong 2 giây. Tương tự với `Bulk Check-out`.
> 3. **Tài chính tập trung:** Toàn bộ tiền phòng có thể xuất chung vào 1 hóa đơn tổng (`Master Invoice`) xuất cho công ty du lịch thanh toán chuyển khoản, trong khi các chi phí minibar phát sinh tại từng phòng vẫn có thể thanh toán riêng tại quầy.
> 4. **Giá hợp đồng riêng (`NegotiatedPriceAgreement`):** Đơn đoàn tự động được hưởng mức giá B2B chiết khấu đặc biệt theo hợp đồng khung đã ký với doanh nghiệp.

---

### NHÓM 4: TÀI CHÍNH, TIỀN CỌC, VIETQR & CƠ CHẾ KIỂM SOÁT NỢ

#### **Câu hỏi 4.1:** Cơ chế VietQR động hoạt động như thế nào và tại sao lại an toàn hơn việc đưa số tài khoản tĩnh dán tại quầy?
> **Trả lời:**
> - **Nguyên lý:** Mã VietQR động được tạo theo chuẩn Napas247, trong chuỗi QR đã mã hóa sẵn: Mã ngân hàng (BIN), Số tài khoản khách sạn, Số tiền chính xác từng đồng và Cú pháp nội dung chuyển khoản (VD: `CK COC 108`).
> - **Lợi ích an toàn & tự động:**
>   - Khách hàng không thể gõ nhầm số tài khoản của người khác.
>   - Khách hàng không thể gõ thiếu số tiền (chuyển thiếu cọc).
>   - Cú pháp chuẩn hóa giúp hệ thống dễ dàng đối soát tự động thông qua webhook ngân hàng hoặc giúp lễ tân tìm kiếm đơn cọc trong 1 giây mà không sợ sai lệch dòng tiền.

#### **Câu hỏi 4.2:** Trong thực tế, có những vị khách VIP hoặc đối tác công ty làm thủ tục trả phòng nhưng chưa thanh toán tiền ngay (nợ tiền phòng để công ty thanh toán sau). Hệ thống giải quyết tình huống này ra sao khi có quy tắc "Chặn Check-out nếu chưa thanh toán"?
> **Trả lời:**
> Đây là bài toán kinh điển giữa **Kiểm soát nội bộ (Internal Control)** và **Độ linh hoạt kinh doanh (Business Flexibility)**.
> - **Cơ chế:** Hệ thống thiết kế tính năng **Phê duyệt Bảo lãnh Công nợ (`DebtApprovalController`)**.
> - **Quy trình:**
>   1. Lễ tân không có quyền tự ý cho khách nợ tiền phòng để check-out (ngăn chặn tình trạng nhân viên cấu kết với khách hoặc vô trách nhiệm).
>   2. Lễ tân phải gửi một yêu cầu bảo lãnh nợ trên hệ thống, nêu rõ lý do (Khách VIP ký hóa đơn công nợ, Công ty FPT thanh toán sau 15 ngày...).
>   3. Chỉ người có vai trò Giám đốc/Chủ cơ sở (`OWNER` hoặc `ADMIN`) mới có thẩm quyền bấm "Phê duyệt công nợ" (`APPROVED`).
>   4. Sau khi có phiếu duyệt điện tử này, cổng kiểm tra tại API Check-out mới mở khóa cho phép đổi trạng thái phòng sang `CHECKED_OUT`. Đồng thời, số tiền nợ này được tự động ghi nhận vào khoản Phải thu (`Accounts Receivable`) trên Sổ cái kế toán.

---

### NHÓM 5: CHECK-IN, BÓC TÁCH CCCD SỐ & TUÂN THỦ NGHỊ ĐỊNH 13

#### **Câu hỏi 5.1:** Dự án bóc tách mã QR trên thẻ CCCD gắn chip như thế nào? Có sử dụng dịch vụ OCR bên ngoài không?
> **Trả lời:**
> - **Không sử dụng OCR trả phí:** OCR qua các dịch vụ như FPT.AI hay Google Vision tốn chi phí trên từng lượt quét và dễ bị sai dấu tiếng Việt nếu ảnh mờ/lóa sáng.
> - **Giải pháp tối ưu:** Thẻ Căn cước công dân gắn chip của Bộ Công An Việt Nam có in sẵn một mã QR ở góc trên bên phải. Chuỗi ký tự trong mã QR này tuân thủ cấu trúc phân tách bằng dấu gạch đứng `|`:
>   `12_Số_CCCD | Số_CMND_Cũ | Họ_Tên | Ngày_Sinh | Giới_Tính | Địa_Chỉ_Thường_Trú | Ngày_Cấp`
> - Hệ thống sử dụng một bộ Parser Regex chuyên dụng tại Frontend/Backend để bóc tách ngay tức thì (dưới 10ms) với độ chính xác tuyệt đối 100%, không tốn một đồng chi phí API và hoạt động mượt mà ngay cả khi không có mạng Internet ra ngoài.

#### **Câu hỏi 5.2:** Hệ thống tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân như thế nào?
> **Trả lời:**
> Hệ thống tuân thủ thông qua 3 cơ chế:
> 1. **Data Masking (Che giấu dữ liệu):** Số CCCD khi trả về giao diện người dùng thông thường đều bị che: `001096***456`. Số điện thoại: `0912***678`.
> 2. **Phân quyền truy cập tối thiểu (Principle of Least Privilege):** Nhân viên lễ tân và buồng phòng chỉ nhìn thấy thông tin đã bị Masking. Chỉ Quản trị viên cấp cao (`ADMIN`/`OWNER`) mới có quyền bấm mở khóa xem số đầy đủ.
> 3. **Ghi vết kiểm toán bắt buộc (`PersonalDataAuditLog`):** Bất cứ khi nào có hành động bấm xem toàn văn số CCCD hoặc trích xuất danh sách khách hàng, hệ thống đều tự động lưu vết: Ai xem, xem hồ sơ của ai, vào thời gian nào, từ địa chỉ IP nào.

---

### NHÓM 6: BUỒNG PHÒNG 2 BƯỚC, KPI NĂNG SUẤT & SỰ CỐ PHÒNG

#### **Câu hỏi 6.1:** Vì sao quy trình buồng phòng lại bắt buộc phải qua 2 bước (Thực hiện dọn $\rightarrow$ Nghiệm thu)?
> **Trả lời:**
> - Trong tiêu chuẩn quản trị khách sạn quốc tế, nhân viên dọn phòng (Housekeeper) và người kiểm tra chất lượng (Inspector / Lễ tân) phải độc lập với nhau.
> - Nếu nhân viên dọn xong tự chuyển phòng thành `AVAILABLE`, rất dễ xảy ra tình trạng dọn ẩu, thiếu khăn tắm hoặc minibar chưa kiểm đếm, dẫn đến trải nghiệm tồi tệ khi khách mới nhận phòng.
> - Quy trình 2 bước:
>   - Nhân viên dọn xong chỉ được chuyển sang `INSPECTING` (Chờ nghiệm thu).
>   - Trưởng ca hoặc Lễ tân đi kiểm tra thực tế đạt chuẩn 5 sao mới bấm duyệt đưa phòng về `AVAILABLE` để đón khách tiếp theo.

#### **Câu hỏi 6.2:** Nếu một phòng đang ở bị hỏng điều hòa đột xuất thì quy trình xử lý trên hệ thống diễn ra như thế nào?
> **Trả lời:**
> 1. Lễ tân sử dụng tính năng **Đổi phòng (Change Room)** để chuyển ngay khách sang một phòng sạch khác tương đương. Toàn bộ tiền phòng và chi phí dịch vụ cũ được giữ nguyên, không làm gián đoạn kỳ lưu trú của khách.
> 2. Tại phòng bị hỏng, nhân viên tạo một bản ghi **Sự cố phòng (`RoomIncident`)**, chọn mức độ nghiêm trọng và mô tả (Hỏng block máy lạnh).
> 3. Hệ thống tự động chuyển trạng thái phòng vật lý sang **`OUT_OF_SERVICE` (Bảo trì)**.
> 4. Khi phòng ở trạng thái này, hệ thống sẽ tự động khóa phòng trên Sơ đồ phòng nội bộ và đồng thời phát tín hiệu gạch bỏ phòng trên lịch xuất iCal, ngăn chặn tuyệt đối việc lễ tân hay kênh OTA bán nhầm phòng đang hỏng cho khách.

---

### NHÓM 7: CA THU NGÂN, SỔ CÁI KẾ TOÁN & BÁO CÁO DOANH THU

#### **Câu hỏi 7.1:** Phân hệ Ca thu ngân (`CashierShift`) ngăn chặn tình trạng thất thoát tiền mặt giữa các ca làm việc như thế nào?
> **Trả lời:**
> - Nhân viên không thể bàn giao ca bằng miệng hoặc sổ tay.
> - Quy trình khép kín:
>   - Đầu ca: Khai báo số tiền mặt có sẵn trong két (`Opening Cash`).
>   - Trong ca: Mọi giao dịch tiền mặt đều được hệ thống gắn với `shift_id`.
>   - Cuối ca: Nhân viên phải nhập số tiền mặt thực đếm (`Closing Cash`).
>   - Hệ thống tự tính toán số tiền lý thuyết phải có:
>     $$\text{Expected} = \text{Opening} + \text{Inflow} - \text{Outflow}$$
>   - Nếu lệch tiền (`Variance != 0`), hệ thống bắt buộc nhập giải trình và gửi thông báo cảnh báo đến tài khoản của Quản lý cơ sở.

#### **Câu hỏi 7.2:** Ý nghĩa của 2 chỉ số ADR và RevPAR trong báo cáo của hệ thống là gì?
> **Trả lời:**
> - **ADR (Average Daily Rate - Giá bán phòng bình quân):**
>   $$\text{ADR} = \frac{\text{Tổng doanh thu tiền phòng trong ngày}}{\text{Tổng số phòng thực tế đã bán (Occupied)}}$$
>   $\rightarrow$ Cho biết khách sạn đang bán được phòng với giá đắt hay rẻ.
> - **RevPAR (Revenue Per Available Room - Doanh thu trên mỗi phòng sẵn có):**
>   $$\text{RevPAR} = \frac{\text{Tổng doanh thu tiền phòng trong ngày}}{\text{Tổng số phòng sẵn sàng đón khách của khách sạn}} = \text{ADR} \times \text{Occupancy Rate}$$
>   $\rightarrow$ Đây là thước đo sức khỏe tài chính toàn diện nhất của khách sạn, phản ánh sự kết hợp giữa giá bán và tỷ lệ lấp đầy phòng.

---

### NHÓM 8: KIẾN TRÚC KỸ THUẬT, HIỆU NĂNG, BẢO MẬT & PRODUCTION

#### **Câu hỏi 8.1:** Hệ thống xử lý vấn đề xác thực và phân quyền (Authentication & Authorization) như thế nào?
> **Trả lời:**
> - Sử dụng mô hình **Stateless JWT (JSON Web Token)** kết hợp với Spring Security 6.
> - Khi đăng nhập thành công, máy chủ cấp một JWT Token có thời hạn hợp lệ, mã hóa ID người dùng và danh sách Quyền/Vai trò (Roles/Authorities).
> - Mỗi request từ Frontend đều gửi kèm token trong header: `Authorization: Bearer <token>`.
> - Tầng Controller sử dụng các annotation kiểm tra quyền chặt chẽ như `@PreAuthorize("hasAnyRole('ADMIN', 'OWNER')")`.
> - Token được ký bằng thuật toán HMAC SHA-256 với secret key mạnh, ngăn chặn hoàn toàn việc giả mạo quyền hạn từ client.

#### **Câu hỏi 8.2:** Hệ thống đã được triển khai thực tế trên môi trường Production như thế nào?
> **Trả lời:**
> Dự án được đóng gói và vận hành hoàn chỉnh trên VPS Ubuntu thông qua Docker Compose:
> 1. **Nginx Reverse Proxy:** Đóng vai trò cổng vào duy nhất (Port 80/443), chịu trách nhiệm điều hướng request, nén Gzip, cấu hình bộ đệm và chứng chỉ SSL/TLS miễn phí từ Let's Encrypt (tự động gia hạn).
> 2. **Backend Container:** Đóng gói mã nguồn Spring Boot bằng Eclipse Temurin JDK 17, tối ưu hóa bộ nhớ JVM.
> 3. **Frontend Container:** Được build tĩnh bằng Vite và phục vụ siêu tốc qua Nginx.
> 4. **MySQL Container:** Chạy MySQL 8.0 với volume gắn ngoài host để bảo toàn dữ liệu vĩnh viễn, kết hợp tính năng sao lưu tự động định kỳ.
> 5. Toàn bộ hệ thống hiện đang chạy thực tế ổn định tại domain chính thức: `https://stayaway.io.vn`.

#### **Câu hỏi 8.3:** Tại sao hệ thống lại tự động xóa ảnh chụp CCCD sau khi hoàn tất khai báo lưu trú?
> **Trả lời:**
> Theo quy định tại **Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân**, các cơ sở lưu trú phải thực hiện nguyên tắc **Giảm thiểu lưu trữ dữ liệu (Data Minimization)** và **Giới hạn mục đích xử lý dữ liệu**:
> 1. Ảnh CCCD / Hộ chiếu chứa các thông tin sinh trắc học và giấy tờ tùy thân đặc biệt nhạy cảm. Hệ thống chỉ tạm thời lưu trữ ảnh để lễ tân đối soát thông tin và hoàn tất thủ tục khai báo tạm trú với cơ quan quản lý.
> 2. Ngay sau khi lễ tân bấm **"Đánh dấu"** hoàn tất khai báo, hệ thống lập tức tự động thanh lọc và xóa vĩnh viễn (Data Purging) toàn bộ ảnh CCCD/Hộ chiếu của khách trong phòng khỏi cơ sở dữ liệu.
> 3. Hành động xóa dữ liệu bảo mật được ghi vết chi tiết vào `AuditLog` để phục vụ công tác kiểm toán bảo mật.
> 4. Nhờ cơ chế này, khách sạn triệt tiêu 100% rủi ro bị lộ lọt ảnh CCCD của khách hàng kể cả khi xảy ra sự cố bảo mật ngoài ý muốn.

---

# 5. TỔNG KẾT GIÁ TRỊ DỰ ÁN & TIỀM NĂNG PHÁT TRIỂN

### 5.1. Bảng so sánh Stay Away PMS với Phần mềm Quản lý Truyền thống

| Tiêu chí so sánh | Phần mềm PMS truyền thống / Sổ tay | Stay Away PMS (Roomi) |
| :--- | :--- | :--- |
| **Xử lý trùng phòng (Overbooking)** | Dễ trùng do cập nhật thủ công giữa kênh quầy và sàn OTA. | **Chống trùng phòng tuyệt đối (Zero-Conflict)** nhờ thuật toán khóa bi quan và đồng bộ iCal 2 chiều. |
| **Thanh toán & Thu cọc** | Đưa số tài khoản tĩnh, dễ chuyển nhầm số tiền, hay quên thu cọc. | **VietQR động chuẩn Napas247**, sinh mã QR tự động chính xác từng đồng, cấn trừ cọc tự động tại check-out. |
| **Thủ tục Check-in** | Gõ tay giấy tờ tùy thân, mất 3-5 phút/khách, dễ sai chính tả. | **Quét QR thẻ CCCD gắn chip**, tự bóc tách thông tin trong 10ms, tự sinh hồ sơ khai báo tạm trú. |
| **Bảo mật dữ liệu cá nhân** | Để lộ số CMND/CCCD cho mọi nhân viên nhìn thấy; lưu trữ ảnh CCCD vĩnh viễn dễ bị đánh cắp. | **Tuân thủ Nghị định 13**, tự động che số giấy tờ (Data Masking), tự động xóa ảnh CCCD sau khai báo và ghi vết AuditLog. |
| **Quy trình Buồng phòng** | Báo dọn bằng miệng hoặc bộ đàm, không đo lường được KPI. | **Quy trình 2 bước chuẩn quốc tế**, bấm giờ đo lường năng suất dọn phòng theo thời gian thực. |
| **Kiểm soát thất thoát** | Nhân viên có thể trả phòng khi chưa thu đủ tiền. | **Kiểm soát cổng thanh toán nghiêm ngặt**, bắt buộc hóa đơn PAID hoặc có Phiếu bảo lãnh nợ được duyệt. |
| **Trí tuệ nhân tạo (AI)** | Không có. | **Tích hợp Google Gemini AI** để tối ưu hóa giá bán phòng và chatbot hỗ trợ vận hành 24/7. |

### 5.2. Định hướng mở rộng trong tương lai
1. **Tích hợp Khóa thông minh (Smart Door Locks):** Tự động sinh mã PIN mở cửa phòng hoặc thẻ từ điện tử gửi qua Zalo/SMS cho khách khi Check-in thành công.
2. **Kiosk Tự Phục Vụ (Self Check-in Kiosk):** Khách tự quét CCCD và nhận thẻ phòng tại sảnh mà không cần gặp lễ tân.
3. **Mở rộng Kết nối Direct Channel API:** Nâng cấp từ iCal lên kết nối 2 chiều trực tiếp qua Open API của Booking.com và Agoda để đồng bộ cả giá và tồn kho theo thời gian thực (Real-time Rates & Inventory).

---
*Tài liệu được biên soạn và bảo trì bởi Nhóm Phát triển Dự án Lưu Trú Số - Stay Away PMS.*
