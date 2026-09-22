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

        // 1. Nâng cấp cột status trong bảng invoices lên VARCHAR(50) và thêm các cột hủy hóa đơn
        // (PENDING_PAYMENT, PENDING_DISCOUNT_APPROVAL, DRAFT, CANCELLED, ...)
        try {
            jdbcTemplate.execute("ALTER TABLE invoices MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING'");
            jdbcTemplate.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancel_reason TEXT");
            jdbcTemplate.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_by BIGINT");
            jdbcTemplate.execute("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_at DATETIME");
            log.info("Schema Migration: Successfully ensured 'invoices.status' and cancellation columns exist.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: Could not alter 'invoices': {}", e.getMessage());
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

        // 6. Đảm bảo cột reset_token trong password_reset_requests sẵn sàng cho cơ chế link 10 phút
        try {
            jdbcTemplate.execute("ALTER TABLE password_reset_requests ADD COLUMN IF NOT EXISTS reset_token VARCHAR(128)");
            log.info("Schema Migration: Successfully ensured 'password_reset_requests.reset_token' column exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: Could not add 'reset_token' to password_reset_requests: {}", e.getMessage());
        }

        // 7. Tạo bảng notifications (Notification Center)
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS notifications (" +
                "  id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                "  user_id BIGINT NOT NULL," +
                "  type VARCHAR(60) NOT NULL," +
                "  title VARCHAR(255) NOT NULL," +
                "  body TEXT," +
                "  ref_type VARCHAR(30)," +
                "  ref_id BIGINT," +
                "  is_read BOOLEAN NOT NULL DEFAULT FALSE," +
                "  created_at DATETIME(6) NOT NULL," +
                "  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
                ")"
            );
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, is_read)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_notif_user_created ON notifications(user_id, created_at)");
            log.info("Schema Migration: Successfully ensured 'notifications' table exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: notifications table: {}", e.getMessage());
        }

        // 8. Tạo bảng notification_role_defaults
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS notification_role_defaults (" +
                "  id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                "  role VARCHAR(30) NOT NULL," +
                "  type VARCHAR(60) NOT NULL," +
                "  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE," +
                "  UNIQUE KEY uq_role_type (role, type)" +
                ")"
            );
            log.info("Schema Migration: Successfully ensured 'notification_role_defaults' table exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: notification_role_defaults table: {}", e.getMessage());
        }

        // 9. Tạo bảng notification_user_prefs
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS notification_user_prefs (" +
                "  id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                "  user_id BIGINT NOT NULL," +
                "  type VARCHAR(60) NOT NULL," +
                "  enabled BOOLEAN NOT NULL DEFAULT TRUE," +
                "  UNIQUE KEY uq_user_type (user_id, type)," +
                "  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE" +
                ")"
            );
            log.info("Schema Migration: Successfully ensured 'notification_user_prefs' table exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: notification_user_prefs table: {}", e.getMessage());
        }

        // 10. Tạo bảng booking_confirmation_logs (Nhật ký gửi xác nhận đặt phòng)
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS booking_confirmation_logs (" +
                "  id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                "  booking_id BIGINT NOT NULL," +
                "  channel VARCHAR(30) NOT NULL," +
                "  recipient VARCHAR(255)," +
                "  sent_by BIGINT," +
                "  status VARCHAR(30) NOT NULL," +
                "  note TEXT," +
                "  sent_at DATETIME(6) NOT NULL," +
                "  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE," +
                "  FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL" +
                ")"
            );
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_conf_log_booking ON booking_confirmation_logs(booking_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_conf_log_sent_at ON booking_confirmation_logs(sent_at)");
            log.info("Schema Migration: Successfully ensured 'booking_confirmation_logs' table exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: booking_confirmation_logs table: {}", e.getMessage());
        }

        // 11. Tạo bảng channels (Kênh phân phối phòng & cấu hình feed lịch iCal)
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS channels (" +
                "  id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                "  name VARCHAR(100) NOT NULL," +
                "  channel_code VARCHAR(50) NOT NULL," +
                "  room_type_id BIGINT NOT NULL," +
                "  allocated_rooms INT NOT NULL DEFAULT 1," +
                "  feed_token VARCHAR(128) NOT NULL UNIQUE," +
                "  sync_interval_minutes INT NOT NULL DEFAULT 15," +
                "  is_active BOOLEAN NOT NULL DEFAULT TRUE," +
                "  cached_ics_content LONGTEXT," +
                "  last_synced_at DATETIME," +
                "  last_blocked_periods_count INT DEFAULT 0," +
                "  created_by BIGINT," +
                "  created_at DATETIME(6) NOT NULL," +
                "  updated_at DATETIME(6)," +
                "  FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE," +
                "  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL" +
                ")"
            );
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_channel_token ON channels(feed_token)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_channel_room_type ON channels(room_type_id)");
            log.info("Schema Migration: Successfully ensured 'channels' table exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: channels table: {}", e.getMessage());
        }

        // 12. Tạo bảng channel_calendar_sync_logs (Nhật ký sinh tệp lịch)
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS channel_calendar_sync_logs (" +
                "  id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                "  channel_id BIGINT NOT NULL," +
                "  channel_name VARCHAR(100) NOT NULL," +
                "  room_type_name VARCHAR(100) NOT NULL," +
                "  triggered_by VARCHAR(50) NOT NULL," +
                "  blocked_periods_count INT NOT NULL DEFAULT 0," +
                "  blocked_summary TEXT," +
                "  status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS'," +
                "  error_message TEXT," +
                "  synced_at DATETIME(6) NOT NULL," +
                "  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE" +
                ")"
            );
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_sync_log_channel ON channel_calendar_sync_logs(channel_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_sync_log_synced_at ON channel_calendar_sync_logs(synced_at)");
            log.info("Schema Migration: Successfully ensured 'channel_calendar_sync_logs' table exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: channel_calendar_sync_logs table: {}", e.getMessage());
        }

        // 13. Cập nhật bảng channels (external_calendar_url) và tạo bảng channel_room_mappings
        try {
            jdbcTemplate.execute("ALTER TABLE channels ADD COLUMN IF NOT EXISTS external_calendar_url VARCHAR(500)");
            jdbcTemplate.execute("ALTER TABLE channels MODIFY COLUMN room_type_id BIGINT NULL");
            log.info("Schema Migration: Successfully ensured 'channels.external_calendar_url' column exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: channels alter: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS channel_room_mappings (" +
                "  id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                "  channel_id BIGINT NOT NULL," +
                "  external_room_type_code VARCHAR(100) NOT NULL," +
                "  room_type_id BIGINT NOT NULL," +
                "  allocated_rooms INT NOT NULL DEFAULT 1," +
                "  created_at DATETIME(6) NOT NULL," +
                "  updated_at DATETIME(6)," +
                "  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE," +
                "  FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE," +
                "  UNIQUE KEY uq_channel_room_type (channel_id, room_type_id)" +
                ")"
            );
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_crm_channel ON channel_room_mappings(channel_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_crm_room_type ON channel_room_mappings(room_type_id)");
            log.info("Schema Migration: Successfully ensured 'channel_room_mappings' table exists.");

            // Backfill mappings for existing channels
            jdbcTemplate.execute(
                "INSERT INTO channel_room_mappings (channel_id, external_room_type_code, room_type_id, allocated_rooms, created_at, updated_at) " +
                "SELECT c.id, CONCAT(COALESCE(c.channel_code, 'OTA'), '_', c.room_type_id), c.room_type_id, COALESCE(c.allocated_rooms, 1), NOW(), NOW() " +
                "FROM channels c " +
                "WHERE c.room_type_id IS NOT NULL " +
                "AND NOT EXISTS (SELECT 1 FROM channel_room_mappings m WHERE m.channel_id = c.id AND m.room_type_id = c.room_type_id)"
            );
        } catch (Exception e) {
            log.debug("Schema Migration Notice: channel_room_mappings table: {}", e.getMessage());
        }

        // 14. Tạo bảng debt_collection_logs (Nhật ký liên hệ đòi nợ)
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS debt_collection_logs (" +
                "  id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                "  debt_approval_request_id BIGINT NOT NULL," +
                "  contact_date DATETIME NOT NULL," +
                "  contact_method VARCHAR(20) NOT NULL," +
                "  contact_result VARCHAR(50)," +
                "  notes TEXT," +
                "  promised_date DATE," +
                "  next_reminder_date DATE," +
                "  recorded_by BIGINT," +
                "  created_at DATETIME(6)," +
                "  FOREIGN KEY (debt_approval_request_id) REFERENCES debt_approval_requests(id) ON DELETE CASCADE," +
                "  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL" +
                ")"
            );
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_dcl_debt_id_date ON debt_collection_logs(debt_approval_request_id, contact_date DESC)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_dcl_reminder_date ON debt_collection_logs(next_reminder_date)");
            log.info("Schema Migration: Successfully ensured 'debt_collection_logs' table exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: debt_collection_logs table: {}", e.getMessage());
        }

        // 16. Thêm các cột theo dõi trạng thái đồng bộ và cảnh báo mất kết nối vào bảng channels
        try {
            jdbcTemplate.execute("ALTER TABLE channels ADD COLUMN IF NOT EXISTS last_sync_status VARCHAR(20) DEFAULT 'NEVER_SYNCED'");
            jdbcTemplate.execute("ALTER TABLE channels ADD COLUMN IF NOT EXISTS last_sync_error_message TEXT");
            jdbcTemplate.execute("ALTER TABLE channels ADD COLUMN IF NOT EXISTS last_success_synced_at DATETIME");
            jdbcTemplate.execute("ALTER TABLE channels ADD COLUMN IF NOT EXISTS consecutive_failures INT DEFAULT 0");
            
            // Cập nhật dữ liệu cũ nếu last_synced_at đã có nhưng last_sync_status chưa có
            jdbcTemplate.execute("UPDATE channels SET last_sync_status = 'SUCCESS', last_success_synced_at = last_synced_at WHERE last_synced_at IS NOT NULL AND (last_sync_status IS NULL OR last_sync_status = 'NEVER_SYNCED')");
            log.info("Schema Migration: Successfully ensured sync status & disconnect warning columns in 'channels'.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: channels sync status columns: {}", e.getMessage());
        }

        // 17. Tạo bảng channel_room_blocks (Lượt chặn phòng từ kênh OTA) và thêm channel_id vào bookings
        try {
            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS channel_room_blocks (" +
                "  id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                "  channel_id BIGINT NOT NULL," +
                "  room_type_id BIGINT NOT NULL," +
                "  room_id BIGINT NULL," +
                "  external_uid VARCHAR(255) NOT NULL," +
                "  start_date DATE NOT NULL," +
                "  end_date DATE NOT NULL," +
                "  summary VARCHAR(255)," +
                "  status VARCHAR(30) NOT NULL DEFAULT 'BLOCKED'," +
                "  converted_booking_id BIGINT NULL," +
                "  is_excess BOOLEAN NOT NULL DEFAULT FALSE," +
                "  warning_message TEXT," +
                "  created_at DATETIME(6) NOT NULL," +
                "  updated_at DATETIME(6)," +
                "  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE," +
                "  FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE," +
                "  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL," +
                "  FOREIGN KEY (converted_booking_id) REFERENCES bookings(id) ON DELETE SET NULL" +
                ")"
            );
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_crb_channel ON channel_room_blocks(channel_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_crb_dates ON channel_room_blocks(start_date, end_date)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_crb_room ON channel_room_blocks(room_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_crb_uid ON channel_room_blocks(channel_id, external_uid)");
            log.info("Schema Migration: Successfully ensured 'channel_room_blocks' table exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: channel_room_blocks table: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS channel_id BIGINT NULL");
            log.info("Schema Migration: Successfully ensured 'bookings.channel_id' column exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: bookings.channel_id: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE channel_room_blocks ADD COLUMN IF NOT EXISTS reject_reason TEXT");
            log.info("Schema Migration: Successfully ensured 'channel_room_blocks.reject_reason' column exists.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: channel_room_blocks.reject_reason: {}", e.getMessage());
        }

        // 18. NCL-10-CN-007: Mở rộng bảng sessions theo dõi phiên đăng nhập & thời gian chờ
        try {
            jdbcTemplate.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_active_at DATETIME");
            jdbcTemplate.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50)");
            jdbcTemplate.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500)");
            jdbcTemplate.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_info VARCHAR(200)");
            jdbcTemplate.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'");
            jdbcTemplate.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_reason VARCHAR(500)");
            jdbcTemplate.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_at DATETIME");
            jdbcTemplate.execute("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_by BIGINT");
            
            // Đảm bảo có non-unique index trên user_id trước khi drop unique index (đáp ứng foreign key constraint)
            try {
                jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)");
            } catch (Exception ignored) {}

            // Tự động tìm và xóa MỌI unique index trên cột user_id của bảng sessions (do Hibernate tự sinh hash như UKll67hfsoxbb4aj85oexrpq39l)
            try {
                java.util.List<String> uniqueIndexNames = jdbcTemplate.query(
                    "SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS " +
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessions' " +
                    "AND COLUMN_NAME = 'user_id' AND NON_UNIQUE = 0 AND INDEX_NAME != 'PRIMARY'",
                    (rs, rowNum) -> rs.getString("INDEX_NAME")
                );
                for (String idxName : uniqueIndexNames) {
                    try {
                        jdbcTemplate.execute("ALTER TABLE sessions DROP INDEX " + idxName);
                        log.info("Schema Migration: Successfully dropped unique index '{}' on sessions(user_id)", idxName);
                    } catch (Exception ex) {
                        log.debug("Notice dropping index {}: {}", idxName, ex.getMessage());
                    }
                }
            } catch (Exception e) {
                log.debug("Schema Migration Notice: Could not query information_schema for sessions unique index: {}", e.getMessage());
            }

            // Xóa unique constraint cũ theo tên phổ biến nếu có
            try {
                jdbcTemplate.execute("ALTER TABLE sessions DROP INDEX UK_user_id");
            } catch (Exception ignored) {}
            try {
                jdbcTemplate.execute("ALTER TABLE sessions DROP INDEX user_id");
            } catch (Exception ignored) {}
            
            // Cập nhật trạng thái cho các bản ghi cũ
            jdbcTemplate.execute("UPDATE sessions SET status = 'ACTIVE' WHERE status IS NULL");
            jdbcTemplate.execute("UPDATE sessions SET last_active_at = create_at WHERE last_active_at IS NULL");
            
            log.info("Schema Migration: Successfully ensured 'sessions' columns and removed unique constraint for NCL-10-CN-007.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: sessions table migration: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS session_timeout_minutes INT DEFAULT 120");
            jdbcTemplate.execute("ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS max_concurrent_sessions INT DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS max_session_lifetime_hours INT DEFAULT 24");
            jdbcTemplate.execute("ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS public_invoice_lookup_enabled TINYINT(1) DEFAULT 1");
            log.info("Schema Migration: Successfully ensured 'hotel_settings' session and public invoice lookup configuration columns exist.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: hotel_settings configuration columns: {}", e.getMessage());
        }

        // 19. Định mức thời gian dọn và theo dõi năng suất buồng phòng (feature/time-standard)
        try {
            jdbcTemplate.execute("ALTER TABLE room_types ADD COLUMN IF NOT EXISTS standard_checkout_cleaning_minutes INT DEFAULT 45");
            jdbcTemplate.execute("ALTER TABLE room_types ADD COLUMN IF NOT EXISTS standard_periodic_cleaning_minutes INT DEFAULT 20");
            jdbcTemplate.execute("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS cleaning_started_at DATETIME");
            jdbcTemplate.execute("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS active_cleaning_record_id BIGINT");

            jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS room_cleaning_records (" +
                "  id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                "  room_id BIGINT NOT NULL," +
                "  room_type_id BIGINT NOT NULL," +
                "  housekeeper_id BIGINT NULL," +
                "  cleaning_type VARCHAR(30) NULL," +
                "  started_at DATETIME NULL," +
                "  completed_at DATETIME NULL," +
                "  actual_duration_minutes INT NULL," +
                "  standard_duration_minutes INT NULL," +
                "  status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS'," +
                "  is_interrupted BOOLEAN NOT NULL DEFAULT FALSE," +
                "  interruption_reason TEXT NULL," +
                "  has_incident BOOLEAN NOT NULL DEFAULT FALSE," +
                "  incident_count INT NOT NULL DEFAULT 0," +
                "  rejection_count INT NOT NULL DEFAULT 0," +
                "  rejection_note TEXT NULL," +
                "  inspected_by BIGINT NULL," +
                "  inspected_at DATETIME NULL," +
                "  created_at DATETIME(6) NOT NULL," +
                "  updated_at DATETIME(6) NULL," +
                "  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE," +
                "  FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE," +
                "  FOREIGN KEY (housekeeper_id) REFERENCES users(id) ON DELETE SET NULL," +
                "  FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE SET NULL" +
                ")"
            );
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_rcr_room_id ON room_cleaning_records(room_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_rcr_housekeeper_id ON room_cleaning_records(housekeeper_id)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_rcr_completed_at ON room_cleaning_records(completed_at)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_rcr_started_at ON room_cleaning_records(started_at)");
            log.info("Schema Migration: Successfully ensured 'room_cleaning_records' table and cleaning standards columns exist.");
        } catch (Exception e) {
            log.debug("Schema Migration Notice: room_cleaning_records migration: {}", e.getMessage());
        }
    }
}