package plant.stay.model;

public enum PasswordResetStatus {
    PENDING,    // Chờ Quản trị viên xử lý
    ISSUED,     // Đã cấp mật khẩu tạm
    USED,       // Đã đăng nhập và đổi mật khẩu thành công
    EXPIRED,    // Hết hạn 24h
    REJECTED    // Từ chối cấp
}
