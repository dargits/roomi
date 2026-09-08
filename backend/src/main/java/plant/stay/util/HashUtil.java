package plant.stay.util;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

public class HashUtil {

    /**
     * Mã hóa mật khẩu sử dụng SHA-256 (có sẵn trong Java)
     */
    public static String hashPassword(String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(password.getBytes());
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Không tìm thấy thuật toán mã hóa", e);
        }
    }

    /**
     * Kiểm tra mật khẩu gốc có khớp với mật khẩu đã mã hóa hay không
     */
    public static boolean checkPassword(String rawPassword, String hashedPassword) {
        String newHash = hashPassword(rawPassword);
        return newHash.equals(hashedPassword);
    }
}
