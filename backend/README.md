# ☕ StayAway PMS — Backend Service (Spring Boot 3)

<p align="center">
  <img src="https://img.shields.io/badge/Spring_Boot-3.x-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white" />
  <img src="https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" />
  <img src="https://img.shields.io/badge/Spring_Data_JPA-Hibernate-59666C?style=for-the-badge&logo=hibernate&logoColor=white" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" />
  <img src="https://img.shields.io/badge/Testing-JUnit_5-25A162?style=for-the-badge&logo=junit5&logoColor=white" />
</p>

> **Backend Core** của StayAway PMS được xây dựng trên nền tảng **Spring Boot 3**, **Java 17**, áp dụng kiến trúc phân tầng chuẩn (**Layered Architecture**), phân tách rạch ròi giữa Controller, DTO, Service, Model và Repository, đảm bảo tính mở rộng cao và giao dịch an toàn.

---

## 📑 Mục Lục

1. [🏗️ Cấu Trúc Thư Mục Backend](#️-cấu-trúc-thư-mục-backend)
2. [🔄 Luồng Xử Lý Request Chuẩn Hóa (Backend Request Flow)](#-luồng-xử-lý-request-chuẩn-hóa-backend-request-flow)
3. [⚙️ Yêu Cầu Môi Trường & Công Nghệ](#️-yêu-cầu-môi-trường--công-nghệ)
4. [🚀 Hướng Dẫn Khởi Chạy Local](#-hướng-dẫn-khởi-chạy-local)
5. [🧪 Kiểm Thử Tự Động (JUnit 5 + Mockito + H2)](#-kiểm-thử-tự-động-junit-5--mockito--h2)

---

## 🏗️ Cấu Trúc Thư Mục Backend

```
backend/
├── src/
│   ├── main/
│   │   ├── java/plant/stay/       # Toàn bộ mã nguồn Java
│   │   │   ├── config/            # Cấu hình hệ thống, Schedulers, CORS, Data Masking
│   │   │   ├── controller/        # 27 REST Controllers tiếp nhận request API
│   │   │   ├── dto/               # Data Transfer Objects (Request & Response)
│   │   │   ├── event/             # Xử lý sự kiện bất đồng bộ
│   │   │   ├── exception/         # Xử lý ngoại lệ toàn cục (@RestControllerAdvice)
│   │   │   ├── model/             # 39 JPA Entities & Enums định nghĩa CSDL
│   │   │   ├── repository/        # Spring Data JPA Repositories truy xuất MySQL
│   │   │   ├── service/           # Tầng nghiệp vụ & logic xử lý chính
│   │   │   └── util/              # Tiện ích mã hóa, phân quyền, chuỗi
│   │   └── resources/
│   │       ├── application.properties # Cấu hình môi trường (DB, Port, Mail, Cloudinary)
│   │       ├── templates/         # Mẫu Email HTML xác nhận đặt phòng
│   │       └── schema.sql         # Script cấu trúc CSDL khởi tạo
│   └── test/                      # 60+ bài kiểm thử tự động (JUnit 5 + Mockito + H2)
├── pom.xml                        # Quản lý thư viện và plugin Maven
└── Dockerfile                     # Multi-stage Dockerfile tối ưu (Builder + Alpine JRE 17)
```

---

## 🔄 Luồng Xử Lý Request Chuẩn Hóa (Backend Request Flow)

Mọi module trong hệ thống đều tuân thủ luồng 6 bước nghiêm ngặt:

```
[ Client Request ] 
       │
       ▼
1. WebFilter & CORS ─────────► [WebCorsConfig / WebConfig] ──► Kiểm tra JWT (AuthUtil)
       │
       ▼
2. Controller Layer ─────────► Bóc tách tham số, Validate DTO (@Valid, @NotNull)
       │
       ▼
3. Service Layer ────────────► Kiểm tra Invariants, Logic tính giá, Quản lý @Transactional
       │
       ▼
4. Repository Layer (JPA) ───► Truy vấn JPQL / Derived Queries, Hibernate Persistence
       │
       ▼
5. Data Masking Advice ──────► Che mờ CCCD / SĐT nhạy cảm (PersonalDataMaskingResponseAdvice)
       │
       ▼
6. Response / GlobalException ► Trả về ResponseEntity<DTO> hoặc bắt lỗi tập trung (@RestControllerAdvice)
```

---

## ⚙️ Yêu Cầu Môi Trường & Công Nghệ
* **JDK:** Eclipse Temurin hoặc OpenJDK 17 trở lên
* **Build Tool:** Apache Maven 3.9+ (hoặc sử dụng wrapper `./mvnw`)
* **Cơ sở dữ liệu:** MySQL 8.0+
* **Dịch vụ bổ trợ:** Cloudinary (CDN lưu trữ ảnh), SMTP Email Server (Gmail)

---

## 🚀 Hướng Dẫn Khởi Chạy Local

### 1. Cấu hình CSDL MySQL
Tạo cơ sở dữ liệu `stay`:
```sql
CREATE DATABASE stay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Cài đặt cấu hình kết nối trong `application.properties`
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/stay?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=your_password
```

### 3. Chạy ứng dụng bằng Maven Wrapper
* **Trên Linux / macOS:**
  ```bash
  ./mvnw spring-boot:run
  ```
* **Trên Windows:**
  ```powershell
  .\mvnw.cmd spring-boot:run
  ```

API sẽ khởi chạy tại: `http://localhost:8080/api/v1`

---

## 🧪 Kiểm Thử Tự Động (JUnit 5 + Mockito + H2)
```bash
./mvnw test
```
Toàn bộ 60+ test cases sẽ chạy tự động trên CSDL bộ nhớ trong **H2 In-Memory Database**, độc lập hoàn toàn với CSDL thật.
