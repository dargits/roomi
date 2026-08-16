package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.HotelSettingRequest;
import plant.stay.dto.response.HotelSettingResponse;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.UserRepository;

import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class HotelSettingServiceTest {

    @Autowired
    private HotelSettingService hotelSettingService;

    @Autowired
    private UserRepository userRepository;

    private User adminUser;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.findByAccount("admin")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Quản Trị Viên")
                        .account("admin_hotel_test")
                        .password("pass123")
                        .role(Role.ADMIN)
                        .phone("0900000001")
                        .build()));
    }

    @Test
    @DisplayName("Lấy cấu hình thông tin khách sạn mặc định")
    void testGetHotelSetting() {
        HotelSettingResponse setting = hotelSettingService.getSetting();
        assertNotNull(setting);
        assertNotNull(setting.getPropertyName());
        assertNotNull(setting.getDefaultCheckinTime());
        assertNotNull(setting.getDefaultCheckoutTime());
    }

    @Test
    @DisplayName("Cập nhật thông tin khách sạn và giờ check-in / check-out")
    void testUpdateHotelSettingSuccess() {
        HotelSettingRequest request = new HotelSettingRequest();
        request.setPropertyName("StayAway Boutique Hotel Đà Lạt");
        request.setAddress("123 Đường Mai Anh Đào, Đà Lạt");
        request.setPhone("02633888999");
        request.setEmail("contact@stayaway.vn");
        request.setDefaultCheckinTime(LocalTime.of(14, 0));
        request.setDefaultCheckoutTime(LocalTime.of(12, 0));

        // Note: HotelSettingServiceImpl has validation check:
        // if (!request.getDefaultCheckoutTime().isAfter(request.getDefaultCheckinTime()))
        // If 12:00 is not after 14:00 (since 12 < 14 in LocalTime), let's test valid time:
        request.setDefaultCheckinTime(LocalTime.of(12, 0));
        request.setDefaultCheckoutTime(LocalTime.of(14, 0));

        HotelSettingResponse updated = hotelSettingService.updateSetting(request, adminUser);

        assertNotNull(updated);
        assertEquals("StayAway Boutique Hotel Đà Lạt", updated.getPropertyName());
        assertEquals("123 Đường Mai Anh Đào, Đà Lạt", updated.getAddress());
        assertEquals(LocalTime.of(12, 0), updated.getDefaultCheckinTime());
        assertEquals(LocalTime.of(14, 0), updated.getDefaultCheckoutTime());
    }
}
