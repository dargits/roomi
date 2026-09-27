package plant.stay.service;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import plant.stay.dto.request.BookingRequestDto;
import plant.stay.dto.request.GroupBookingRoomRequest;
import plant.stay.dto.request.PublicGroupBookingRequestDTO;
import plant.stay.exception.BusinessException;
import plant.stay.model.BookingRequestStatus;
import plant.stay.model.PublicGroupBookingRequestStatus;
import plant.stay.repository.BookingRequestRepository;
import plant.stay.repository.PublicGroupBookingRequestRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

public class PublicBookingAntiSpamServiceTest {

    private BookingRequestRepository bookingRequestRepository;
    private PublicGroupBookingRequestRepository publicGroupBookingRequestRepository;
    private PublicBookingAntiSpamService antiSpamService;
    private HttpServletRequest mockRequest;

    @BeforeEach
    public void setup() {
        bookingRequestRepository = Mockito.mock(BookingRequestRepository.class);
        publicGroupBookingRequestRepository = Mockito.mock(PublicGroupBookingRequestRepository.class);
        antiSpamService = new PublicBookingAntiSpamService(bookingRequestRepository, publicGroupBookingRequestRepository);
        antiSpamService.clearRateLimits();

        mockRequest = Mockito.mock(HttpServletRequest.class);
        when(mockRequest.getRemoteAddr()).thenReturn("192.168.1.100");
    }

    private BookingRequestDto createValidDto() {
        BookingRequestDto dto = new BookingRequestDto();
        dto.setGuestName("Nguyễn Văn An");
        dto.setPhone("0912345678");
        dto.setEmail("an.nguyen@gmail.com");
        dto.setRoomTypeId(1L);
        dto.setCheckInDate(LocalDate.now().plusDays(1));
        dto.setCheckOutDate(LocalDate.now().plusDays(3));
        dto.setSubmissionElapsedMs(5000L); // 5 giây (hợp lệ)
        dto.setWebsiteTrap(null); // Không bị bot điền
        return dto;
    }

    @Test
    @DisplayName("Hợp lệ: Yêu cầu đặt phòng bình thường phải vượt qua kiểm tra")
    public void testValidBookingRequest_Success() {
        BookingRequestDto dto = createValidDto();
        when(bookingRequestRepository.countByPhoneAndStatus(anyString(), eq(BookingRequestStatus.PENDING))).thenReturn(0L);
        when(bookingRequestRepository.existsByPhoneAndRoomTypeIdAndCheckInDateAndCreatedAtAfter(anyString(), anyLong(), any(), any()))
                .thenReturn(false);

        assertDoesNotThrow(() -> antiSpamService.validateIndividualBooking(dto, mockRequest));
    }

    @Test
    @DisplayName("Bẫy Honeypot: Nếu bot tự động điền trường ẩn -> Chặn ngay lập tức (BAD_REQUEST)")
    public void testHoneypotTrap_ShouldThrowBadRequest() {
        BookingRequestDto dto = createValidDto();
        dto.setWebsiteTrap("http://spam-link.xyz");

        BusinessException ex = assertThrows(BusinessException.class, () ->
                antiSpamService.validateIndividualBooking(dto, mockRequest)
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getHttpStatus());
        assertTrue(ex.getMessage().contains("bất thường"));
    }

    @Test
    @DisplayName("Tốc độ submit bất thường: Điền form nhanh < 2 giây -> Chặn bot (TOO_MANY_REQUESTS)")
    public void testSubmissionTooFast_ShouldThrowTooManyRequests() {
        BookingRequestDto dto = createValidDto();
        dto.setSubmissionElapsedMs(800L); // 800ms -> quá nhanh đối với con người

        BusinessException ex = assertThrows(BusinessException.class, () ->
                antiSpamService.validateIndividualBooking(dto, mockRequest)
        );
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getHttpStatus());
        assertTrue(ex.getMessage().contains("quá nhanh"));
    }

    @Test
    @DisplayName("IP Cooldown: Gửi liên tiếp 2 lần từ 1 IP trong vòng < 8 giây -> Chặn (TOO_MANY_REQUESTS)")
    public void testIpCooldown_ShouldThrowTooManyRequests() {
        BookingRequestDto dto = createValidDto();
        when(bookingRequestRepository.countByPhoneAndStatus(anyString(), eq(BookingRequestStatus.PENDING))).thenReturn(0L);
        when(bookingRequestRepository.existsByPhoneAndRoomTypeIdAndCheckInDateAndCreatedAtAfter(anyString(), anyLong(), any(), any()))
                .thenReturn(false);

        // Lần 1: Thành công
        antiSpamService.validateIndividualBooking(dto, mockRequest);

        // Lần 2: Ngay lập tức từ cùng IP -> Vi phạm Cooldown
        BusinessException ex = assertThrows(BusinessException.class, () ->
                antiSpamService.validateIndividualBooking(dto, mockRequest)
        );
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getHttpStatus());
        assertTrue(ex.getMessage().contains("quá nhanh"));
    }

    @Test
    @DisplayName("Giới hạn số yêu cầu PENDING theo số điện thoại: >= 3 đơn chờ -> Chặn (TOO_MANY_REQUESTS)")
    public void testPhonePendingLimit_ShouldThrowTooManyRequests() {
        BookingRequestDto dto = createValidDto();
        when(bookingRequestRepository.countByPhoneAndStatus("0912345678", BookingRequestStatus.PENDING)).thenReturn(3L);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                antiSpamService.validateIndividualBooking(dto, mockRequest)
        );
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getHttpStatus());
        assertTrue(ex.getMessage().contains("3 yêu cầu đặt phòng đang chờ"));
    }

    @Test
    @DisplayName("Trùng lặp: Gửi lại cùng SĐT, cùng loại phòng, cùng ngày nhận trong 5 phút -> Chặn (CONFLICT)")
    public void testDuplicateBookingRequest_ShouldThrowConflict() {
        BookingRequestDto dto = createValidDto();
        when(bookingRequestRepository.countByPhoneAndStatus(anyString(), eq(BookingRequestStatus.PENDING))).thenReturn(0L);
        when(bookingRequestRepository.existsByPhoneAndRoomTypeIdAndCheckInDateAndCreatedAtAfter(
                eq("0912345678"), eq(1L), eq(dto.getCheckInDate()), any(LocalDateTime.class)
        )).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                antiSpamService.validateIndividualBooking(dto, mockRequest)
        );
        assertEquals(HttpStatus.CONFLICT, ex.getHttpStatus());
        assertTrue(ex.getMessage().contains("trùng lặp"));
    }

    @Test
    @DisplayName("Đặt phòng đoàn: Kiểm tra chống spam cho group booking")
    public void testGroupBookingAntiSpam_SuccessAndPendingLimit() {
        PublicGroupBookingRequestDTO groupDto = new PublicGroupBookingRequestDTO();
        groupDto.setRepresentativeName("Trần Doanh Nghiệp");
        groupDto.setPhone("0988776655");
        groupDto.setCheckInDate(LocalDate.now().plusDays(5));
        groupDto.setCheckOutDate(LocalDate.now().plusDays(7));
        groupDto.setSubmissionElapsedMs(6000L);
        groupDto.setRooms(List.of(new GroupBookingRoomRequest(1L, 2)));

        // Khi có >= 2 đơn đoàn PENDING
        when(publicGroupBookingRequestRepository.countByPhoneAndStatus("0988776655", PublicGroupBookingRequestStatus.PENDING)).thenReturn(2L);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                antiSpamService.validateGroupBooking(groupDto, mockRequest)
        );
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getHttpStatus());
        assertTrue(ex.getMessage().contains("đặt phòng đoàn đang chờ"));
    }
}
