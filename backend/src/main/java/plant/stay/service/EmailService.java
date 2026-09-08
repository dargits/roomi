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
}
