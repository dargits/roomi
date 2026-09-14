package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.RoomStayGuestCreateDto;
import plant.stay.dto.response.RoomStayGuestResponseDto;
import plant.stay.dto.response.StayingGuestsSummaryDto;
import plant.stay.model.*;
import plant.stay.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class RoomStayGuestServiceTest {

    @Autowired
    private RoomStayGuestService roomStayGuestService;

    @Autowired
    private GuestRepository guestRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private BookingServiceUsageRepository bookingServiceUsageRepository;

    @Autowired
    private BookingServiceUsageService bookingServiceUsageService;

    private Guest testGuest;
    private RoomType testRoomType;
    private Room testRoom;
    private User testUser;
    private Booking testBooking;

    @BeforeEach
    void setUp() {
        testUser = userRepository.findByAccount("letan")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Lê Ngọc Hân")
                        .account("letan_stay_test")
                        .password("pass123")
                        .role(Role.RECEPTIONIST)
                        .phone("0987654321")
                        .build()));

        testGuest = guestRepository.save(Guest.builder()
                .name("Nguyễn Văn A")
                .phone("0901234567")
                .email("a@gmail.com")
                .idNumber("001200000001")
                .build());

        testRoomType = roomTypeRepository.save(RoomType.builder()
                .name("Phòng Gia Đình Test")
                .basePrice(BigDecimal.valueOf(500000))
                .standardCapacity(2)
                .maxCapacity(4)
                .extraPersonChargePerNight(BigDecimal.valueOf(100000))
                .maxChildAgeFree(6)
                .build());

        testRoom = roomRepository.save(Room.builder()
                .roomNumber("P999")
                .roomType(testRoomType)
                .status(RoomStatus.OCCUPIED)
                .build());

        LocalDate checkIn = LocalDate.now().plusDays(10);
        LocalDate checkOut = checkIn.plusDays(2); // 2 nights

        testBooking = bookingRepository.save(Booking.builder()
                .guest(testGuest)
                .roomType(testRoomType)
                .room(testRoom)
                .checkInDate(checkIn)
                .checkOutDate(checkOut)
                .status(BookingStatus.CHECKED_IN)
                .checkedInAt(LocalDateTime.now())
                .expectedPrice(BigDecimal.valueOf(1000000))
                .actualPrice(BigDecimal.valueOf(1000000))
                .createdBy(testUser)
                .build());

        invoiceRepository.save(Invoice.builder()
                .booking(testBooking)
                .roomAmount(BigDecimal.valueOf(1000000))
                .serviceAmount(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.valueOf(1000000))
                .status(InvoiceStatus.PENDING)
                .createdBy(testUser)
                .build());
    }

    @Test
    @DisplayName("Thêm khách cùng phòng: Tính phụ thu vượt sức chứa tiêu chuẩn chính xác")
    void testAddStayingGuestWithSurcharge() {
        // 1. Khởi tạo người chính: 1 người (tiêu chuẩn 2) -> 0 phụ thu
        List<RoomStayGuestResponseDto> initialGuests = roomStayGuestService.getStayingGuests(testBooking.getId(), testUser);
        assertEquals(1, initialGuests.size());
        assertTrue(initialGuests.get(0).getIsPrimaryGuest());

        StayingGuestsSummaryDto summary1 = roomStayGuestService.getStayingGuestsSummary(testBooking.getId(), testUser);
        assertEquals(1, summary1.getTotalGuests());
        assertEquals(0, summary1.getChargeableExtraGuests());
        assertEquals(0, BigDecimal.ZERO.compareTo(summary1.getTotalExtraCharge()));

        // 2. Thêm khách thứ 2 (Người lớn): Tổng 2 người = Sức chứa tiêu chuẩn (2) -> 0 phụ thu
        roomStayGuestService.addStayingGuest(testBooking.getId(), RoomStayGuestCreateDto.builder()
                .fullName("Trần Thị B")
                .birthYear(1992)
                .documentType("CCCD")
                .documentNumber("001200000002")
                .isChild(false)
                .build(), testUser);

        StayingGuestsSummaryDto summary2 = roomStayGuestService.getStayingGuestsSummary(testBooking.getId(), testUser);
        assertEquals(2, summary2.getTotalGuests());
        assertEquals(0, summary2.getChargeableExtraGuests());
        assertEquals(0, BigDecimal.ZERO.compareTo(summary2.getTotalExtraCharge()));
        assertEquals(0, BigDecimal.valueOf(1000000).compareTo(summary2.getCurrentActualPrice()));

        // 3. Thêm khách thứ 3 (Người lớn): Tổng 3 người > Tiêu chuẩn (2) -> Vượt 1 người
        // Phụ thu: 1 người * 100.000 đ/đêm * 2 đêm = 200.000 đ
        // Giá phòng mới = 1.000.000 + 200.000 = 1.200.000 đ
        RoomStayGuestResponseDto g3 = roomStayGuestService.addStayingGuest(testBooking.getId(), RoomStayGuestCreateDto.builder()
                .fullName("Lê Văn C")
                .birthYear(1990)
                .documentType("CCCD")
                .documentNumber("001200000003")
                .isChild(false)
                .build(), testUser);

        StayingGuestsSummaryDto summary3 = roomStayGuestService.getStayingGuestsSummary(testBooking.getId(), testUser);
        assertEquals(3, summary3.getTotalGuests());
        assertEquals(1, summary3.getChargeableExtraGuests());
        assertEquals(0, BigDecimal.valueOf(100000).compareTo(summary3.getExtraChargePerNight()));
        assertEquals(0, BigDecimal.valueOf(200000).compareTo(summary3.getTotalExtraCharge()));
        assertEquals(0, BigDecimal.valueOf(1200000).compareTo(summary3.getCurrentActualPrice()));

        Booking updatedBooking = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertEquals(0, BigDecimal.valueOf(1000000).compareTo(updatedBooking.getActualPrice()));
        assertTrue(updatedBooking.getNote().contains("Phụ thu vượt tiêu chuẩn: 1 người"));

        // Kiểm tra hóa đơn PENDING
        Invoice inv = invoiceRepository.findByBookingId(testBooking.getId()).orElseThrow();
        assertEquals(0, BigDecimal.valueOf(1000000).compareTo(inv.getRoomAmount()));
        assertEquals(0, BigDecimal.valueOf(200000).compareTo(inv.getServiceAmount()));
        assertEquals(0, BigDecimal.valueOf(1200000).compareTo(inv.getTotalAmount()));

        // Kiểm tra dòng dịch vụ phụ thu được tự động thêm vào booking_service_usages
        List<BookingServiceUsage> usages = bookingServiceUsageRepository.findByBookingId(testBooking.getId());
        assertEquals(1, usages.size());
        BookingServiceUsage surchargeUsage = usages.get(0);
        assertTrue(surchargeUsage.getExtraService().getName().contains("ở ghép"));
        assertEquals(2, surchargeUsage.getQuantity()); // 1 khách x 2 đêm
        assertEquals(0, BigDecimal.valueOf(100000).compareTo(surchargeUsage.getUnitPriceSnapshot()));
        assertTrue(Boolean.TRUE.equals(surchargeUsage.getIsSystemMandatory()));

        // Kiểm tra không thể xóa phụ thu này tại giao diện / API dịch vụ
        assertThrows(IllegalArgumentException.class, () -> {
            bookingServiceUsageService.remove(testBooking.getId(), surchargeUsage.getId(), testUser);
        });

        // 4. Thêm khách thứ 4 là Trẻ em (năm sinh 2022 = 4 tuổi <= 6 tuổi)
        // Tổng 4 người, 1 trẻ em được miễn phụ thu -> Số người tính phụ thu vẫn là 1
        roomStayGuestService.addStayingGuest(testBooking.getId(), RoomStayGuestCreateDto.builder()
                .fullName("Bé Lê Thị D")
                .birthYear(2022)
                .documentType("OTHER")
                .documentNumber("GKS-12345")
                .isChild(true)
                .build(), testUser);

        StayingGuestsSummaryDto summary4 = roomStayGuestService.getStayingGuestsSummary(testBooking.getId(), testUser);
        assertEquals(4, summary4.getTotalGuests());
        assertEquals(1, summary4.getChildCount());
        assertEquals(1, summary4.getChargeableExtraGuests());
        assertEquals(0, BigDecimal.valueOf(200000).compareTo(summary4.getTotalExtraCharge()));

        // 5. Thử thêm khách thứ 5: Vượt sức chứa tối đa (4) -> Phải ném Exception
        assertThrows(IllegalArgumentException.class, () -> {
            roomStayGuestService.addStayingGuest(testBooking.getId(), RoomStayGuestCreateDto.builder()
                    .fullName("Khách Thứ 5")
                    .birthYear(1995)
                    .documentType("CCCD")
                    .documentNumber("001200000005")
                    .build(), testUser);
        });

        // 6. Khách thứ 3 rời sớm -> Số người ở thực tế giảm về 3 (2 người lớn + 1 trẻ em)
        // 2 người lớn = Tiêu chuẩn (2), trẻ em miễn phụ thu -> Phụ thu về 0 đ
        roomStayGuestService.markLeftEarly(testBooking.getId(), g3.getId(), testUser);
        StayingGuestsSummaryDto summaryAfterLeave = roomStayGuestService.getStayingGuestsSummary(testBooking.getId(), testUser);
        assertEquals(3, summaryAfterLeave.getTotalGuests());
        assertEquals(0, summaryAfterLeave.getChargeableExtraGuests());
        assertEquals(0, BigDecimal.ZERO.compareTo(summaryAfterLeave.getTotalExtraCharge()));
        assertEquals(0, BigDecimal.valueOf(1000000).compareTo(summaryAfterLeave.getCurrentActualPrice()));

        Booking finalBooking = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertEquals(0, BigDecimal.valueOf(1000000).compareTo(finalBooking.getActualPrice()));

        // Dòng phụ thu tự động được xóa khỏi booking_service_usages khi không còn người vượt chuẩn
        List<BookingServiceUsage> usagesAfterLeave = bookingServiceUsageRepository.findByBookingId(testBooking.getId());
        assertEquals(0, usagesAfterLeave.size());
    }
}
