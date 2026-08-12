package roomi.dev.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;
import roomi.dev.dto.response.BaseResponse;
import roomi.dev.dto.response.UserResponse;
import roomi.dev.model.User;
import roomi.dev.service.ActivityLogService;
import roomi.dev.service.AuthService;
import roomi.dev.service.UserService;
import roomi.dev.util.AuthUtil;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

public class UserControllerTest {

    @Mock
    private AuthUtil authUtil;

    @Mock
    private UserService userService;

    @Mock
    private AuthService authService;

    @Mock
    private ActivityLogService activityLogService;

    @InjectMocks
    private UserController userController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testGetProfile_Success() {
        // Arrange
        User mockUser = new User();
        mockUser.setId(1L);
        mockUser.setUsername("testuser");
        mockUser.setFullName("Test User");
        mockUser.setRole(User.Role.RECEPTIONIST);
        mockUser.setPhone("0123456789");
        mockUser.setActive(true);

        when(authUtil.getUserFromToken(anyString())).thenReturn(mockUser);

        // Act
        ResponseEntity<BaseResponse<UserResponse>> response = userController.getProfile("Bearer fake-token");

        // Assert
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("Thành công", response.getBody().getMess());
        assertEquals("testuser", response.getBody().getData().getUsername());
        assertEquals("Test User", response.getBody().getData().getFullName());
        assertEquals("RECEPTIONIST", response.getBody().getData().getRole());
    }
}
