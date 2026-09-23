package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import plant.stay.model.*;
import plant.stay.repository.NotificationRepository;
import plant.stay.repository.NotificationUserPrefRepository;
import plant.stay.repository.UserRepository;
import plant.stay.service.impl.NotificationServiceImpl;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class NotificationServiceImplTest {

    private NotificationRepository notificationRepository;
    private NotificationUserPrefRepository userPrefRepository;
    private UserRepository userRepository;
    private NotificationServiceImpl notificationService;

    private User mockUser;

    @BeforeEach
    public void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        userPrefRepository = mock(NotificationUserPrefRepository.class);
        userRepository = mock(UserRepository.class);

        notificationService = new NotificationServiceImpl(
                notificationRepository,
                userPrefRepository,
                userRepository
        );

        mockUser = new User();
        mockUser.setId(10L);
        mockUser.setAccount("receptionist");
        mockUser.setRole(Role.RECEPTIONIST);
        mockUser.setActive(true);
    }

    @Test
    @DisplayName("Test: createForUser saves notification")
    public void testCreateForUserSuccess() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(mockUser));

        notificationService.createForUser(10L, NotificationType.CHECKIN_TODAY, "Khách đến", "Khách vừa check-in", "BOOKING", 50L);

        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    @DisplayName("Test: createForRoles delivers notification to active users of matching role")
    public void testCreateForRoles() {
        User user1 = new User();
        user1.setId(1L);
        user1.setRole(Role.OWNER);
        user1.setActive(true);

        User user2 = new User();
        user2.setId(2L);
        user2.setRole(Role.RECEPTIONIST);
        user2.setActive(true);

        when(userRepository.findAll()).thenReturn(List.of(user1, user2));

        notificationService.createForRoles(NotificationType.INVOICE_DISCOUNT_APPROVAL, "Giảm giá", "Yêu cầu duyệt", "INVOICE", 100L);

        // INVOICE_DISCOUNT_APPROVAL target role contains OWNER
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    @DisplayName("Test: countUnread returns correct number")
    public void testCountUnread() {
        when(notificationRepository.countByUserIdAndIsReadFalse(10L)).thenReturn(5L);

        long count = notificationService.countUnread(10L);
        assertEquals(5L, count);
    }

    @Test
    @DisplayName("Test: markRead updates isRead to true")
    public void testMarkRead() {
        Notification notification = Notification.builder()
                .id(100L)
                .user(mockUser)
                .isRead(false)
                .build();

        when(notificationRepository.findById(100L)).thenReturn(Optional.of(notification));

        notificationService.markRead(10L, 100L);

        assertTrue(notification.getIsRead());
        verify(notificationRepository, times(1)).save(notification);
    }

    @Test
    @DisplayName("Test: markRead throws IllegalArgumentException if user doesn't own notification")
    public void testMarkReadUnauthorizedUser() {
        User otherUser = new User();
        otherUser.setId(99L);

        Notification notification = Notification.builder()
                .id(101L)
                .user(otherUser)
                .isRead(false)
                .build();

        when(notificationRepository.findById(101L)).thenReturn(Optional.of(notification));

        assertThrows(IllegalArgumentException.class, () -> {
            notificationService.markRead(10L, 101L);
        });
    }

    @Test
    @DisplayName("Test: markAllRead triggers repository batch update")
    public void testMarkAllRead() {
        notificationService.markAllRead(10L);
        verify(notificationRepository, times(1)).markAllReadByUserId(10L);
    }

    @Test
    @DisplayName("Test: updateUserPreference toggles preference for non-mandatory notification")
    public void testUpdateUserPreference() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(mockUser));
        when(userPrefRepository.findByUserIdAndType(10L, NotificationType.CHECKIN_TODAY)).thenReturn(Optional.empty());

        notificationService.updateUserPreference(10L, NotificationType.CHECKIN_TODAY, false);

        verify(userPrefRepository, times(1)).save(any(NotificationUserPref.class));
    }
}
