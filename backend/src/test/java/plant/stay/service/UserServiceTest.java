package plant.stay.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.LoginRequest;
import plant.stay.dto.request.RegisterRequest;
import plant.stay.dto.response.LoginResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.DuplicateResourceException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class UserServiceTest {

    @Autowired
    private UserService userService;

    @Test
    @DisplayName("Đăng nhập thành công với tài khoản mặc định và trả về session token")
    void testLoginSuccess() {
        LoginRequest request = new LoginRequest();
        request.setAccount("letan");
        request.setPassword("pass@123");

        LoginResponse response = userService.login(request);

        assertNotNull(response);
        assertNotNull(response.getToken());
        assertEquals("letan", response.getUser().getAccount());
        assertEquals(Role.RECEPTIONIST, response.getUser().getRole());
    }

    @Test
    @DisplayName("Đăng nhập thất bại khi sai mật khẩu")
    void testLoginWrongPassword() {
        LoginRequest request = new LoginRequest();
        request.setAccount("letan");
        request.setPassword("wrong_password");

        assertThrows(UnauthorizedException.class, () -> {
            userService.login(request);
        });
    }

    @Test
    @DisplayName("Đăng ký tài khoản nhân viên mới thành công")
    void testRegisterUserSuccess() {
        RegisterRequest request = new RegisterRequest();
        request.setAccount("nhanvien_moi");
        request.setPassword("pass@123");
        request.setName("Nhân Viên Mới");
        request.setEmail("nhanvien_moi@stayaway.com");
        request.setPhone("0911223344");
        request.setRole(Role.HOUSEKEEPER);

        MessageResponse response = userService.register(request);

        assertNotNull(response);
        assertTrue(response.getMessage().contains("thành công"));
    }

    @Test
    @DisplayName("Báo lỗi DuplicateResourceException khi đăng ký trùng tài khoản")
    void testRegisterDuplicateAccount() {
        RegisterRequest request = new RegisterRequest();
        request.setAccount("letan"); // Account already exists from data seeder
        request.setPassword("pass@123");
        request.setName("Lễ Tân 2");
        request.setEmail("letan2@stayaway.com");
        request.setPhone("0988776655");
        request.setRole(Role.RECEPTIONIST);

        assertThrows(DuplicateResourceException.class, () -> {
            userService.register(request);
        });
    }
}
