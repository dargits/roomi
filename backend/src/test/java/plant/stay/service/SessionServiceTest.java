package plant.stay.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.LoginRequest;
import plant.stay.dto.response.LoginResponse;
import plant.stay.dto.response.UserSessionResponse;
import plant.stay.exception.BusinessException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.Session;
import plant.stay.model.User;
import plant.stay.repository.AuditLogRepository;
import plant.stay.repository.SessionRepository;
import plant.stay.repository.UserRepository;
import plant.stay.util.AuthUtil;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class SessionServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthUtil authUtil;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private plant.stay.repository.HotelSettingRepository hotelSettingRepository;

    @Test
    @DisplayName("NCL-10-CN-007-TC-01: Hiển thị đầy đủ danh sách phiên đang hoạt động kèm thông tin thiết bị và vai trò")
    void testGetActiveSessions_Success() {
        // Giả lập 2 đăng nhập từ 2 thiết bị khác nhau
        MockHttpServletRequest request1 = new MockHttpServletRequest();
        request1.setRemoteAddr("192.168.1.100");
        request1.addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");

        MockHttpServletRequest request2 = new MockHttpServletRequest();
        request2.setRemoteAddr("192.168.1.200");
        request2.addHeader("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1");

        LoginRequest req1 = new LoginRequest("admin", "pass@123");
        LoginResponse resp1 = userService.login(req1, request1);

        LoginRequest req2 = new LoginRequest("letan", "pass@123");
        LoginResponse resp2 = userService.login(req2, request2);

        User adminUser = userRepository.findByAccount("admin").orElseThrow();

        // Lấy danh sách phiên đang hoạt động
        List<UserSessionResponse> activeSessions = userService.getActiveSessions(null, adminUser, resp1.getToken());

        assertNotNull(activeSessions);
        assertTrue(activeSessions.size() >= 2);

        // Kiểm tra phiên của admin
        UserSessionResponse adminSession = activeSessions.stream()
                .filter(s -> s.getAccount().equals("admin") && s.isCurrentSession())
                .findFirst().orElse(null);
        assertNotNull(adminSession);
        assertEquals(Role.ADMIN, adminSession.getRole());
        assertTrue(adminSession.isCurrentSession());
        assertTrue(adminSession.getDeviceInfo().contains("Chrome") || adminSession.getDeviceInfo().contains("Windows"));
        assertEquals("192.168.1.100", adminSession.getIpAddress());

        // Kiểm tra phiên của lễ tân
        UserSessionResponse letanSession = activeSessions.stream()
                .filter(s -> s.getAccount().equals("letan"))
                .findFirst().orElse(null);
        assertNotNull(letanSession);
        assertEquals(Role.RECEPTIONIST, letanSession.getRole());
        assertFalse(letanSession.isCurrentSession());
        assertTrue(letanSession.getDeviceInfo().contains("iPhone") || letanSession.getDeviceInfo().contains("Safari"));
    }

    @Test
    @DisplayName("NCL-10-CN-007-TC-02: Buộc đăng xuất từ xa một phiên - người dùng bị kết thúc và trả về đúng lý do ở thao tác tiếp theo")
    void testForceLogoutSession_Success() {
        // Lễ tân đăng nhập
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.5");
        req.addHeader("User-Agent", "PostmanRuntime/7.32.3");
        LoginResponse letanLogin = userService.login(new LoginRequest("letan", "pass@123"), req);
        String letanToken = letanLogin.getToken();

        // Kiểm tra token hoạt động bình thường
        User userBefore = authUtil.getUserFromToken(letanToken);
        assertNotNull(userBefore);
        assertEquals("letan", userBefore.getAccount());

        // Admin đăng nhập và buộc đăng xuất phiên của lễ tân
        LoginResponse adminLogin = userService.login(new LoginRequest("admin", "pass@123"), null);
        User adminUser = userRepository.findByAccount("admin").orElseThrow();

        Session letanSession = sessionRepository.findBySession(letanToken).orElseThrow();
        String reason = "Nhân viên quên đăng xuất trên máy chung ở quầy";

        userService.forceLogoutSession(letanSession.getId(), reason, adminUser, adminLogin.getToken());

        // Kiểm tra phiên trong DB đã chuyển REVOKED
        Session afterRevoke = sessionRepository.findById(letanSession.getId()).orElseThrow();
        assertEquals("REVOKED", afterRevoke.getStatus());
        assertEquals(reason, afterRevoke.getRevokedReason());
        assertNotNull(afterRevoke.getRevokedAt());

        // Khi lễ tân thao tác tiếp theo, hệ thống phải ném UnauthorizedException chứa đúng lý do
        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> {
            authUtil.getUserFromToken(letanToken);
        });
        assertTrue(ex.getMessage().contains(reason));
    }

    @Test
    @DisplayName("NCL-10-CN-007-TC-03: Khi đổi vai trò tài khoản, mọi phiên đang mở phải tự động bị kết thúc để quyền cũ không còn hiệu lực")
    void testChangeUserRole_TerminatesAllActiveSessions() {
        // Người dùng buongphong đăng nhập 2 phiên
        LoginResponse session1 = userService.login(new LoginRequest("buongphong", "pass@123"), null);
        LoginResponse session2 = userService.login(new LoginRequest("buongphong", "pass@123"), null);

        // Xác nhận cả 2 phiên ban đầu đều hợp lệ
        assertNotNull(authUtil.getUserFromToken(session1.getToken()));
        assertNotNull(authUtil.getUserFromToken(session2.getToken()));

        User bpUser = userRepository.findByAccount("buongphong").orElseThrow();

        // Quản trị viên đổi vai trò của buongphong sang RECEPTIONIST
        userService.changeUserRole(bpUser.getId(), Role.RECEPTIONIST);

        // Cả 2 phiên cũ phải bị kết thúc lập tức
        UnauthorizedException ex1 = assertThrows(UnauthorizedException.class, () -> {
            authUtil.getUserFromToken(session1.getToken());
        });
        assertTrue(ex1.getMessage().contains("Vai trò tài khoản đã thay đổi"));

        UnauthorizedException ex2 = assertThrows(UnauthorizedException.class, () -> {
            authUtil.getUserFromToken(session2.getToken());
        });
        assertTrue(ex2.getMessage().contains("Vai trò tài khoản đã thay đổi"));
    }

    @Test
    @DisplayName("NCL-10-CN-007-TC-03b: Khi tài khoản bị khóa, mọi phiên đang mở của tài khoản đó phải tự động bị kết thúc")
    void testLockUser_TerminatesAllActiveSessions() {
        LoginResponse loginResp = userService.login(new LoginRequest("buongphong2", "pass@123"), null);
        assertNotNull(authUtil.getUserFromToken(loginResp.getToken()));

        User user = userRepository.findByAccount("buongphong2").orElseThrow();

        // Khóa tài khoản
        userService.lockUser(user.getId());

        // Phiên cũ bị chặn
        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> {
            authUtil.getUserFromToken(loginResp.getToken());
        });
        assertTrue(ex.getMessage().contains("khóa"));
    }

    @Test
    @DisplayName("NCL-10-CN-007-TC-04: Quản trị viên thử buộc đăng xuất chính phiên đang hoạt động của mình thì hệ thống từ chối")
    void testForceLogout_SelfSession_Rejected() {
        LoginResponse adminLogin = userService.login(new LoginRequest("admin", "pass@123"), null);
        User adminUser = userRepository.findByAccount("admin").orElseThrow();
        Session adminSession = sessionRepository.findBySession(adminLogin.getToken()).orElseThrow();

        // Thử buộc đăng xuất chính phiên mình
        BusinessException exSingle = assertThrows(BusinessException.class, () -> {
            userService.forceLogoutSession(adminSession.getId(), "Tự đăng xuất", adminUser, adminLogin.getToken());
        });
        assertTrue(exSingle.getMessage().contains("chính phiên đang hoạt động"));

        // Thử buộc đăng xuất tất cả phiên của chính mình
        BusinessException exAll = assertThrows(BusinessException.class, () -> {
            userService.forceLogoutAllUserSessions(adminUser.getId(), "Tự hủy toàn bộ", adminUser, adminLogin.getToken());
        });
        assertTrue(exAll.getMessage().contains("chính mình"));
    }

    @Test
    @DisplayName("NCL-10-CN-007: Phiên không thao tác quá thời gian cấu hình tự động hết hạn (Session Timeout)")
    void testSessionTimeout_ExpiresAutomatically() {
        LoginResponse loginResp = userService.login(new LoginRequest("ketoan", "pass@123"), null);
        Session session = sessionRepository.findBySession(loginResp.getToken()).orElseThrow();

        // Giả lập phiên không thao tác từ 300 phút trước (vượt quá mặc định 120 phút)
        session.setLastActiveAt(LocalDateTime.now().minusMinutes(300));
        sessionRepository.save(session);

        // Thao tác tiếp theo phải bị từ chối do hết hạn
        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> {
            authUtil.getUserFromToken(loginResp.getToken());
        });
        assertTrue(ex.getMessage().contains("hết hạn"));

        // Trạng thái trong DB phải được đánh dấu EXPIRED
        Session updated = sessionRepository.findById(session.getId()).orElseThrow();
        assertEquals("EXPIRED", updated.getStatus());
    }

    @Test
    @DisplayName("QTN-10: Mọi thao tác buộc đăng xuất từ xa đều được ghi vào Audit Log kèm lý do")
    void testForceLogout_CreatesAuditLog() {
        LoginResponse letanLogin = userService.login(new LoginRequest("letan", "pass@123"), null);
        LoginResponse adminLogin = userService.login(new LoginRequest("admin", "pass@123"), null);
        User adminUser = userRepository.findByAccount("admin").orElseThrow();
        Session letanSession = sessionRepository.findBySession(letanLogin.getToken()).orElseThrow();

        long logCountBefore = auditLogRepository.count();

        userService.forceLogoutSession(letanSession.getId(), "Nghi ngờ lộ mật khẩu", adminUser, adminLogin.getToken());

        long logCountAfter = auditLogRepository.count();
        assertEquals(logCountBefore + 1, logCountAfter);
    }

    @Test
    @DisplayName("Cấu hình phiên: Chế độ 1 phiên duy nhất (maxConcurrentSessions = 1) tự động thu hồi phiên cũ khi đăng nhập thiết bị mới")
    void testMaxConcurrentSessions_SingleSessionMode() {
        plant.stay.model.HotelSetting setting = hotelSettingRepository.findById(1L).orElseGet(() -> plant.stay.model.HotelSetting.builder()
                .propertyName("StayAway Test").address("123").build());
        setting.setMaxConcurrentSessions(1);
        hotelSettingRepository.save(setting);

        LoginResponse login1 = userService.login(new LoginRequest("letan", "pass@123"), null);
        String token1 = login1.getToken();

        // Đăng nhập thiết bị thứ 2
        LoginResponse login2 = userService.login(new LoginRequest("letan", "pass@123"), null);
        String token2 = login2.getToken();

        // Phiên 1 phải bị REVOKED
        Session s1 = sessionRepository.findBySession(token1).orElseThrow();
        assertEquals("REVOKED", s1.getStatus());
        assertTrue(s1.getRevokedReason().contains("thiết bị khác"));

        // Phiên 2 đang ACTIVE
        Session s2 = sessionRepository.findBySession(token2).orElseThrow();
        assertEquals("ACTIVE", s2.getStatus());

        // Reset về không giới hạn (0)
        setting.setMaxConcurrentSessions(0);
        hotelSettingRepository.save(setting);
    }

    @Test
    @DisplayName("Cấu hình phiên: Tự động hết hạn khi vượt quá thời hạn tối đa (maxSessionLifetimeHours)")
    void testMaxSessionLifetime_ExpiresAutomatically() {
        plant.stay.model.HotelSetting setting = hotelSettingRepository.findById(1L).orElseGet(() -> plant.stay.model.HotelSetting.builder()
                .propertyName("StayAway Test").address("123").build());
        setting.setMaxSessionLifetimeHours(12);
        hotelSettingRepository.save(setting);

        LoginResponse loginResp = userService.login(new LoginRequest("letan", "pass@123"), null);
        Session session = sessionRepository.findBySession(loginResp.getToken()).orElseThrow();

        // Giả lập phiên tạo từ 15 giờ trước (vượt quá 12 giờ)
        session.setCreateAt(LocalDateTime.now().minusHours(15));
        sessionRepository.save(session);

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> {
            authUtil.getUserFromToken(loginResp.getToken());
        });
        assertTrue(ex.getMessage().contains("12 giờ"));

        // Reset về mặc định
        setting.setMaxSessionLifetimeHours(24);
        hotelSettingRepository.save(setting);
    }
}
