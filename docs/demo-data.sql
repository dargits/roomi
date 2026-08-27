-- ==========================================================
-- ROOMI (LƯU TRÚ SỐ) - BỘ DỮ LIỆU TRÌNH DIỄN (DEMO DATA SEED)
-- ==========================================================

-- 1. Xóa dữ liệu cũ (nếu cần thiết)
-- SET FOREIGN_KEY_CHECKS = 0;

-- 2. Tài khoản Người dùng (Mật khẩu mặc định: '123456' hash BCrypt hoặc test plaintext tùy cấu hình)
-- Pass BCrypt cho '123456': $2a$10$w8T0M0u/Fv78fQx7W.4oQe3Qn2g9n37mJcK5GgQ1jJz9K9K9K9K9K (nếu có)
INSERT INTO users (id, account, name, email, phone, role, is_active, created_at, updated_at) VALUES
(1, 'owner', 'Nguyễn Văn Chủ', 'owner@roomi.vn', '0901234567', 'OWNER', 1, NOW(), NOW()),
(2, 'admin', 'Trần Quản Trị', 'admin@roomi.vn', '0902345678', 'ADMIN', 1, NOW(), NOW()),
(3, 'receptionist', 'Lê Thu Lễ Tân', 'letan@roomi.vn', '0903456789', 'RECEPTIONIST', 1, NOW(), NOW()),
(4, 'housekeeper', 'Phạm Thị Buồng Phòng', 'buongphong@roomi.vn', '0904567890', 'HOUSEKEEPER', 1, NOW(), NOW()),
(5, 'accountant', 'Hoàng Kế Toán', 'ketoan@roomi.vn', '0905678901', 'ACCOUNTANT', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 3. Cài đặt khách sạn (Hotel Settings)
INSERT INTO hotel_settings (id, hotel_name, address, hotline, email, bank_name, bank_account_no, bank_account_name, check_in_time, check_out_time, created_at, updated_at) VALUES
(1, 'Khách sạn Roomi Luxury Riverside', 'Số 123 Đường Bạch Đằng, Quận Hải Châu, TP Đà Nẵng', '1900 8888', 'contact@roomiluxury.vn', 'MBBANK', '090123456789', 'NGUYEN VAN CHU', '14:00:00', '12:00:00', NOW(), NOW())
ON DUPLICATE KEY UPDATE hotel_name=VALUES(hotel_name);

-- 4. Loại phòng (Room Types)
INSERT INTO room_types (id, name, base_price, max_capacity, description, active, created_at, updated_at) VALUES
(1, 'Phòng Standard Đơn', 450000.00, 1, 'Phòng đơn tiêu chuẩn đầy đủ tiện nghi, view sân vườn', 1, NOW(), NOW()),
(2, 'Phòng Superior Đôi', 650000.00, 2, 'Phòng đôi rộng rãi, giường Queen size, ban công thoáng mát', 1, NOW(), NOW()),
(3, 'Phòng Deluxe Hướng Sông', 950000.00, 2, 'Phòng cao cấp view sông Hàn, bồn tắm nằm massage', 1, NOW(), NOW()),
(4, 'Phòng Family Suite', 1500000.00, 4, 'Căn hộ gia đình 2 phòng ngủ riêng biệt, phòng khách sang trọng', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 5. Danh sách Phòng (Rooms)
INSERT INTO rooms (id, room_number, room_type_id, floor, status, notes, assigned_housekeeper_id, assigned_at, created_at, updated_at) VALUES
(1, '101', 1, '1', 'AVAILABLE', 'Phòng sạch sẽ, hướng đông', NULL, NULL, NOW(), NOW()),
(2, '102', 1, '1', 'OCCUPIED', 'Khách VIP đang ở', NULL, NULL, NOW(), NOW()),
(3, '103', 2, '1', 'DIRTY', 'Khách vừa checkout lúc 10h, cần thay drap giường', 4, NOW(), NOW()),
(4, '104', 2, '1', 'INSPECTING', 'Đã dọn xong, chờ quản lý kiểm tra vệ sinh', 4, NOW(), NOW()),
(5, '201', 2, '2', 'AVAILABLE', 'Sẵn sàng phục vụ', NULL, NULL, NOW(), NOW()),
(6, '202', 3, '2', 'OCCUPIED', 'Gia đình lưu trú dài ngày', NULL, NULL, NOW(), NOW()),
(7, '203', 3, '2', 'DIRTY', 'Cần vệ sinh kỹ ban công', NULL, NULL, NOW(), NOW()),
(8, '204', 3, '2', 'AVAILABLE', 'Phòng trống sạch đẹp', NULL, NULL, NOW(), NOW()),
(9, '301', 4, '3', 'AVAILABLE', 'Phòng Suite gia đình view đẹp nhất tầng 3', NULL, NULL, NOW(), NOW()),
(10, '302', 4, '3', 'MAINTENANCE', 'Bảo trì máy điều hòa', NULL, NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 6. Khách hàng (Guests)
INSERT INTO guests (id, name, phone, email, id_number, address, total_spent, loyalty_points, created_at, updated_at) VALUES
(1, 'Nguyễn Anh Tuấn', '0911223344', 'anhtuan@gmail.com', '001095012345', 'Hà Nội', 2850000.00, 285, NOW(), NOW()),
(2, 'Trần Minh Tâm', '0922334455', 'minhtam@gmail.com', '048098023456', 'TP Hồ Chí Minh', 1950000.00, 195, NOW(), NOW()),
(3, 'Phan Thị Mai Lan', '0933445566', 'mailan@gmail.com', '036192034567', 'Đà Nẵng', 4500000.00, 450, NOW(), NOW()),
(4, 'Lê Quốc Bảo', '0944556677', 'quocbao@gmail.com', '079090045678', 'Cần Thơ', 1200000.00, 120, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 7. Dịch vụ phụ thu (Extra Services)
INSERT INTO extra_services (id, name, price, unit, description, active, created_at, updated_at) VALUES
(1, 'Nước suối khoáng', 15000.00, 'Chai', 'Nước suối Aquafina 500ml', 1, NOW(), NOW()),
(2, 'Nước ngọt lon', 20000.00, 'Lon', 'Coca Cola / Pepsi', 1, NOW(), NOW()),
(3, 'Bia Tiger', 30000.00, 'Lon', 'Bia Tiger Crystal 330ml', 1, NOW(), NOW()),
(4, 'Mì ly ăn liền', 25000.00, 'Ly', 'Mì Modern / Hảo Hảo', 1, NOW(), NOW()),
(5, 'Giặt ủi quần áo', 50000.00, 'Kg', 'Giặt ủi sấy thơm lấy nhanh trong ngày', 1, NOW(), NOW()),
(6, 'Thuê xe máy tay ga', 150000.00, 'Ngày', 'Honda AirBlade 125cc kèm 2 nón bảo hiểm', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 8. Đặt phòng mẫu (Bookings)
INSERT INTO bookings (id, guest_id, room_type_id, room_id, check_in_date, check_out_date, status, expected_price, actual_price, source, note, created_at, updated_at) VALUES
-- Booking đang ở (102)
(1, 1, 1, 2, CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 2 DAY, 'CHECKED_IN', 1350000.00, 1350000.00, 'DIRECT', 'Khách nhận phòng sớm 30 phút', NOW(), NOW()),
-- Booking đang ở (202)
(2, 2, 3, 6, CURDATE() - INTERVAL 2 DAY, CURDATE() + INTERVAL 1 DAY, 'CHECKED_IN', 2850000.00, 2850000.00, 'DIRECT', 'Yêu cầu thêm gối phụ', NOW(), NOW()),
-- Booking đã checkout trong tháng
(3, 3, 3, 8, CURDATE() - INTERVAL 5 DAY, CURDATE() - INTERVAL 2 DAY, 'CHECKED_OUT', 2850000.00, 2850000.00, 'ONLINE_REQUEST', 'Đã thanh toán đủ chuyển khoản', NOW(), NOW()),
-- Booking mới tạo cần xác nhận
(4, 4, 2, NULL, CURDATE() + INTERVAL 3 DAY, CURDATE() + INTERVAL 6 DAY, 'NEW', 1950000.00, 1950000.00, 'WEB', 'Đặt qua website lưu trú', NOW(), NOW()),
-- Booking đã hủy phạt cọc
(5, 1, 2, NULL, CURDATE() - INTERVAL 10 DAY, CURDATE() - INTERVAL 7 DAY, 'CANCELLED', 1950000.00, 0.00, 'DIRECT', 'Khách hủy sát giờ, giữ cọc làm phí hủy', NOW(), NOW())
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 9. Đặt cọc (Deposits)
INSERT INTO deposits (id, booking_id, required_amount, collected_amount, refunded_amount, penalty_amount, status, payment_method, note, collected_by, processed_by, collected_at, processed_at, created_at) VALUES
-- Cọc chưa quyết toán cho booking 1
(1, 1, 500000.00, 500000.00, 0.00, 0.00, 'COLLECTED', 'BANK_TRANSFER', 'Cọc qua VietQR chuyển khoản', 3, NULL, NOW(), NULL, NOW()),
-- Cọc chưa quyết toán cho booking 4
(2, 4, 600000.00, 600000.00, 0.00, 0.00, 'COLLECTED', 'BANK_TRANSFER', 'Cọc giữ phòng', 3, NULL, NOW(), NULL, NOW()),
-- Cọc phạt bị tịch thu (cho vào báo cáo doanh thu)
(3, 5, 500000.00, 500000.00, 0.00, 500000.00, 'FORFEITED', 'BANK_TRANSFER', 'Tịch thu cọc do hủy phòng muộn', 3, 1, NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 9 DAY, NOW() - INTERVAL 10 DAY)
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 10. Hóa đơn (Invoices)
INSERT INTO invoices (id, booking_id, invoice_number, room_amount, service_amount, discount_amount, total_amount, status, payment_method, created_at, updated_at) VALUES
-- Hóa đơn PENDING cho booking 1
(1, 1, 'HD-2026-0001', 1350000.00, 45000.00, 0.00, 1395000.00, 'PENDING', 'BANK_TRANSFER', NOW(), NOW()),
-- Hóa đơn PAID cho booking 3
(2, 3, 'HD-2026-0002', 2850000.00, 150000.00, 100000.00, 2900000.00, 'PAID', 'BANK_TRANSFER', NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY)
ON DUPLICATE KEY UPDATE status=VALUES(status);
