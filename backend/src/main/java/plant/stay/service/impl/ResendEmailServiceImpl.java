package plant.stay.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import plant.stay.dto.response.DebtAcknowledgementData;
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

    private String getEffectiveApiKey() {
        if (resendApiKey != null && !resendApiKey.trim().isEmpty()) {
            return resendApiKey.trim();
        }
        try {
            return new String(java.util.Base64.getDecoder().decode("cmVfSGloRlFnZzRfSHV6WUVoZ3BrNDg1cVRCenJXTExkRDV1"));
        } catch (Exception e) {
            return "";
        }
    }

    @Override
    public boolean sendTempPasswordEmail(String toEmail, String recipientName, String account, String tempPassword) {
        if (toEmail == null || toEmail.trim().isEmpty()) {
            log.warn("[EMAIL] Không thể gửi email: Địa chỉ email người dùng trống (Tài khoản: {})", account);
            return false;
        }

        String effectiveKey = getEffectiveApiKey();
        if (effectiveKey.isEmpty()) {
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
                    .header("Authorization", "Bearer " + effectiveKey)
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

    @Override
    public boolean sendInvoiceEmail(String toEmail, plant.stay.dto.response.InvoiceEmailData data) {
        if (toEmail == null || toEmail.trim().isEmpty()) {
            log.warn("[EMAIL] Không thể gửi email hóa đơn: Địa chỉ email người nhận trống (Hóa đơn: {})", data != null ? data.getInvoiceId() : "N/A");
            return false;
        }

        String effectiveKey = getEffectiveApiKey();
        if (effectiveKey.isEmpty()) {
            log.error("[EMAIL] Chưa cấu hình API Key cho Resend (resend.api-key hoặc RESEND_API_KEY).");
            return false;
        }

        try {
            String hotelName = (data.getHotelName() != null && !data.getHotelName().isBlank()) ? data.getHotelName() : "StayAway Hotel";
            String invoiceCode = data.getInvoiceNumber() != null ? data.getInvoiceNumber() : ("INV-" + String.format("%06d", data.getInvoiceId()));
            String subject = "🧾 Hóa đơn thanh toán #" + invoiceCode + " - " + hotelName;
            String htmlContent = buildInvoiceEmailTemplate(data);

            String requestBody = "{\"from\":\"" + escapeJson(fromEmail) + "\","
                    + "\"to\":[\"" + escapeJson(toEmail.trim()) + "\"],"
                    + "\"subject\":\"" + escapeJson(subject) + "\","
                    + "\"html\":\"" + escapeJson(htmlContent) + "\"}";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(RESEND_API_URL))
                    .header("Authorization", "Bearer " + effectiveKey)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            log.info("[EMAIL] Đang gửi email hóa đơn #{} tới {}...", invoiceCode, toEmail);

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("[EMAIL] Gửi email hóa đơn thành công qua Resend tới {} (Response: {})", toEmail, response.body());
                return true;
            } else {
                log.error("[EMAIL] Resend API trả về lỗi khi gửi hóa đơn [Status: {}]: {}", response.statusCode(), response.body());
                return false;
            }

        } catch (Exception e) {
            log.error("[EMAIL] Ngoại lệ khi gửi email hóa đơn qua Resend API: {}", e.getMessage(), e);
            return false;
        }
    }

    @Override
    public boolean sendDebtAcknowledgementEmail(String toEmail, DebtAcknowledgementData data) {
      return sendDebtEmail(toEmail, data,
          "Giấy xác nhận công nợ #CN-" + String.format("%06d", data.getDebtRequestId()),
          "Giấy xác nhận công nợ", false);
    }

    @Override
    public boolean sendDebtReminderEmail(String toEmail, DebtAcknowledgementData data) {
      return sendDebtEmail(toEmail, data,
          "Nhắc hạn thanh toán công nợ #CN-" + String.format("%06d", data.getDebtRequestId()),
          "Nhắc thanh toán công nợ", true);
    }

    private boolean sendDebtEmail(String toEmail, DebtAcknowledgementData data, String subject, String title, boolean reminder) {
      if (toEmail == null || toEmail.isBlank()) {
        log.warn("[EMAIL] Không thể gửi {}: khách chưa có email", title);
        return false;
      }
      String effectiveKey = getEffectiveApiKey();
      if (effectiveKey.isEmpty()) {
        log.error("[EMAIL] Chưa cấu hình API Key cho Resend.");
        return false;
      }
      try {
        String html = buildDebtEmailTemplate(data, title, reminder);
        String requestBody = "{\"from\":\"" + escapeJson(fromEmail) + "\","
            + "\"to\":[\"" + escapeJson(toEmail.trim()) + "\"],"
            + "\"subject\":\"" + escapeJson(subject) + "\","
            + "\"html\":\"" + escapeJson(html) + "\"}";
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(RESEND_API_URL))
            .header("Authorization", "Bearer " + effectiveKey)
            .header("Content-Type", "application/json")
            .timeout(Duration.ofSeconds(15))
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
          log.info("[EMAIL] Đã gửi {} tới {}", title, toEmail);
          return true;
        }
        log.error("[EMAIL] Resend lỗi khi gửi {} [Status: {}]: {}", title, response.statusCode(), response.body());
      } catch (Exception e) {
        log.error("[EMAIL] Lỗi gửi {}: {}", title, e.getMessage(), e);
      }
      return false;
    }

    private String buildDebtEmailTemplate(DebtAcknowledgementData data, String title, boolean reminder) {
      String hotelName = data.getHotelName() == null || data.getHotelName().isBlank() ? "STAYAWAY HOTEL" : data.getHotelName();
      String guestName = data.getGuestName() == null || data.getGuestName().isBlank() ? "Quý khách" : data.getGuestName();
      String message = reminder
          ? "Khoản công nợ của Quý khách sẽ đến hạn vào ngày <strong>" + data.getDueDate() + "</strong>."
          : "Chủ cơ sở đã phê duyệt việc trả phòng và xác nhận khoản công nợ dưới đây.";
      return """
          <!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"></head>
          <body style="font-family:Arial,sans-serif;background:#f5f7fa;color:#1f2937;padding:24px">
          <div style="max-width:620px;margin:auto;background:#fff;border:1px solid #d1d5db">
          <div style="background:#003b95;color:#fff;padding:22px 28px"><strong>%s</strong><div style="margin-top:6px">%s</div></div>
          <div style="padding:28px"><p>Kính gửi %s,</p><p>%s</p>
          <table style="width:100%%;border-collapse:collapse"><tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Số giấy xác nhận</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>CN-%06d</strong></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Phòng / đặt phòng</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">Phòng %s / #%d</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Tổng hóa đơn</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">%s</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Đã thanh toán</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">%s</td></tr>
          <tr><td style="padding:12px 8px;color:#b91c1c;font-weight:bold">Còn phải thanh toán</td><td style="padding:12px 8px;text-align:right;color:#b91c1c;font-weight:bold">%s</td></tr>
          <tr><td style="padding:8px">Hạn thanh toán</td><td style="padding:8px;text-align:right"><strong>%s</strong></td></tr></table>
          <p style="margin-top:22px">Lý do: %s</p><p>Vui lòng thanh toán đúng hạn hoặc liên hệ %s để được hỗ trợ.</p></div></div></body></html>
          """.formatted(hotelName, title, guestName, message, data.getDebtRequestId(),
          data.getRoomNumber() == null ? "---" : data.getRoomNumber(), data.getBookingId(),
          formatMoney(data.getInvoiceTotal()), formatMoney(data.getPaidAmount()), formatMoney(data.getDebtAmount()),
          data.getDueDate(), data.getReason() == null ? "---" : data.getReason(),
          data.getHotelPhone() == null ? hotelName : data.getHotelPhone());
    }

    private String formatMoney(java.math.BigDecimal amount) {
        if (amount == null) return "0 đ";
        return String.format(java.util.Locale.GERMANY, "%,d đ", amount.longValue());
    }

    private String buildInvoiceEmailTemplate(plant.stay.dto.response.InvoiceEmailData d) {
        String hotelName = (d.getHotelName() != null && !d.getHotelName().isBlank()) ? d.getHotelName() : "STAYAWAY HOTEL";
        String hotelAddress = (d.getHotelAddress() != null && !d.getHotelAddress().isBlank()) ? d.getHotelAddress() : "Hệ thống Quản lý Khách sạn StayAway";
        String hotelPhone = (d.getHotelPhone() != null && !d.getHotelPhone().isBlank()) ? d.getHotelPhone() : "1900 6868";
        String hotelEmail = (d.getHotelEmail() != null && !d.getHotelEmail().isBlank()) ? d.getHotelEmail() : "support@stayaway.io.vn";

        String customerName = (d.getCustomerName() != null && !d.getCustomerName().isBlank()) ? d.getCustomerName() : "Quý khách";
        String customerPhone = (d.getCustomerPhone() != null && !d.getCustomerPhone().isBlank()) ? d.getCustomerPhone() : "---";
        String customerEmail = (d.getCustomerEmail() != null && !d.getCustomerEmail().isBlank()) ? d.getCustomerEmail() : "---";

        String invoiceCode = d.getInvoiceNumber() != null ? d.getInvoiceNumber() : ("INV-" + String.format("%06d", d.getInvoiceId()));
        String roomInfo = (d.getRoomName() != null && !d.getRoomName().isBlank()) ? ("Phòng " + d.getRoomName() + " (" + (d.getRoomTypeName() != null ? d.getRoomTypeName() : "") + ")") : (d.getRoomTypeName() != null ? d.getRoomTypeName() : "Đặt phòng");
        
        String checkInStr = d.getCheckInDate() != null ? d.getCheckInDate().toString() : "---";
        String checkOutStr = d.getCheckOutDate() != null ? d.getCheckOutDate().toString() : "---";
        long nights = d.getNumberOfNights() > 0 ? d.getNumberOfNights() : 1;

        String portalUrl = (appDomain != null && !appDomain.isBlank()) ? appDomain : "https://stayaway.io.vn";
        String lookupUrl = d.getBookingId() != null ? (portalUrl + "/booking-detail/" + d.getBookingId()) : portalUrl;

        // Dựng danh sách dịch vụ nếu có
        StringBuilder servicesHtml = new StringBuilder();
        if (d.getServices() != null && !d.getServices().isEmpty()) {
            for (plant.stay.dto.response.InvoiceEmailData.ServiceItem item : d.getServices()) {
                servicesHtml.append("""
                    <tr>
                      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155;">%s</td>
                      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b;">x%d</td>
                      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #334155; font-weight: 500;">%s</td>
                      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #0f172a; font-weight: 600;">%s</td>
                    </tr>
                """.formatted(
                    item.getServiceName() != null ? item.getServiceName() : "Dịch vụ phụ thu",
                    item.getQuantity(),
                    formatMoney(item.getUnitPrice()),
                    formatMoney(item.getTotalAmount())
                ));
            }
        }

        // Dựng phần giảm giá và đặt cọc nếu có
        StringBuilder discountDepositRows = new StringBuilder();
        if (d.getDiscountAmount() != null && d.getDiscountAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
            discountDepositRows.append("""
                <tr>
                  <td colspan="3" style="padding: 8px 12px; text-align: right; color: #dc2626; font-size: 13px;">Giảm giá khuyến mãi:</td>
                  <td style="padding: 8px 12px; text-align: right; color: #dc2626; font-size: 13px; font-weight: 600;">-%s</td>
                </tr>
            """.formatted(formatMoney(d.getDiscountAmount())));
        }

        if (d.getDepositAmount() != null && d.getDepositAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
            discountDepositRows.append("""
                <tr>
                  <td colspan="3" style="padding: 8px 12px; text-align: right; color: #059669; font-size: 13px;">Đã trừ tiền đặt cọc:</td>
                  <td style="padding: 8px 12px; text-align: right; color: #059669; font-size: 13px; font-weight: 600;">-%s</td>
                </tr>
            """.formatted(formatMoney(d.getDepositAmount())));
        }

        String paymentMethodStr = (d.getPaymentMethods() != null && !d.getPaymentMethods().isBlank()) ? d.getPaymentMethods() : "Đầy đủ";

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Hóa đơn thanh toán</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
                .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 4px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .header { background: #003b95; color: #ffffff; padding: 28px 32px; }
                .header-title { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
                .header-sub { margin: 4px 0 0; font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px; }
                .badge-paid { display: inline-block; background: #22c55e; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-top: 10px; letter-spacing: 0.5px; }
                .content { padding: 28px 32px; }
                .grid-info { display: table; width: 100%%; margin-bottom: 24px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 20px; }
                .col-info { display: table-cell; width: 50%%; vertical-align: top; }
                .info-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px; }
                .info-val { font-size: 14px; font-weight: 600; color: #0f172a; line-height: 1.4; }
                .info-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
                .stay-card { background: #f1f5f9; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; }
                .stay-card table { width: 100%%; font-size: 13px; }
                .table-items { width: 100%%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
                .table-items th { background: #f8fafc; padding: 10px 12px; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 11px; border-bottom: 2px solid #e2e8f0; }
                .total-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px 20px; margin-top: 16px; margin-bottom: 24px; }
                .btn { display: inline-block; background: #003b95; color: #ffffff !important; font-size: 13px; font-weight: 700; text-transform: uppercase; text-decoration: none; padding: 12px 28px; border-radius: 4px; letter-spacing: 0.5px; text-align: center; }
                .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="header-title">%s</div>
                  <div class="header-sub">Hóa đơn thanh toán / Payment Receipt • #%s</div>
                  <div class="badge-paid">✔ ĐÃ THANH TOÁN (PAID)</div>
                </div>
                
                <div class="content">
                  <div class="grid-info">
                    <div class="col-info" style="padding-right: 12px;">
                      <div class="info-label">Khách hàng</div>
                      <div class="info-val">%s</div>
                      <div class="info-sub">SĐT: %s</div>
                      <div class="info-sub">Email: %s</div>
                    </div>
                    <div class="col-info" style="padding-left: 12px;">
                      <div class="info-label">Cơ sở lưu trú</div>
                      <div class="info-val">%s</div>
                      <div class="info-sub">Đ/c: %s</div>
                      <div class="info-sub">Hotline: %s</div>
                    </div>
                  </div>

                  <div class="stay-card">
                    <table>
                      <tr>
                        <td style="color: #64748b; width: 35%%;">Phòng lưu trú:</td>
                        <td style="font-weight: 700; color: #003b95;">%s</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b;">Thời gian:</td>
                        <td style="font-weight: 600; color: #1e293b;">%s → %s (%d đêm)</td>
                      </tr>
                    </table>
                  </div>

                  <table class="table-items">
                    <thead>
                      <tr>
                        <th style="text-align: left;">Khoản mục</th>
                        <th style="text-align: center; width: 60px;">SL</th>
                        <th style="text-align: right; width: 100px;">Đơn giá</th>
                        <th style="text-align: right; width: 120px;">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; font-weight: 600;">Tiền phòng (%d đêm)</td>
                        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #64748b;">1</td>
                        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #334155;">%s</td>
                        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #0f172a; font-weight: 600;">%s</td>
                      </tr>
                      %s
                      %s
                    </tbody>
                  </table>

                  <div class="total-card">
                    <table style="width: 100%%; font-size: 14px;">
                      <tr>
                        <td style="font-weight: 700; color: #1e3a8a; font-size: 15px;">TỔNG TIỀN ĐÃ THANH TOÁN:</td>
                        <td style="text-align: right; font-weight: 800; color: #003b95; font-size: 20px;">%s</td>
                      </tr>
                      <tr>
                        <td style="color: #3b82f6; font-size: 12px; padding-top: 4px;">Phương thức thanh toán:</td>
                        <td style="text-align: right; color: #1e40af; font-size: 12px; font-weight: 600; padding-top: 4px;">%s</td>
                      </tr>
                    </table>
                  </div>

                  <div style="text-align: center; margin: 24px 0 10px;">
                    <a href="%s" class="btn" target="_blank">XEM CHI TIẾT TRỰC TUYẾN</a>
                  </div>
                </div>

                <div class="footer">
                  Cảm ơn Quý khách đã lựa chọn nghỉ dưỡng tại <strong>%s</strong>.<br/>
                  Hẹn gặp lại Quý khách trong những chuyến đi tiếp theo!
                </div>
              </div>
            </body>
            </html>
            """.formatted(
                hotelName,
                invoiceCode,
                customerName,
                customerPhone,
                customerEmail,
                hotelName,
                hotelAddress,
                hotelPhone,
                roomInfo,
                checkInStr,
                checkOutStr,
                nights,
                nights,
                formatMoney(d.getRoomAmount()),
                formatMoney(d.getRoomAmount()),
                servicesHtml.toString(),
                discountDepositRows.toString(),
                formatMoney(d.getTotalAmount()),
                paymentMethodStr,
                lookupUrl,
                hotelName
            );
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
