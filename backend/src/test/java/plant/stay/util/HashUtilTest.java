package plant.stay.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class HashUtilTest {

    @Test
    @DisplayName("Test: hashPassword produces consistent hash")
    public void testHashPasswordConsistency() {
        String raw = "Admin@123456";
        String hash1 = HashUtil.hashPassword(raw);
        String hash2 = HashUtil.hashPassword(raw);

        assertNotNull(hash1);
        assertFalse(hash1.isEmpty());
        assertEquals(hash1, hash2);
        assertNotEquals(raw, hash1);
    }

    @Test
    @DisplayName("Test: checkPassword validates correctly")
    public void testCheckPassword() {
        String raw = "SecurePassword2026!";
        String hash = HashUtil.hashPassword(raw);

        assertTrue(HashUtil.checkPassword(raw, hash));
        assertFalse(HashUtil.checkPassword("WrongPassword", hash));
        assertFalse(HashUtil.checkPassword("", hash));
    }
}
