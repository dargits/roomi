package plant.stay.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import plant.stay.dto.response.PaymentResponse;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.*;
import plant.stay.service.impl.GuestServiceImpl;
import plant.stay.util.AuthUtil;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class PublicInvoiceLookupTest {

    private BookingRequestRepository bookingRequestRepository;
    private RoomTypeRepository roomTypeRepository;
    private RoomRepository roomRepository;
    private BookingRepository bookingRepository;
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

    private BookingPortalController controller;

    @BeforeEach
    public void setup() {
        bookingRequestRepository = Mockito.mock(BookingRequestRepository.class);
        roomTypeRepository = Mockito.mock(RoomTypeRepository.class);
        roomRepository = Mockito.mock(RoomRepository.class);
        bookingRepository = Mockito.mock(BookingRepository.class);
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

        controller = new BookingPortalController(
                bookingRequestRepository, roomTypeRepository, roomRepository, bookingRepository,
                guestRepository, auditLogService, authUtil, guestService, bookingService,
                usageService, invoiceService, depositRepository, pricingService,
                invoiceRepository, hotelSettingRepository, publicGroupBookingRequestRepository
        );

        // Mặc định cho phép tra cứu công khai
        HotelSetting defaultSetting = HotelSetting.builder()
                .id(1L)
                .propertyName("StayAway Hotel")
                .publicInvoiceLookupEnabled(true)
                .build();
        when(hotelSettingRepository.findById(1L)).thenReturn(Optional.of(defaultSetting));
    }

    @Test
    @DisplayName("NCL-09-CN-008-TC-01: Tra cứu đặt phòng có hóa đơn đã thanh toán -> Trả về hóa đơn và ghi audit log")
    public void testTC01_LookupWithPaidInvoice_ShouldReturnInvoiceAndLogAudit() {
        Guest guest = Guest.builder().id(10L).name("Nguyễn Văn A").phone("0912345678").build();
        Booking booking = Booking.builder().id(101L).guest(guest).build();
        when(bookingRepository.findById(101L)).thenReturn(Optional.of(booking));

        Invoice paidInvoice = Invoice.builder()
                .id(501L)
                .booking(booking)
                .status(InvoiceStatus.PAID)
                .roomAmount(new BigDecimal("1500000"))
                .serviceAmount(new BigDecimal("200000"))
                .totalAmount(new BigDecimal("1700000"))
                .createdAt(LocalDateTime.now())
                .build();
        when(invoiceRepository.findInvoicesCoveringBooking(101L)).thenReturn(List.of(paidInvoice));

        PaymentResponse paymentResponse = PaymentResponse.builder()
                .id(801L)
                .amount(new BigDecimal("1700000"))
                .paidAt(LocalDateTime.now())
                .build();
        when(invoiceService.getPayments(501L)).thenReturn(List.of(paymentResponse));

        ResponseEntity<?> response = controller.getPublicBookingInvoice(101L, "0912345678");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body.get("invoice"));
        assertEquals(1, ((List<?>) body.get("payments")).size());

        // Kiểm tra audit log (TC-04)
        verify(auditLogService).log(eq("Invoice"), eq(501L), eq("VIEW_PUBLIC_INVOICE"), isNull(), anyString());
    }

    @Test
    @DisplayName("NCL-09-CN-008-TC-02: Lần lưu trú chỉ có hóa đơn nháp và hóa đơn đã hủy -> Không hiển thị cho khách")
    public void testTC02_LookupWithDraftAndCancelled_ShouldNotReturnInvoices() {
        Guest guest = Guest.builder().id(10L).name("Trần Thị B").phone("0987654321").build();
        Booking booking = Booking.builder().id(102L).guest(guest).build();
        when(bookingRepository.findById(102L)).thenReturn(Optional.of(booking));

        Invoice draftInvoice = Invoice.builder()
                .id(502L)
                .booking(booking)
                .status(InvoiceStatus.DRAFT)
                .totalAmount(new BigDecimal("1000000"))
                .build();
        Invoice cancelledInvoice = Invoice.builder()
                .id(503L)
                .booking(booking)
                .status(InvoiceStatus.CANCELLED)
                .totalAmount(new BigDecimal("1200000"))
                .build();
        when(invoiceRepository.findInvoicesCoveringBooking(102L)).thenReturn(List.of(draftInvoice, cancelledInvoice));

        ResponseEntity<?> response = controller.getPublicBookingInvoice(102L, "0987654321");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNull(body.get("invoice"));
        assertTrue(((List<?>) body.get("invoices")).isEmpty());
    }

    @Test
    @DisplayName("Cấu hình cơ sở: Khi Chủ cơ sở tắt chức năng tra cứu hóa đơn công khai -> Trả về 403 Forbidden")
    public void testToggle_FacilityDisabled_ShouldReturnForbidden() {
        HotelSetting disabledSetting = HotelSetting.builder()
                .id(1L)
                .propertyName("StayAway Hotel")
                .publicInvoiceLookupEnabled(false)
                .build();
        when(hotelSettingRepository.findById(1L)).thenReturn(Optional.of(disabledSetting));

        ResponseEntity<?> response = controller.getPublicBookingInvoice(101L, "0912345678");

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertTrue((Boolean) body.get("disabled"));
    }

    @Test
    @DisplayName("Bảo mật: Nhập sai số điện thoại đăng ký -> Báo lỗi 400 Bad Request")
    public void testPhoneMismatch_ShouldReturnBadRequest() {
        Guest guest = Guest.builder().id(10L).name("Lê Văn C").phone("0912345678").build();
        Booking booking = Booking.builder().id(103L).guest(guest).build();
        when(bookingRepository.findById(103L)).thenReturn(Optional.of(booking));

        ResponseEntity<?> response = controller.getPublicBookingInvoice(103L, "0999999999");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @DisplayName("NCL-09-CN-008: Hóa đơn điều chỉnh hiển thị kèm hóa đơn gốc để khách hiểu mối quan hệ")
    public void testAdjustedInvoice_ShouldReturnBothOriginalAndAdjustment() {
        Guest guest = Guest.builder().id(10L).name("Phạm Văn D").phone("0901234567").build();
        Booking booking = Booking.builder().id(104L).guest(guest).build();
        when(bookingRepository.findById(104L)).thenReturn(Optional.of(booking));

        Invoice original = Invoice.builder()
                .id(504L)
                .booking(booking)
                .status(InvoiceStatus.ADJUSTED)
                .totalAmount(new BigDecimal("2000000"))
                .build();

        Invoice adjusted = Invoice.builder()
                .id(505L)
                .booking(booking)
                .status(InvoiceStatus.PAID)
                .adjustmentOf(original)
                .note("Điều chỉnh giảm 200k do lỗi phòng")
                .totalAmount(new BigDecimal("1800000"))
                .build();

        when(invoiceRepository.findInvoicesCoveringBooking(104L)).thenReturn(List.of(adjusted, original));

        ResponseEntity<?> response = controller.getPublicBookingInvoice(104L, "0901234567");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body.get("originalInvoice"));
        assertNotNull(body.get("adjustmentInvoice"));
    }

    @Test
    @DisplayName("NCL-09-CN-008-TC-04: Ghi nhật ký khi khách in/tải hóa đơn công khai (log-access)")
    public void testTC04_LogPublicInvoiceAccess() {
        Invoice paidInvoice = Invoice.builder()
                .id(506L)
                .status(InvoiceStatus.PAID)
                .build();
        when(invoiceRepository.findById(506L)).thenReturn(Optional.of(paidInvoice));

        ResponseEntity<?> responsePrint = controller.logPublicInvoiceAccess(506L, "PRINT");
        assertEquals(HttpStatus.OK, responsePrint.getStatusCode());
        verify(auditLogService).log(eq("Invoice"), eq(506L), eq("PRINT_PUBLIC_INVOICE"), isNull(), anyString());

        ResponseEntity<?> responseExport = controller.logPublicInvoiceAccess(506L, "EXPORT");
        assertEquals(HttpStatus.OK, responseExport.getStatusCode());
        verify(auditLogService).log(eq("Invoice"), eq(506L), eq("EXPORT_PUBLIC_INVOICE"), isNull(), anyString());
    }
}
