package plant.stay.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.GuestRequest;
import plant.stay.dto.response.GuestResponse;
import plant.stay.model.Booking;
import plant.stay.model.Guest;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.GuestRepository;
import plant.stay.repository.LoyaltyTierRepository;
import plant.stay.service.impl.GuestServiceImpl;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class GuestServiceTest {

    @Autowired
    private GuestService guestService;

    @Test
    @DisplayName("Tạo thông tin khách hàng mới thành công")
    void testCreateGuestSuccess() {
        GuestRequest request = new GuestRequest();
        request.setName("Phạm Hải Đăng");
        request.setPhone("0981122334");
        request.setIdNumber("001201009988");
        request.setEmail("dang.pham@example.com");

        GuestResponse response = guestService.create(request);

        assertNotNull(response);
        assertNotNull(response.getId());
        assertEquals("Phạm Hải Đăng", response.getName());
        assertEquals("0981122334", response.getPhone());
    }

    @Test
    @DisplayName("Tìm kiếm khách hàng theo từ khóa tên hoặc số điện thoại")
    void testSearchGuests() {
        GuestRequest req1 = new GuestRequest();
        req1.setName("Trần Minh Quân");
        req1.setPhone("0977889900");
        req1.setIdNumber("079201001122");
        guestService.create(req1);

        List<GuestResponse> resultsByName = guestService.getAll("Minh Quân");
        assertNotNull(resultsByName);
        assertFalse(resultsByName.isEmpty());
        assertTrue(resultsByName.stream().anyMatch(g -> g.getName().contains("Minh Quân")));

        List<GuestResponse> resultsByPhone = guestService.getAll("0977889900");
        assertNotNull(resultsByPhone);
        assertFalse(resultsByPhone.isEmpty());
    }

    @Test
    @DisplayName("Cập nhật thông tin khách hàng")
    void testUpdateGuestInfo() {
        GuestRequest createReq = new GuestRequest();
        createReq.setName("Lê Thị Thảo");
        createReq.setPhone("0944556677");
        createReq.setIdNumber("034201004455");
        GuestResponse created = guestService.create(createReq);

        GuestRequest updateReq = new GuestRequest();
        updateReq.setName("Lê Thị Thu Thảo");
        updateReq.setPhone("0944556677");
        updateReq.setIdNumber("034201004455");
        updateReq.setEmail("thuthao@gmail.com");

        GuestResponse updated = guestService.update(created.getId(), updateReq);

        assertEquals("Lê Thị Thu Thảo", updated.getName());
        assertEquals("thuthao@gmail.com", updated.getEmail());
    }

    // ==========================================
    // CÁC TEST MỚI CHO TÍNH NĂNG XÓA KHÁCH HÀNG
    // ==========================================

    @Test
    @DisplayName("Xóa khách hàng thành công (Khách chưa có Booking)")
    void testDeleteGuestSuccess() {
        // Tạo 1 khách mới tinh (chắc chắn chưa có lịch sử đặt phòng)
        GuestRequest request = new GuestRequest();
        request.setName("Khách Cần Xóa");
        request.setPhone("0999999999");
        request.setIdNumber("111111111111");
        GuestResponse created = guestService.create(request);

        // Chạy hàm xóa và đảm bảo không có lỗi nào bị ném ra
        assertDoesNotThrow(() -> {
            guestService.delete(created.getId());
        });
    }

    @Test
    @DisplayName("Bị chặn xóa khi Khách hàng đã có lịch sử đặt phòng (Booking)")
    void testDeleteGuestFailsWithBookings() {
        // Sử dụng Mockito để tạo riêng rẽ một tầng Service mô phỏng
        // Điều này giúp tránh phải tạo dữ liệu Booking giả vào DB rất phức tạp
        GuestRepository mockGuestRepo = Mockito.mock(GuestRepository.class);
        BookingRepository mockBookingRepo = Mockito.mock(BookingRepository.class);
        LoyaltyTierRepository mockLoyaltyRepo = Mockito.mock(LoyaltyTierRepository.class);

        GuestServiceImpl mockGuestService = new GuestServiceImpl(mockGuestRepo, mockBookingRepo, mockLoyaltyRepo);

        // Cài đặt kịch bản: Tìm thấy khách hàng ID = 99
        Guest mockGuest = new Guest();
        mockGuest.setId(99L);
        Mockito.when(mockGuestRepo.findById(99L)).thenReturn(Optional.of(mockGuest));

        // Cài đặt kịch bản: Khách này ĐÃ CÓ lịch sử Booking
        Mockito.when(mockBookingRepo.findByGuestId(99L)).thenReturn(List.of(new Booking()));

        // Chạy hàm xóa và kiểm tra xem có ném ra lỗi IllegalArgumentException không
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            mockGuestService.delete(99L);
        });

        // Kiểm tra xem câu thông báo lỗi có chuẩn xác không
        assertEquals("Khách hàng đang có lịch sử đặt phòng, không thể xóa", exception.getMessage());
    }


}

