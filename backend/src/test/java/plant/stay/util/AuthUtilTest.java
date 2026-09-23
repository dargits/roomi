package plant.stay.util;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.HotelSetting;
import plant.stay.model.Role;
import plant.stay.model.Session;
import plant.stay.model.User;
import plant.stay.repository.HotelSettingRepository;
import plant.stay.repository.SessionRepository;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class AuthUtilTest {

    private SessionRepository sessionRepository;
    private HotelSettingRepository hotelSettingRepository;
    private AuthUtil authUtil;

    @BeforeEach
    public void setUp() {
        sessionRepository = mock(SessionRepository.class);
        hotelSettingRepository = mock(HotelSettingRepository.class);
        authUtil = new AuthUtil(sessionRepository, hotelSettingRepository);
    }

    @Test
    @DisplayName("Test: extractToken with Bearer prefix")
    public void testExtractTokenBearer() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("Authorization")).thenReturn("Bearer token-12345");

        String token = authUtil.extractToken(request);
        assertEquals("token-12345", token);
    }

    @Test
    @DisplayName("Test: extractToken with fallback Token header")
    public void testExtractTokenFallback() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("Authorization")).thenReturn(null);
        when(request.getHeader("Token")).thenReturn("token-fallback");

        String token = authUtil.extractToken(request);
        assertEquals("token-fallback", token);
    }

    @Test
    @DisplayName("Test: getUserFromRequest returns null when token missing")
    public void testGetUserFromRequestNoToken() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("Authorization")).thenReturn(null);

        User user = authUtil.getUserFromRequest(request);
        assertNull(user);
    }

    @Test
    @DisplayName("Test: getUserFromToken returns valid active user")
    public void testGetUserFromTokenSuccess() {
        User mockUser = new User();
        mockUser.setId(1L);
        mockUser.setAccount("receptionist1");
        mockUser.setRole(Role.RECEPTIONIST);
        mockUser.setActive(true);

        Session session = new Session();
        session.setSession("token-valid");
        session.setUser(mockUser);
        session.setStatus("ACTIVE");
        session.setCreateAt(LocalDateTime.now().minusHours(1));
        session.setLastActiveAt(LocalDateTime.now().minusMinutes(5));

        when(sessionRepository.findBySession("token-valid")).thenReturn(Optional.of(session));

        User result = authUtil.getUserFromToken("token-valid");
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("receptionist1", result.getAccount());
    }

    @Test
    @DisplayName("Test: getUserFromToken throws exception when session REVOKED")
    public void testGetUserFromTokenRevoked() {
        Session session = new Session();
        session.setSession("token-revoked");
        session.setStatus("REVOKED");
        session.setRevokedReason("Đã bị đăng xuất bởi quản trị viên");

        when(sessionRepository.findBySession("token-revoked")).thenReturn(Optional.of(session));

        UnauthorizedException exception = assertThrows(UnauthorizedException.class, () -> {
            authUtil.getUserFromToken("token-revoked");
        });

        assertTrue(exception.getMessage().contains("Đã bị đăng xuất"));
    }

    @Test
    @DisplayName("Test: getUserFromToken throws exception when session EXPIRED status")
    public void testGetUserFromTokenExpiredStatus() {
        Session session = new Session();
        session.setSession("token-expired");
        session.setStatus("EXPIRED");

        when(sessionRepository.findBySession("token-expired")).thenReturn(Optional.of(session));

        UnauthorizedException exception = assertThrows(UnauthorizedException.class, () -> {
            authUtil.getUserFromToken("token-expired");
        });

        assertTrue(exception.getMessage().contains("hết hạn"));
    }

    @Test
    @DisplayName("Test: getUserFromToken throws exception when user is inactive")
    public void testGetUserFromTokenInactiveUser() {
        User mockUser = new User();
        mockUser.setActive(false);

        Session session = new Session();
        session.setSession("token-inactive");
        session.setUser(mockUser);
        session.setStatus("ACTIVE");

        when(sessionRepository.findBySession("token-inactive")).thenReturn(Optional.of(session));

        UnauthorizedException exception = assertThrows(UnauthorizedException.class, () -> {
            authUtil.getUserFromToken("token-inactive");
        });

        assertTrue(exception.getMessage().contains("bị khóa"));
    }

    @Test
    @DisplayName("Test: getUserFromToken handles session inactivity timeout")
    public void testGetUserFromTokenInactivityTimeout() {
        HotelSetting setting = new HotelSetting();
        setting.setSessionTimeoutMinutes(30);
        when(hotelSettingRepository.findById(1L)).thenReturn(Optional.of(setting));

        User mockUser = new User();
        mockUser.setActive(true);

        Session session = new Session();
        session.setSession("token-timeout");
        session.setUser(mockUser);
        session.setStatus("ACTIVE");
        session.setCreateAt(LocalDateTime.now().minusHours(2));
        session.setLastActiveAt(LocalDateTime.now().minusMinutes(45)); // Inactive for 45 mins (> 30 mins)

        when(sessionRepository.findBySession("token-timeout")).thenReturn(Optional.of(session));

        UnauthorizedException exception = assertThrows(UnauthorizedException.class, () -> {
            authUtil.getUserFromToken("token-timeout");
        });

        assertTrue(exception.getMessage().contains("không thao tác"));
        assertEquals("EXPIRED", session.getStatus());
        verify(sessionRepository, atLeastOnce()).save(session);
    }

    @Test
    @DisplayName("Test: extractClientIp with X-Forwarded-For")
    public void testExtractClientIp() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("X-Forwarded-For")).thenReturn("203.0.113.195, 70.41.3.18");

        String ip = AuthUtil.extractClientIp(request);
        assertEquals("203.0.113.195", ip);
    }

    @Test
    @DisplayName("Test: parseDeviceInfo identifies OS and browser")
    public void testParseDeviceInfo() {
        String uaWindowsChrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
        String info = AuthUtil.parseDeviceInfo(uaWindowsChrome);
        assertTrue(info.contains("Google Chrome"));
        assertTrue(info.contains("Windows"));

        assertEquals("Không xác định", AuthUtil.parseDeviceInfo(null));
    }
}
