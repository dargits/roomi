package plant.stay.service;

/**
 * Dịch vụ OTP bảo mật cho tính năng tái tạo dữ liệu mẫu.
 * Khi admin nhấn "Tái Tạo Dữ Liệu Mẫu", hệ thống sinh OTP 6 chữ số,
 * gửi qua Telegram Bot, và yêu cầu nhập đúng OTP mới được thực thi.
 */
public interface ReseedOtpService {

    /**
     * Sinh OTP 6 chữ số, lưu tạm thời (5 phút) và gửi qua Telegram Bot.
     * @param adminName Tên người thực hiện (để ghi vào tin nhắn Telegram)
     * @return true nếu gửi OTP thành công
     */
    boolean generateAndSendOtp(String adminName);

    /**
     * Xác minh OTP người dùng nhập.
     * @param otp Mã OTP 6 chữ số
     * @return true nếu OTP hợp lệ và còn hiệu lực
     */
    boolean verifyOtp(String otp);

    /**
     * Hủy bỏ OTP hiện tại (sau khi dùng hoặc hết hạn).
     */
    void invalidateOtp();
}
