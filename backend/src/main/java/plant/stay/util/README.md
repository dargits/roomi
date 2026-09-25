# 🛠️ Gói Tiện Ích Hệ Thống (`plant.stay.util`)

<p align="center">
  <img src="https://img.shields.io/badge/Security-AuthUtil_JWT-3B82F6?style=for-the-badge&logo=jsonwebtokens&logoColor=white" />
  <img src="https://img.shields.io/badge/Privacy-PersonalDataMasker-10B981?style=for-the-badge&logo=shield&logoColor=white" />
  <img src="https://img.shields.io/badge/Cryptography-HashUtil_BCrypt-F59E0B?style=for-the-badge&logo=1password&logoColor=white" />
</p>

> Thư mục `util/` cung cấp các lớp công cụ phụ trợ dùng chung trong toàn bộ hệ thống Backend: trích xuất quyền người dùng, che mờ dữ liệu nhạy cảm và băm mật khẩu an toàn.

---

## 📑 Mục Lục

1. [🔐 1. Xác Thực & Phân Quyền (`AuthUtil`)](#-1-xác-thực--phân-quyền-authutil)
2. [🛡️ 2. Che Mờ Dữ Liệu Cá Nhân (`PersonalDataMasker`)](#️-2-che-mờ-dữ-liệu-cá-nhân-personaldatamasker)
3. [🔑 3. Băm Dữ Liệu & Mã Hóa (`HashUtil`)](#-3-băm-dữ-liệu--mã-hóa-hashutil)

---

## 🔐 1. Xác Thực & Phân Quyền (`AuthUtil`)
* **[`AuthUtil.java`](./AuthUtil.java):** Trích xuất thông tin người dùng từ Header Authorization / JWT Token, kiểm tra quyền hạn (Role-based & Permission-based) và xác định phiên làm việc hiện tại của người dùng.

---

## 🛡️ 2. Che Mờ Dữ Liệu Cá Nhân (`PersonalDataMasker`)
* **[`PersonalDataMasker.java`](./PersonalDataMasker.java):** Thuật toán che mờ số CCCD (ví dụ: `07920******12`) và Số điện thoại (ví dụ: `090*****89`) phục vụ bảo vệ dữ liệu nhạy cảm theo tiêu chuẩn bảo mật.

---

## 🔑 3. Băm Dữ Liệu & Mã Hóa (`HashUtil`)
* **[`HashUtil.java`](./HashUtil.java):** Băm mật khẩu và mã hóa chuỗi an toàn với thuật toán SHA-256 / BCrypt.
