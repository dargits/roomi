package plant.stay.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Tự động đồng bộ & nâng cấp cấu trúc Database (Auto Schema Migration) khi ứng dụng khởi động.
 * Đảm bảo ứng dụng chạy mượt mà trên mọi Database (mới tinh, DB cũ, môi trường Dev, Staging, Production)
 * mà không bao giờ cần phải chạy lệnh SQL bằng tay.
 */
@Component
@Order(0) // Chạy đầu tiên trước DataSeeder
@RequiredArgsConstructor
@Slf4j
public class DatabaseSchemaMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        log.info("Checking and applying automatic database schema migrations...");

        // 1. Nâng cấp cột status trong bảng invoices lên VARCHAR(50) để hỗ trợ các status mới
        // (PENDING_PAYMENT, PENDING_DISCOUNT_APPROVAL, DRAFT, ...)
        try {
            jdbcTemplate.execute("ALTER TABLE invoices MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING'");
            log.info("Schema Migration: Successfully ensured 'invoices.status' is VARCHAR(50).");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: Could not alter 'invoices.status' (might already be up-to-date or table not created yet): {}", e.getMessage());
        }

        // 2. Đảm bảo cột discount_approval_threshold & temporary_hold_minutes trong hotel_settings sẵn sàng
        try {
            jdbcTemplate.execute("ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS discount_approval_threshold DECIMAL(12, 2)");
            jdbcTemplate.execute("ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS temporary_hold_minutes INT DEFAULT 60");
            log.info("Schema Migration: Successfully ensured 'hotel_settings.temporary_hold_minutes' column exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: Could not add columns to hotel_settings: {}", e.getMessage());
        }

        // 3. Đảm bảo cột hold_expires_at trong bookings sẵn sàng
        try {
            jdbcTemplate.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hold_expires_at DATETIME");
            log.info("Schema Migration: Successfully ensured 'bookings.hold_expires_at' column exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: Could not add 'hold_expires_at' to bookings: {}", e.getMessage());
        }

        // 4. Đảm bảo cột reminder_sent_at trong bookings sẵn sàng cho tính năng nhắc nhận phòng
        try {
            jdbcTemplate.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at DATETIME");
            log.info("Schema Migration: Successfully ensured 'bookings.reminder_sent_at' column exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: Could not add 'reminder_sent_at' column (might already exist): {}", e.getMessage());
        }

        // 5. Đảm bảo các cột cấu hình nhắc nhở qua email trong hotel_settings sẵn sàng
        try {
            jdbcTemplate.execute("ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS reminder_email_enabled BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS reminder_morning_time TIME DEFAULT '10:30:00'");
            jdbcTemplate.execute("ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS reminder_evening_time TIME DEFAULT '19:00:00'");
            log.info("Schema Migration: Successfully ensured email reminder configuration columns in 'hotel_settings'.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: Could not add email reminder columns to 'hotel_settings': {}", e.getMessage());
        }
    }
}