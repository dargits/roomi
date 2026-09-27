package plant.stay.util;

import org.springframework.stereotype.Component;
import java.util.regex.Pattern;

/**
 * Tiện ích làm sạch và kiểm tra an toàn dữ liệu đầu vào người dùng (XSS, Injection, Malicious Characters).
 * Áp dụng mô hình phòng vệ theo chiều sâu (Defense-in-Depth).
 */
@Component
public class InputSanitizer {

    private static final Pattern SCRIPT_TAG_PATTERN = Pattern.compile("(?i)<script.*?>.*?</script.*?>");
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]+>");
    private static final Pattern EVENT_HANDLER_PATTERN = Pattern.compile("(?i)(onload|onerror|onclick|onmouseover|onfocus|onblur|javascript:)\\s*=");
    private static final Pattern SQL_COMMENT_PATTERN = Pattern.compile("(--|/\\*|\\*/|;)");

    /**
     * Làm sạch chuỗi văn bản tự do: loại bỏ thẻ script, mã độc javascript và html tags nguy hiểm
     */
    public static String sanitize(String input) {
        if (input == null) return null;
        String cleaned = input.trim();
        // Loại bỏ thẻ script
        cleaned = SCRIPT_TAG_PATTERN.matcher(cleaned).replaceAll("");
        // Loại bỏ các event handlers nguy hiểm
        cleaned = EVENT_HANDLER_PATTERN.matcher(cleaned).replaceAll("");
        // Loại bỏ các thẻ html nguy hiểm nhưng giữ nguyên text thuần
        cleaned = HTML_TAG_PATTERN.matcher(cleaned).replaceAll("");
        return cleaned.trim();
    }

    /**
     * Làm sạch chuỗi và giới hạn độ dài tối đa để tránh tràn bộ nhớ / DoS
     */
    public static String sanitizeWithMaxLength(String input, int maxLength) {
        if (input == null) return null;
        String cleaned = sanitize(input);
        if (cleaned.length() > maxLength) {
            return cleaned.substring(0, maxLength);
        }
        return cleaned;
    }

    /**
     * Kiểm tra xem chuỗi có chứa ký tự độc hại XSS không
     */
    public static boolean containsMaliciousContent(String input) {
        if (input == null) return false;
        String lower = input.toLowerCase();
        return lower.contains("<script") ||
               lower.contains("javascript:") ||
               lower.contains("onload=") ||
               lower.contains("onerror=") ||
               lower.contains("<iframe") ||
               lower.contains("<img") ||
               lower.contains("<svg");
    }

    /**
     * Escape ký tự đặc biệt cho câu lệnh LIKE để chống Wildcard Injection
     */
    public static String escapeSqlWildcards(String input) {
        if (input == null) return null;
        return input.replace("\\", "\\\\")
                    .replace("%", "\\%")
                    .replace("_", "\\_");
    }
}
