# CLAUDE.md — Quy tắc bắt buộc cho dự án StayGO

> File này được Claude Code tự động đọc khi làm việc trong repo.
> Mọi trang, component, hoặc đoạn code mới PHẢI tuân theo các quy tắc dưới đây.
> Nguồn dữ liệu: trích xuất trực tiếp từ `design/staygo_visual_system/DESIGN.md`
> và 2 file HTML thiết kế gốc (`staygo_ng_nh_p_nh_n_vi_n`, `staygo_trang_ch...`)
> do Stitch xuất ra. KHÔNG được tự ý đổi giá trị trong file này.

---

## 0. Bối cảnh dự án

- Tên hệ thống: **StayGO** — website quản lý & đặt phòng cho **MỘT cơ sở khách sạn/homestay duy nhất**
  (không phải sàn đa khách sạn kiểu Agoda). Xem chi tiết nghiệp vụ, vai trò, business rules
  trong file `Lưu_Trú_Số.xlsx` ở gốc repo — LUÔN tham chiếu file này khi code logic nghiệp vụ,
  KHÔNG tự suy diễn quy tắc nghiệp vụ.
- 5 vai trò cố định: `VT-01` Chủ cơ sở, `VT-02` Lễ tân, `VT-03` Nhân viên buồng phòng,
  `VT-04` Kế toán, `VT-05` Quản trị viên. Quyền hạn từng vai trò xem sheet "User Roles".
- Toàn bộ giao diện, nhãn, placeholder, thông báo: **tiếng Việt 100%** (trừ tên thương hiệu "StayGO").
- Stack: **React + Vite + Tailwind CSS**. Font hiển thị: **Arimo** (thay thế Arial, giữ cảm giác
  Arial nhưng render đẹp hơn trên web — ĐÃ được quyết định trong DESIGN.md gốc, không đổi sang font khác).

---

## 1. KHÔNG được tự tạo màu, font, spacing, bo góc mới

Toàn bộ token dưới đây copy nguyên văn từ `tailwind.config.js` trong code Stitch gốc.
Dán thẳng vào `tailwind.config.js` của dự án, dùng bằng class name (`bg-primary`, `text-on-surface`...),
KHÔNG viết mã hex trực tiếp trong JSX/CSS.

### 1.1 Bảng màu (dùng đúng tên biến, không thêm/bớt)

```js
colors: {
  "primary": "#005ea4",
  "on-primary": "#ffffff",
  "primary-container": "#0077ce",
  "on-primary-container": "#fdfcff",
  "primary-fixed": "#d3e4ff",
  "primary-fixed-dim": "#a2c9ff",
  "on-primary-fixed": "#001c38",
  "on-primary-fixed-variant": "#004881",
  "inverse-primary": "#a2c9ff",
  "surface-tint": "#0060a8",

  "secondary": "#5d5f5f",
  "on-secondary": "#ffffff",
  "secondary-container": "#dcdddd",
  "on-secondary-container": "#5f6161",
  "secondary-fixed": "#e2e2e2",
  "secondary-fixed-dim": "#c6c6c7",
  "on-secondary-fixed": "#1a1c1c",
  "on-secondary-fixed-variant": "#454747",

  "tertiary": "#8f4a00",
  "on-tertiary": "#ffffff",
  "tertiary-container": "#b35e00",
  "on-tertiary-container": "#fffbff",
  "tertiary-fixed": "#ffdcc4",
  "tertiary-fixed-dim": "#ffb780",
  "on-tertiary-fixed": "#2f1400",
  "on-tertiary-fixed-variant": "#6f3800",

  "error": "#ba1a1a",
  "on-error": "#ffffff",
  "error-container": "#ffdad6",
  "on-error-container": "#93000a",

  "surface": "#fbf9f8",
  "on-surface": "#1b1c1c",
  "surface-dim": "#dcd9d9",
  "surface-bright": "#fbf9f8",
  "surface-variant": "#e4e2e1",
  "on-surface-variant": "#404752",
  "surface-container-lowest": "#ffffff",
  "surface-container-low": "#f6f3f2",
  "surface-container": "#f0eded",
  "surface-container-high": "#eae8e7",
  "surface-container-highest": "#e4e2e1",
  "inverse-surface": "#303030",
  "inverse-on-surface": "#f3f0f0",

  "background": "#fbf9f8",
  "on-background": "#1b1c1c",
  "outline": "#707783",
  "outline-variant": "#c0c7d4",

  // Màu tiện ích riêng của StayGO — dùng đúng ngữ cảnh nêu bên dưới
  "rating-gold": "#FFB800",      // icon sao đánh giá
  "alert-red": "#E53935",        // nhãn ưu đãi / khẩn cấp / lỗi
  "border-grey": "#E0E0E0",      // viền input, card, section
  "surface-blue-light": "#E1EDFF", // nền tint khi filter/tag đang active
  "agoda-blue": "#5392F9"        // màu nút hành động chính (login, CTA) — xem mục 1.4
}
```

**Quy tắc dùng màu:**
- Nút hành động chính (Đăng nhập, Tìm phòng, Đặt phòng ngay...): `bg-agoda-blue` → hover `bg-primary-container`.
- Text/link tương tác được: `text-primary`.
- Nền trang chính: `bg-surface`. Card/form: `bg-surface-container-lowest` (trắng tinh).
- Khối phụ (vùng "đăng nhập nhanh", sidebar filter...): `bg-surface-container-low`.
- Viền mọi input/card/section: `border border-border-grey` — KHÔNG dùng shadow để phân tách, dùng viền.
- Rating sao: `text-rating-gold`. Nhãn giảm giá/khẩn cấp: nền nhạt `#FEE2E2` + chữ `text-alert-red`.

### 1.2 Typography (font Arimo, KHÔNG đổi font khác)

```js
fontFamily: {
  "display-lg": ["Arimo"], "headline-lg": ["Arimo"], "headline-md": ["Arimo"],
  "title-lg": ["Arimo"], "body-lg": ["Arimo"], "body-md": ["Arimo"], "label-md": ["Arimo"]
},
fontSize: {
  "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
  "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "700" }],
  "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "700" }],
  "headline-md": ["24px", { lineHeight: "32px", fontWeight: "700" }],
  "title-lg": ["20px", { lineHeight: "28px", fontWeight: "600" }],
  "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
  "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
  "label-md": ["12px", { lineHeight: "16px", fontWeight: "600" }]
}
```

**Quy tắc dùng chữ:**
- Tiêu đề hero/trang chủ: `display-lg` (desktop) — dùng `headline-lg-mobile` khi responsive mobile.
- Tiêu đề section/trang con (VD "Đăng nhập hệ thống..."): `headline-md`.
- Tiêu đề khối nhỏ (card title, tên nút lớn): `title-lg`.
- Nội dung chính: `body-lg`. Thông tin phụ/sidebar: `body-md`.
- Label phía trên input, badge trạng thái, tag: `label-md`.
- Import font: `@import url('https://fonts.googleapis.com/css2?family=Arimo:wght@400;600;700&display=swap');`
  và icon dùng **Material Symbols Outlined** (đã dùng trong code gốc, giữ nguyên bộ icon này).

### 1.3 Bo góc — CHỈ dùng các giá trị này, không tự chọn số khác

```js
borderRadius: {
  DEFAULT: "0.125rem",  // 2px — dùng cho input, button, card (mặc định toàn hệ thống)
  lg: "0.25rem",        // 4px — dùng khi cần nhỉnh hơn 1 chút (modal, container lớn)
  xl: "0.5rem",
  full: "0.75rem"       // dùng cho avatar tròn/icon badge tròn — KHÔNG dùng cho button/input
}
```
Nguyên tắc: hệ thống theo phong cách "vuông vức, bo góc rất nhẹ". Mặc định luôn dùng `rounded-DEFAULT` (2px)
cho input/button/card. KHÔNG bao giờ dùng `rounded-full` cho button hay input.

### 1.4 Spacing

```js
spacing: {
  base: "8px",              // đơn vị nhịp cơ bản — mọi padding/margin là bội số của 8px
  gutter: "16px",
  "margin-mobile": "16px",
  "margin-desktop": "24px",
  "container-max-width": "1200px"
}
```
Container chính luôn giới hạn `max-w-[1200px]`, căn giữa (`mx-auto`), padding ngang
`px-[16px]` trên mobile / `px-[24px]` trên desktop.

---

## 2. Component chuẩn — PHẢI tái sử dụng, KHÔNG viết lại style riêng

Trích nguyên tắc từ `DESIGN.md` gốc — mọi component mới phải khớp mô tả này:

| Component | Quy tắc bắt buộc |
|---|---|
| **Button chính** | Nền `agoda-blue`, chữ trắng `title-lg`, `rounded-DEFAULT`, hover đổi `primary-container` + shadow nhẹ (4px blur, 10% opacity) |
| **Button phụ (outline)** | Viền `agoda-blue`, nền trong suốt, chữ `agoda-blue`, hover nền `surface-blue-light` |
| **Input** | Viền `border-grey` 1px, `rounded-DEFAULT`, label `label-md` LUÔN hiển thị phía trên (không dùng placeholder-as-label), khi focus viền chuyển `primary` + ring 1px |
| **Card (phòng/thông tin)** | Nền trắng `surface-container-lowest`, viền `border-grey` 1px, **KHÔNG dùng shadow**, phân cách nội dung bằng đường kẻ mỏng ngang |
| **Badge/Tag/Chip** | Deal/ưu đãi: nền đỏ nhạt `#FEE2E2` + chữ `alert-red`. Rating số: nền xanh nhỏ bo góc `rounded-sm` + chữ trắng |
| **Sidebar filter checkbox** | Vuông, bo `2px`, khi active dùng nền tint `surface-blue-light` |
| **Dropdown (select)** | Giống input, icon `expand_more` bên phải, options liệt kê rõ ràng |

Mọi component này đặt trong `src/components/ui/`, viết 1 lần, gọi lại ở mọi nơi.
Nghiêm cấm copy-paste class Tailwind lặp lại giữa các trang — nếu thấy lặp ≥ 2 lần, tách thành component.

---

## 3. Layout chuẩn

- **Trang công khai (landing)**: header cố định trên cùng, nội dung giới hạn `max-w-[1200px]`,
  sidebar filter chiếm khoảng 3/12 cột (25–30% width) ở desktop.
- **Trang đăng nhập**: bố cục **50/50 split-screen** — bên trái ảnh khách sạn phủ gradient tối
  + tiêu đề `display-lg` màu trắng, bên phải nền trắng chứa form căn giữa dọc/ngang.
  Đây là layout đã duyệt, giữ nguyên cấu trúc HTML trong
  `design/staygo_ng_nh_p_nh_n_vi_n/code.html` làm chuẩn tham chiếu.
- **Trang dashboard nhân viên (sau đăng nhập)**: sidebar cố định bên trái + nội dung chính bên phải,
  dùng cùng token màu/spacing như trên, KHÔNG tạo bảng màu riêng cho khu vực quản trị.

---

## 4. Quy trình bắt buộc khi tạo trang/component mới

1. Đọc lại mục 1–3 ở trên trước khi viết bất kỳ class Tailwind nào.
2. Kiểm tra `src/components/ui/` xem đã có component phù hợp chưa — nếu có, dùng lại, không viết mới.
3. Nếu cần dữ liệu/nghiệp vụ, tra cứu `Lưu_Trú_Số.xlsx` (sheet Business Rules, User Roles,
   Acceptance Criteria) — không tự bịa logic nghiệp vụ.
4. Sau khi code xong, tự so sánh với 2 file `screen.png` gốc (landing + login) xem có lệch
   màu/spacing/bo góc không, tự sửa nếu lệch.
5. KHÔNG thêm nút "Đăng ký", KHÔNG thêm link "Quên mật khẩu?", KHÔNG thêm avatar/hamburger
   menu ở header — đây là quyết định thiết kế đã chốt, không tự ý thêm lại.
6. Toàn bộ text hiển thị: tiếng Việt. Không lẫn tiếng Anh trừ "StayGO".

---

## 5. File tham chiếu gốc trong repo (không sửa, chỉ đọc)

```
design/
├── staygo_logo_transparent/screen.png              # Logo chuẩn, nền trong suốt
├── staygo_ng_nh_p_nh_n_vi_n/
│   ├── code.html                                     # Code gốc trang Login (tham chiếu cấu trúc)
│   └── screen.png                                     # Ảnh chuẩn trang Login
├── staygo_trang_ch_kh_ch_s_n_c_p_nh_t_danh_s_ch_ph_ng/
│   ├── code.html                                     # Code gốc trang Landing
│   └── screen.png                                     # Ảnh chuẩn trang Landing
└── staygo_visual_system/DESIGN.md                    # Design system đầy đủ (nguồn của file này)
Lưu_Trú_Số.xlsx                                        # Nghiệp vụ, vai trò, business rules, backlog
```

Mọi trang mới PHẢI được đánh giá bằng cách đối chiếu với 2 file `screen.png` và `code.html` này
trước khi coi là hoàn thành.