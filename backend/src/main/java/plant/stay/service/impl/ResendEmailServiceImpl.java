package plant.stay.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import plant.stay.service.EmailService;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
@Slf4j
public class ResendEmailServiceImpl implements EmailService {

    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    @Value("${resend.api-key:${RESEND_API_KEY:}}")
    private String resendApiKey;

    @Value("${resend.from-email:StayAway PMS <noreply@stayaway.io.vn>}")
    private String fromEmail;

    @Value("${app.domain:https://stayaway.io.vn}")
    private String appDomain;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public boolean sendTempPasswordEmail(String toEmail, String recipientName, String account, String tempPassword) {
        if (toEmail == null || toEmail.trim().isEmpty()) {
            log.warn("[EMAIL] Không thể gửi email: Địa chỉ email người dùng trống (Tài khoản: {})", account);
            return false;
        }

        if (resendApiKey == null || resendApiKey.trim().isEmpty()) {
            log.error("[EMAIL] Chưa cấu hình API Key cho Resend (resend.api-key hoặc RESEND_API_KEY).");
            return false;
        }

        try {
            String subject = "🔒 Mật khẩu tạm thời đăng nhập hệ thống StayAway PMS";
            String htmlContent = buildEmailTemplate(recipientName, account, tempPassword);

            String requestBody = "{\"from\":\"" + escapeJson(fromEmail) + "\","
                    + "\"to\":[\"" + escapeJson(toEmail.trim()) + "\"],"
                    + "\"subject\":\"" + escapeJson(subject) + "\","
                    + "\"html\":\"" + escapeJson(htmlContent) + "\"}";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(RESEND_API_URL))
                    .header("Authorization", "Bearer " + resendApiKey.trim())
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            log.info("[EMAIL] Đang gửi email mật khẩu tạm tới {} (Tài khoản: {})...", toEmail, account);

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("[EMAIL] Gửi email thành công qua Resend tới {} (Response: {})", toEmail, response.body());
                return true;
            } else {
                log.error("[EMAIL] Resend API trả về lỗi [Status: {}]: {}", response.statusCode(), response.body());
                return false;
            }

        } catch (Exception e) {
            log.error("[EMAIL] Ngoại lệ khi gửi email qua Resend API: {}", e.getMessage(), e);
            return false;
        }
    }

    private String buildEmailTemplate(String name, String account, String tempPassword) {
        String displayName = (name != null && !name.trim().isEmpty()) ? name : account;
        String loginUrl = (appDomain != null && !appDomain.trim().isEmpty()) ? appDomain : "https://stayaway.io.vn";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Mật khẩu tạm thời StayAway</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
                .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 0px; border: 1px solid #cbd5e1; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                .header { background: #003b95; color: #ffffff; padding: 28px 32px; text-align: center; }
                .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
                .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
                .body { padding: 32px; }
                .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
                .desc { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
                .password-card { background: #f8fafc; border: 2px dashed #003b95; padding: 20px; text-align: center; margin-bottom: 24px; }
                .password-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
                .password-value { font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: 800; color: #003b95; letter-spacing: 3px; word-break: break-all; }
                .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; padding: 4px 10px; margin-top: 10px; border: 1px solid #fde68a; }
                .info-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; font-size: 13px; line-height: 1.5; color: #1e40af; margin-bottom: 24px; }
                .btn-container { text-align: center; margin: 30px 0 10px; }
                .btn { display: inline-block; background: #003b95; color: #ffffff !important; font-size: 14px; font-weight: 700; text-transform: uppercase; text-decoration: none; padding: 12px 30px; letter-spacing: 1px; border-radius: 0px; }
                .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>STAYAWAY PMS</h1>
                  <p>Hệ Thống Quản Lý Cơ Sở Lưu Trú</p>
                </div>
                <div class="body">
                  <div class="greeting">Xin chào, %s!</div>
                  <p class="desc">
                    Quản trị viên hệ thống đã phê duyệt yêu cầu cấp lại mật khẩu cho tài khoản <strong>%s</strong> của bạn. Dưới đây là thông tin mật khẩu tạm thời:
                  </p>
                  
                  <div class="password-card">
                    <div class="password-label">Mật khẩu tạm thời của bạn</div>
                    <div class="password-value">%s</div>
                    <div class="badge">⏰ Có hiệu lực trong vòng 24 giờ</div>
                  </div>

                  <div class="info-box">
                    <strong>🛡️ Hướng dẫn bảo mật quan trọng:</strong><br/>
                    • Vì lý do an toàn, hệ thống sẽ <strong>bắt buộc bạn đổi sang mật khẩu mới</strong> ngay trong lần đầu tiên đăng nhập bằng mật khẩu tạm này.<br/>
                    • Tuyệt đối không chia sẻ mật khẩu tạm này cho bất kỳ ai.
                  </div>

                  <div class="btn-container">
                    <a href="%s/login" class="btn" target="_blank">ĐĂNG NHẬP NGAY</a>
                  </div>
                </div>
                <div class="footer">
                  Email này được gửi tự động từ hệ thống StayAway PMS.<br/>
                  Nếu bạn không yêu cầu cấp lại mật khẩu, vui lòng liên hệ ngay với Quản trị viên cơ sở.
                </div>
              </div>
            </body>
            </html>
            """.formatted(displayName, account, tempPassword, loginUrl);
    }

    private String escapeJson(String input) {
        if (input == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c <= 0x1F) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }
}
