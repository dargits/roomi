package plant.stay.service;

public interface EmailService {
    /**
     * Gửi email chứa mật khẩu tạm thời tới người dùng
     *
     * @param toEmail       Địa chỉ email người nhận
     * @param recipientName Họ và tên người nhận
     * @param account       Tên đăng nhập
     * @param tempPassword  Mật khẩu tạm thời
     * @return true nếu gửi thành công, false nếu thất bại
     */
    boolean sendTempPasswordEmail(String toEmail, String recipientName, String account, String tempPassword);

    /**
     * Gửi email chứa liên kết đặt lại mật khẩu bảo mật (hiệu lực 10 phút)
     *
     * @param toEmail        Địa chỉ email người nhận
     * @param recipientName  Họ và tên người nhận
     * @param account        Tên đăng nhập
     * @param resetLink      Đường link đặt lại mật khẩu dạng /token
     * @param expireMinutes  Thời gian hết hạn tính bằng phút (10 phút)
     * @return true nếu gửi thành công, false nếu thất bại
     */
    boolean sendPasswordResetLinkEmail(String toEmail, String recipientName, String account, String resetLink, int expireMinutes);

    /**
     * Gửi email hóa đơn thanh toán cho khách hàng
     *
     * @param toEmail Email người nhận
     * @param data    Dữ liệu hóa đơn
     * @return true nếu gửi thành công, false nếu thất bại
     */
    boolean sendInvoiceEmail(String toEmail, plant.stay.dto.response.InvoiceEmailData data);

    boolean sendDebtAcknowledgementEmail(String toEmail, plant.stay.dto.response.DebtAcknowledgementData data);

    boolean sendDebtReminderEmail(String toEmail, plant.stay.dto.response.DebtAcknowledgementData data);

    /**
     * Gửi email nhắc nhở nhận phòng trước 1 ngày cho khách hàng
     *
     * @param toEmail Email người nhận
     * @param data    Dữ liệu nhắc nhở nhận phòng
     * @return true nếu gửi thành công, false nếu thất bại
     */
    boolean sendCheckInReminderEmail(String toEmail, plant.stay.dto.response.CheckInReminderData data);

    /**
     * Gửi email bản xác nhận đặt phòng cho khách hàng
     *
     * @param toEmail Email người nhận
     * @param data    Dữ liệu bản xác nhận đặt phòng
     * @return true nếu gửi thành công, false nếu thất bại
     */
    boolean sendBookingConfirmationEmail(String toEmail, plant.stay.dto.response.BookingConfirmationData data);

    /**
     * Kiểm tra hệ thống cơ sở đã cấu hình thư điện tử (API Key) hay chưa
     *
     * @return true nếu đã cấu hình, false nếu chưa
     */
    boolean isEmailConfigured();
}
