# ☕ StayAway PMS — Backend Service (Spring Boot 3)

Phần mềm máy chủ (Backend) của hệ thống quản lý cơ sở lưu trú **StayAway**, được xây dựng trên nền tảng **Spring Boot 3**, **Java 17**, **Spring Data JPA**, **MySQL 8** và **Maven**.

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

### 2. Cài đặt biến môi trường hoặc chỉnh sửa `application.properties`
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

## 🧪 Chạy Kiểm Thử (Unit & Integration Tests)
```bash
./mvnw test
```
Toàn bộ 60+ test cases sẽ chạy tự động trên CSDL bộ nhớ trong **H2 In-Memory Database**, độc lập hoàn toàn với CSDL thật.
