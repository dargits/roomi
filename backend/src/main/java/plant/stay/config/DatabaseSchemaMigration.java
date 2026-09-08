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

        // 2. Đảm bảo cột discount_approval_threshold trong hotel_settings sẵn sàng
        try {
            jdbcTemplate.execute("ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS discount_approval_threshold DECIMAL(12, 2)");
            log.info("Schema Migration: Successfully ensured 'hotel_settings.discount_approval_threshold' column exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: Could not add 'discount_approval_threshold' column (might already exist): {}", e.getMessage());
        }
    }
}
