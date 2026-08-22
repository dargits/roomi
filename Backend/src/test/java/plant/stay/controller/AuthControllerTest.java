package plant.stay.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import plant.stay.dto.request.LoginRequest;
import plant.stay.dto.request.RegisterRequest;
import plant.stay.dto.response.LoginResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.UserService;
import plant.stay.util.AuthUtil;

import jakarta.servlet.http.HttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

public class AuthControllerTest {

    @Test
    @DisplayName("Test: OWNER or ADMIN can register new users")
    public void testAdminCanRegisterUser() {
        AuthUtil authUtil = Mockito.mock(AuthUtil.class);
        UserService userService = Mockito.mock(UserService.class);
        AuthController controller = new AuthController(userService, authUtil);

        User mockOwner = new User();
        mockOwner.setRole(Role.OWNER);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockOwner);

        MessageResponse successResponse = new MessageResponse("Đăng ký thành công");
        Mockito.when(userService.register(any())).thenReturn(successResponse);

        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        RegisterRequest registerRequest = new RegisterRequest();

        ResponseEntity<MessageResponse> response = controller.register(registerRequest, request);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("Đăng ký thành công", response.getBody().getMessage());
    }

    @Test
    @DisplayName("Test: RECEPTIONIST cannot register new users")
    public void testReceptionistCannotRegisterUser() {
        AuthUtil authUtil = Mockito.mock(AuthUtil.class);
        UserService userService = Mockito.mock(UserService.class);
        AuthController controller = new AuthController(userService, authUtil);

        User mockStaff = new User();
        mockStaff.setRole(Role.RECEPTIONIST);
        Mockito.when(authUtil.getUserFromRequest(any())).thenReturn(mockStaff);

        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        RegisterRequest registerRequest = new RegisterRequest();

        assertThrows(UnauthorizedException.class, () -> {
            controller.register(registerRequest, request);
        });
    }

    @Test
    @DisplayName("Test: Login success returns token")
    public void testLoginSuccess() {
        AuthUtil authUtil = Mockito.mock(AuthUtil.class);
        UserService userService = Mockito.mock(UserService.class);
        AuthController controller = new AuthController(userService, authUtil);

        plant.stay.dto.response.UserResponse userResponse = new plant.stay.dto.response.UserResponse();
        userResponse.setName("User");
        userResponse.setRole(Role.RECEPTIONIST);
        LoginResponse mockResponse = new LoginResponse("mock-token", userResponse);
        Mockito.when(userService.login(any())).thenReturn(mockResponse);

        LoginRequest loginRequest = new LoginRequest();
        ResponseEntity<LoginResponse> response = controller.login(loginRequest);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("mock-token", response.getBody().getToken());
    }
}
