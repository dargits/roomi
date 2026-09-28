package plant.stay.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import plant.stay.dto.response.RoomTypeResponse;
import plant.stay.model.Room;
import plant.stay.model.RoomStatus;
import plant.stay.model.RoomType;
import plant.stay.repository.*;
import plant.stay.service.*;
import plant.stay.service.impl.GuestServiceImpl;
import plant.stay.service.impl.RoomTypeServiceImpl;
import plant.stay.util.AuthUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class PublicRoomAvailabilityDirtyExclusionTest {

    private RoomTypeRepository roomTypeRepository;
    private RoomRepository roomRepository;
    private BookingRepository bookingRepository;
    private BookingRequestRepository bookingRequestRepository;
    private GuestRepository guestRepository;
    private AuditLogService auditLogService;
    private AuthUtil authUtil;
    private GuestServiceImpl guestService;
    private BookingService bookingService;
    private BookingServiceUsageService usageService;
    private InvoiceService invoiceService;
    private DepositRepository depositRepository;
    private PricingService pricingService;
    private InvoiceRepository invoiceRepository;
    private HotelSettingRepository hotelSettingRepository;
    private PublicGroupBookingRequestRepository publicGroupBookingRequestRepository;
    private PublicBookingAntiSpamService antiSpamService;

    private RoomTypeServiceImpl roomTypeService;
    private BookingPortalController bookingPortalController;

    private RoomType deluxeRoomType;
    private Room cleanRoom;
    private Room dirtyRoom;
    private Room maintenanceRoom;

    @BeforeEach
    void setUp() {
        roomTypeRepository = Mockito.mock(RoomTypeRepository.class);
        roomRepository = Mockito.mock(RoomRepository.class);
        bookingRepository = Mockito.mock(BookingRepository.class);
        bookingRequestRepository = Mockito.mock(BookingRequestRepository.class);
        guestRepository = Mockito.mock(GuestRepository.class);
        auditLogService = Mockito.mock(AuditLogService.class);
        authUtil = Mockito.mock(AuthUtil.class);
        guestService = Mockito.mock(GuestServiceImpl.class);
        bookingService = Mockito.mock(BookingService.class);
        usageService = Mockito.mock(BookingServiceUsageService.class);
        invoiceService = Mockito.mock(InvoiceService.class);
        depositRepository = Mockito.mock(DepositRepository.class);
        pricingService = Mockito.mock(PricingService.class);
        invoiceRepository = Mockito.mock(InvoiceRepository.class);
        hotelSettingRepository = Mockito.mock(HotelSettingRepository.class);
        publicGroupBookingRequestRepository = Mockito.mock(PublicGroupBookingRequestRepository.class);
        antiSpamService = Mockito.mock(PublicBookingAntiSpamService.class);

        roomTypeService = new RoomTypeServiceImpl();
        ReflectionTestUtils.setField(roomTypeService, "roomTypeRepository", roomTypeRepository);
        ReflectionTestUtils.setField(roomTypeService, "roomRepository", roomRepository);
        ReflectionTestUtils.setField(roomTypeService, "bookingRepository", bookingRepository);
        ReflectionTestUtils.setField(roomTypeService, "pricingService", pricingService);

        bookingPortalController = new BookingPortalController(
                bookingRequestRepository, roomTypeRepository, roomRepository, bookingRepository,
                guestRepository, auditLogService, authUtil, guestService, bookingService,
                usageService, invoiceService, depositRepository, pricingService,
                invoiceRepository, hotelSettingRepository, publicGroupBookingRequestRepository,
                antiSpamService
        );

        deluxeRoomType = RoomType.builder()
                .id(1L)
                .name("Deluxe Room")
                .basePrice(new BigDecimal("1000000"))
                .active(true)
                .build();

        cleanRoom = Room.builder().id(101L).roomNumber("101").roomType(deluxeRoomType).status(RoomStatus.AVAILABLE).build();
        dirtyRoom = Room.builder().id(102L).roomNumber("102").roomType(deluxeRoomType).status(RoomStatus.DIRTY).build();
        maintenanceRoom = Room.builder().id(103L).roomNumber("103").roomType(deluxeRoomType).status(RoomStatus.MAINTENANCE).build();
    }

    @Test
    @DisplayName("RoomTypeService.getActiveRoomTypes: Không tính phòng DIRTY vào số lượng availableRoomsToday ngoài trang chủ")
    void testGetActiveRoomTypesExcludesDirtyRoomsFromAvailableToday() {
        when(roomTypeRepository.findByActiveTrue()).thenReturn(List.of(deluxeRoomType));
        // 3 phòng: 1 clean, 1 dirty, 1 maintenance. Không có booking trùng
        when(roomRepository.findByRoomTypeId(1L)).thenReturn(List.of(cleanRoom, dirtyRoom, maintenanceRoom));
        when(bookingRepository.findActiveOverlappingByRoomTypeAndRange(eq(1L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        List<RoomTypeResponse> responses = roomTypeService.getActiveRoomTypes();

        assertEquals(1, responses.size());
        RoomTypeResponse resp = responses.get(0);
        assertEquals(3L, resp.getTotalRooms(), "Tổng số phòng vật lý là 3");
        // Chỉ có 1 phòng sạch (AVAILABLE). Phòng DIRTY và MAINTENANCE không được tính vào phòng trống khả dụng!
        assertEquals(1L, resp.getAvailableRoomsToday(), "Phòng DIRTY phải bị loại khỏi số lượng phòng trống khả dụng hôm nay");
        assertTrue(resp.getIsAvailableToday());
    }

    @Test
    @DisplayName("RoomTypeService.getActiveRoomTypes: Khi toàn bộ phòng còn lại là DIRTY thì trang chủ báo hết phòng (0)")
    void testGetActiveRoomTypesSoldOutWhenAllRemainingRoomsAreDirty() {
        when(roomTypeRepository.findByActiveTrue()).thenReturn(List.of(deluxeRoomType));
        // 2 phòng đều DIRTY
        when(roomRepository.findByRoomTypeId(1L)).thenReturn(List.of(dirtyRoom, Room.builder().id(104L).roomType(deluxeRoomType).status(RoomStatus.DIRTY).build()));
        when(bookingRepository.findActiveOverlappingByRoomTypeAndRange(eq(1L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        List<RoomTypeResponse> responses = roomTypeService.getActiveRoomTypes();

        assertEquals(1, responses.size());
        RoomTypeResponse resp = responses.get(0);
        assertEquals(2L, resp.getTotalRooms());
        assertEquals(0L, resp.getAvailableRoomsToday(), "Khi tất cả phòng là DIRTY, số phòng trống khả dụng phải là 0");
        assertFalse(resp.getIsAvailableToday(), "Trạng thái khả dụng hôm nay phải là false (Hết phòng)");
    }

    @Test
    @DisplayName("BookingPortalController.availability: Tìm kiếm phòng từ ngày hôm nay không tính phòng DIRTY vào availableRooms")
    void testPublicAvailabilityExcludesDirtyRoomsForToday() {
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        when(roomTypeRepository.findByActiveTrue()).thenReturn(List.of(deluxeRoomType));
        when(pricingService.calculateTotalPrice(any(), any(), any())).thenReturn(new BigDecimal("1000000"));
        when(pricingService.calculateNightPrice(any(), any())).thenReturn(
                plant.stay.dto.response.NightlyPriceDetailDto.builder()
                        .appliedPrice(new BigDecimal("1000000"))
                        .priceSource("BASE")
                        .sourceName("Giá cơ bản")
                        .build()
        );
        when(roomRepository.countByRoomTypeId(1L)).thenReturn(3L);
        when(roomRepository.findByRoomTypeId(1L)).thenReturn(List.of(cleanRoom, dirtyRoom, maintenanceRoom));
        when(bookingRepository.findActiveOverlappingByRoomTypeAndRange(eq(1L), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        ResponseEntity<?> response = bookingPortalController.availability(today, tomorrow);
        assertNotNull(response.getBody());
        List<Map<String, Object>> items = (List<Map<String, Object>>) response.getBody();
        assertEquals(1, items.size());

        Map<String, Object> item = items.get(0);
        assertEquals(3L, item.get("totalPhysicalRooms"));
        assertEquals(1L, item.get("availableRooms"), "Số phòng trống khả dụng cho ngày hôm nay phải là 1 (không tính phòng DIRTY)");
        assertEquals(true, item.get("isAvailable"));
    }
}
