package roomi.dev.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;

public class PasswordHelper {
    
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int SALT_LENGTH = 32;
    
    /**
     * Mã hóa password với salt ngẫu nhiên
     */
    public static String encode(String rawPassword) {
        try {
            // Tạo salt ngẫu nhiên
            byte[] salt = new byte[SALT_LENGTH];
            RANDOM.nextBytes(salt);
            
            // Hash password với salt
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt);
            byte[] hashedPassword = md.digest(rawPassword.getBytes(StandardCharsets.UTF_8));
            
            // Chuyển thành hex string: salt + hash
            StringBuilder result = new StringBuilder();
            
            // Thêm salt (hex)
            for (byte b : salt) {
                result.append(String.format("%02x", b));
            }
            
            // Thêm hash (hex)  
            for (byte b : hashedPassword) {
                result.append(String.format("%02x", b));
            }
            
            return result.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi mã hóa password", e);
        }
    }
    
    /**
     * Kiểm tra password raw có khớp với encoded không
     */
    public static boolean matches(String rawPassword, String encodedPassword) {
        try {
            if (encodedPassword == null || encodedPassword.length() != (SALT_LENGTH * 2 + 64)) {
                return false;
            }
            
            // Tách salt và hash từ encoded string
            String saltHex = encodedPassword.substring(0, SALT_LENGTH * 2);
            String hashHex = encodedPassword.substring(SALT_LENGTH * 2);
            
            // Convert salt từ hex về bytes
            byte[] salt = new byte[SALT_LENGTH];
            for (int i = 0; i < SALT_LENGTH; i++) {
                salt[i] = (byte) Integer.parseInt(saltHex.substring(i * 2, i * 2 + 2), 16);
            }
            
            // Hash raw password với salt này
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(salt);
            byte[] computedHash = md.digest(rawPassword.getBytes(StandardCharsets.UTF_8));
            
            // Convert computed hash thành hex
            StringBuilder computedHex = new StringBuilder();
            for (byte b : computedHash) {
                computedHex.append(String.format("%02x", b));
            }
            
            // So sánh
            return hashHex.equals(computedHex.toString());
        } catch (Exception e) {
            return false;
        }
    }
}