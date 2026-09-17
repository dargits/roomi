package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import plant.stay.dto.request.DebtApprovalCreateRequest;
import plant.stay.dto.request.DebtCollectionLogRequest;
import plant.stay.dto.response.DebtAgingBucketDto;
import plant.stay.dto.response.DebtAgingReportResponse;
import plant.stay.dto.response.DebtCollectionLogResponse;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.impl.DebtApprovalServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DebtApprovalServiceImplTest {

    @Mock private DebtApprovalRepository debtApprovalRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private AuditLogService auditLogService;
    @Mock private DebtCollectionLogRepository collectionLogRepository;
    @Mock private NotificationService notificationService;
    @Mock private EmailService emailService;
    @Mock private HotelSettingRepository hotelSettingRepository;
    @Mock private GuestRepository guestRepository;

    private DebtApprovalService debtApprovalService;
    private Booking booking;
    private Invoice invoice;
    private Guest guest;
    private User testUser;

    @BeforeEach
    void setUp() {
        debtApprovalService = new DebtApprovalServiceImpl(
                debtApprovalRepository, bookingRepository, invoiceRepository,
                paymentRepository, roomRepository, auditLogService,
                collectionLogRepository, notificationService,
                emailService, hotelSettingRepository, guestRepository);

        guest = Guest.builder().id(1L).name("Khách có hồ sơ").phone("0900000000").build();
        booking = Booking.builder().id(10L).guest(guest).status(BookingStatus.CHECKED_IN).checkOutDate(LocalDate.now()).build();
        invoice = Invoice.builder()
                .id(20L)
                .booking(booking)
                .totalAmount(new BigDecimal("1000000"))
                .status(InvoiceStatus.PENDING_PAYMENT)
                .build();
        testUser = User.builder().id(99L).name("Kế toán Viên").role(Role.ACCOUNTANT).build();
    }

    @Test
    @DisplayName("Lưu đúng số dư hóa đơn khi đề nghị trả phòng còn nợ")
    void requestDebtCheckoutStoresAuthoritativeInvoiceBalance() {
        stubInvoiceForRequest();
        stubOutstandingBalance();
        DebtApprovalCreateRequest request = requestWithAmount(new BigDecimal("750000"));

        debtApprovalService.requestDebtCheckout(request, User.builder().name("Lễ tân").build());

        ArgumentCaptor<DebtApprovalRequest> captor = ArgumentCaptor.forClass(DebtApprovalRequest.class);
        verify(debtApprovalRepository).save(captor.capture());
        assertEquals(0, new BigDecimal("750000").compareTo(captor.getValue().getDebtAmount()));
    }

    @Test
    @DisplayName("Từ chối đề nghị có số tiền khác số dư hóa đơn")
    void requestDebtCheckoutRejectsMismatchedDebtAmount() {
        stubInvoiceForRequest();
        when(paymentRepository.findByInvoiceId(invoice.getId()))
                .thenReturn(List.of(Payment.builder().amount(new BigDecimal("250000")).build()));
        DebtApprovalCreateRequest request = requestWithAmount(new BigDecimal("700000"));

        assertThrows(IllegalArgumentException.class,
                () -> debtApprovalService.requestDebtCheckout(request, User.builder().name("Lễ tân").build()));

        verify(debtApprovalRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không cho đề nghị trả phòng còn nợ khi hóa đơn chờ duyệt giảm giá")
    void requestDebtCheckoutRejectsPendingDiscountApproval() {
        stubInvoiceForRequest();
        invoice.setStatus(InvoiceStatus.PENDING_DISCOUNT_APPROVAL);

        assertThrows(IllegalArgumentException.class,
                () -> debtApprovalService.requestDebtCheckout(requestWithAmount(new BigDecimal("750000")), User.builder().name("Lễ tân").build()));

        verify(debtApprovalRepository, never()).save(any());
    }

    @Test
    @DisplayName("Phê duyệt nợ trả phòng, chuyển phòng cần dọn và giữ hóa đơn còn nợ")
    void approveDebtCheckoutChecksOutBookingAndKeepsInvoiceOutstanding() {
        Room room = Room.builder().id(30L).roomNumber("101").status(RoomStatus.OCCUPIED).build();
        booking.setRoom(room);
        DebtApprovalRequest approvalRequest = DebtApprovalRequest.builder()
                .id(40L)
                .booking(booking)
                .invoice(invoice)
                .guest(booking.getGuest())
                .debtAmount(new BigDecimal("750000"))
                .dueDate(LocalDate.now().plusDays(7))
                .reason("Khách công ty thanh toán sau")
                .build();
        when(debtApprovalRepository.findById(approvalRequest.getId())).thenReturn(Optional.of(approvalRequest));
        when(paymentRepository.findByInvoiceId(invoice.getId()))
                .thenReturn(List.of(Payment.builder().amount(new BigDecimal("250000")).build()));

        debtApprovalService.approveDebtCheckout(approvalRequest.getId(), User.builder().name("Chủ cơ sở").build());

        assertEquals(BookingStatus.CHECKED_OUT, booking.getStatus());
        assertEquals(RoomStatus.DIRTY, room.getStatus());
        assertEquals(InvoiceStatus.PENDING_PAYMENT, invoice.getStatus());
        assertEquals(plant.stay.model.DebtApprovalStatus.APPROVED, approvalRequest.getStatus());
        verify(roomRepository).save(room);
    }

    // ==========================================
    // CÁC TEST CASES CHO BÁO CÁO TUỔI NỢ & NHẮC THU
    // ==========================================

    @Test
    @DisplayName("Báo cáo phân nhóm tuổi nợ chính xác theo hạn thu cam kết")
    void getDebtAgingReportCalculatesBucketsCorrectly() {
        LocalDate today = LocalDate.now();

        Invoice inv1 = Invoice.builder().id(21L).booking(booking).totalAmount(new BigDecimal("1000000")).status(InvoiceStatus.PENDING_PAYMENT).build();
        Invoice inv2 = Invoice.builder().id(22L).booking(booking).totalAmount(new BigDecimal("2000000")).status(InvoiceStatus.PENDING_PAYMENT).build();
        Invoice inv3 = Invoice.builder().id(23L).booking(booking).totalAmount(new BigDecimal("3000000")).status(InvoiceStatus.PENDING_PAYMENT).build();
        Invoice inv4 = Invoice.builder().id(24L).booking(booking).totalAmount(new BigDecimal("4000000")).status(InvoiceStatus.PENDING_PAYMENT).build();

        // Nợ 1: Trong hạn (hạn thu sau 5 ngày)
        DebtApprovalRequest debt1 = DebtApprovalRequest.builder()
                .id(1L).guest(guest).booking(booking).invoice(inv1)
                .debtAmount(new BigDecimal("1000000")).dueDate(today.plusDays(5))
                .status(DebtApprovalStatus.APPROVED).build();

        // Nợ 2: Quá hạn 5 ngày (nhóm 1-15 ngày)
        DebtApprovalRequest debt2 = DebtApprovalRequest.builder()
                .id(2L).guest(guest).booking(booking).invoice(inv2)
                .debtAmount(new BigDecimal("2000000")).dueDate(today.minusDays(5))
                .status(DebtApprovalStatus.APPROVED).build();

        // Nợ 3: Quá hạn 20 ngày (nhóm 15-30 ngày)
        DebtApprovalRequest debt3 = DebtApprovalRequest.builder()
                .id(3L).guest(guest).booking(booking).invoice(inv3)
                .debtAmount(new BigDecimal("3000000")).dueDate(today.minusDays(20))
                .status(DebtApprovalStatus.APPROVED).build();

        // Nợ 4: Quá hạn 40 ngày (nhóm >30 ngày)
        DebtApprovalRequest debt4 = DebtApprovalRequest.builder()
                .id(4L).guest(guest).booking(booking).invoice(inv4)
                .debtAmount(new BigDecimal("4000000")).dueDate(today.minusDays(40))
                .status(DebtApprovalStatus.APPROVED).build();

        when(debtApprovalRepository.findActiveApprovedDebts())
                .thenReturn(List.of(debt1, debt2, debt3, debt4));
        when(paymentRepository.findByInvoiceId(any())).thenReturn(List.of());
        when(collectionLogRepository.countByDebtApprovalRequestId(any())).thenReturn(0L);

        DebtAgingReportResponse response = debtApprovalService.getDebtAgingReport(today, null, null, null, null, null);

        assertNotNull(response);
        assertEquals(4, response.getTotalInvoices());
        assertEquals(0, new BigDecimal("10000000").compareTo(response.getGrandTotalDebt()));

        // Kiểm tra 4 buckets
        assertEquals(4, response.getBuckets().size());
        DebtAgingBucketDto current = response.getBuckets().stream().filter(b -> "CURRENT".equals(b.getBucketKey())).findFirst().orElseThrow();
        assertEquals(1, current.getInvoiceCount());
        assertEquals(0, new BigDecimal("1000000").compareTo(current.getTotalAmount()));

        DebtAgingBucketDto under15 = response.getBuckets().stream().filter(b -> "OVERDUE_UNDER_15".equals(b.getBucketKey())).findFirst().orElseThrow();
        assertEquals(1, under15.getInvoiceCount());
        assertEquals(0, new BigDecimal("2000000").compareTo(under15.getTotalAmount()));

        DebtAgingBucketDto to30 = response.getBuckets().stream().filter(b -> "OVERDUE_15_TO_30".equals(b.getBucketKey())).findFirst().orElseThrow();
        assertEquals(1, to30.getInvoiceCount());

        DebtAgingBucketDto over30 = response.getBuckets().stream().filter(b -> "OVERDUE_OVER_30".equals(b.getBucketKey())).findFirst().orElseThrow();
        assertEquals(1, over30.getInvoiceCount());

        // Kiểm tra tổng hợp theo khách (cùng 1 khách => 1 group tổng 10tr)
        assertEquals(1, response.getCustomerSummaries().size());
        assertEquals(0, new BigDecimal("10000000").compareTo(response.getCustomerSummaries().get(0).getTotalDebt()));
    }

    @Test
    @DisplayName("Thêm nhật ký đòi nợ thành công và cập nhật denormalized fields trên request")
    void addCollectionLogUpdatesDebtRequestFields() {
        DebtApprovalRequest debt = DebtApprovalRequest.builder()
                .id(50L).guest(guest).booking(booking).invoice(invoice)
                .debtAmount(new BigDecimal("500000")).dueDate(LocalDate.now().minusDays(3))
                .status(DebtApprovalStatus.APPROVED).build();

        when(debtApprovalRepository.findById(50L)).thenReturn(Optional.of(debt));
        when(collectionLogRepository.save(any(DebtCollectionLog.class))).thenAnswer(i -> {
            DebtCollectionLog l = i.getArgument(0);
            l.setId(100L);
            return l;
        });

        DebtCollectionLogRequest request = new DebtCollectionLogRequest();
        request.setContactMethod("PHONE");
        request.setNotes("Khách hẹn chuyển khoản vào ngày 25");
        request.setNextReminderDate(LocalDate.now().plusDays(3));

        DebtCollectionLogResponse result = debtApprovalService.addCollectionLog(50L, request, testUser);

        assertNotNull(result);
        assertEquals("PHONE", result.getContactMethod());
        assertEquals("Khách hẹn chuyển khoản vào ngày 25", result.getNotes());
        assertEquals(LocalDate.now().plusDays(3), debt.getNextReminderDate());
        assertEquals("Khách hẹn chuyển khoản vào ngày 25", debt.getLastContactNote());
        assertNotNull(debt.getLastContactedAt());

        verify(debtApprovalRepository).save(debt);
        verify(auditLogService).log(eq("DebtApprovalRequest"), eq(50L), eq("ADD_COLLECTION_LOG"), eq(testUser), anyString());
    }

    @Test
    @DisplayName("Lấy danh sách nhật ký liên hệ theo ID khoản nợ")
    void getCollectionLogsReturnsList() {
        when(debtApprovalRepository.existsById(50L)).thenReturn(true);

        DebtCollectionLog log1 = DebtCollectionLog.builder()
                .id(101L).debtApprovalRequest(DebtApprovalRequest.builder().id(50L).build())
                .contactMethod("PHONE").contactDate(LocalDateTime.now())
                .notes("Đã gọi").recordedBy(testUser).build();

        when(collectionLogRepository.findByDebtApprovalRequestIdOrderByContactDateDesc(50L))
                .thenReturn(List.of(log1));

        List<DebtCollectionLogResponse> logs = debtApprovalService.getCollectionLogs(50L);

        assertEquals(1, logs.size());
        assertEquals("PHONE", logs.get(0).getContactMethod());
    }

    @Test
    @DisplayName("Gửi thông báo nhắc nợ hàng ngày cho các khoản nợ cần nhắc")
    void sendDailyDebtRemindersGeneratesNotifications() {
        LocalDate today = LocalDate.now();
        DebtApprovalRequest debtNeedReminder = DebtApprovalRequest.builder()
                .id(60L).guest(guest).booking(booking).invoice(invoice)
                .debtAmount(new BigDecimal("1500000")).dueDate(today.minusDays(2))
                .nextReminderDate(today)
                .status(DebtApprovalStatus.APPROVED).build();

        when(debtApprovalRepository.findDebtsNeedingReminder(today))
                .thenReturn(List.of(debtNeedReminder));

        debtApprovalService.sendDailyDebtReminders();

        verify(notificationService).createForRoles(
                eq(NotificationType.DEBT_REMINDER),
                anyString(),
                anyString(),
                eq("DebtApprovalRequest"),
                eq(60L)
        );
    }

    @Test
    @DisplayName("Ghi nhận nhật ký liên hệ với hình thức EMAIL kích hoạt gửi email nhắc nợ")
    void addCollectionLogWithEmailSendsEmail() {
        DebtApprovalRequest debt = DebtApprovalRequest.builder()
                .id(70L).guest(guest).booking(booking).invoice(invoice)
                .debtAmount(new BigDecimal("1000000"))
                .dueDate(LocalDate.now().plusDays(5))
                .status(DebtApprovalStatus.APPROVED).build();

        when(debtApprovalRepository.findById(70L)).thenReturn(Optional.of(debt));
        when(debtApprovalRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(collectionLogRepository.save(any())).thenAnswer(invocation -> {
            DebtCollectionLog log = invocation.getArgument(0);
            log.setId(102L);
            return log;
        });
        when(emailService.sendDebtReminderEmail(anyString(), any())).thenReturn(true);

        DebtCollectionLogRequest req = new DebtCollectionLogRequest();
        req.setContactMethod("EMAIL");
        req.setNotes("Đã gửi email đối soát");
        req.setRecipientEmail("guest@example.com");

        DebtCollectionLogResponse res = debtApprovalService.addCollectionLog(70L, req, testUser);

        assertNotNull(res);
        verify(emailService).sendDebtReminderEmail(eq("guest@example.com"), any());
    }

    @Test
    @DisplayName("Gửi giấy xác nhận công nợ qua email thành công")
    void sendAcknowledgementEmailSuccess() {
        DebtApprovalRequest debt = DebtApprovalRequest.builder()
                .id(80L).guest(guest).booking(booking).invoice(invoice)
                .debtAmount(new BigDecimal("1000000"))
                .dueDate(LocalDate.now().plusDays(5))
                .status(DebtApprovalStatus.APPROVED).build();

        when(debtApprovalRepository.findById(80L)).thenReturn(Optional.of(debt));
        when(emailService.sendDebtAcknowledgementEmail(anyString(), any())).thenReturn(true);

        boolean result = debtApprovalService.sendAcknowledgementEmail(80L, "guest@example.com", testUser);

        assertTrue(result);
        verify(emailService).sendDebtAcknowledgementEmail(eq("guest@example.com"), any());
        verify(auditLogService).log(eq("DebtApprovalRequest"), eq(80L), eq("SEND_ACKNOWLEDGEMENT_EMAIL"), eq(testUser), anyString());
    }

    private DebtApprovalCreateRequest requestWithAmount(BigDecimal debtAmount) {
        DebtApprovalCreateRequest request = new DebtApprovalCreateRequest();
        request.setBookingId(booking.getId());
        request.setDebtAmount(debtAmount);
        request.setDueDate(LocalDate.now().plusDays(7));
        request.setReason("Khách công ty thanh toán sau");
        return request;
    }

    private void stubOutstandingBalance() {
        when(paymentRepository.findByInvoiceId(invoice.getId()))
                .thenReturn(List.of(Payment.builder().amount(new BigDecimal("250000")).build()));
        when(debtApprovalRepository.findFirstByBookingIdAndStatus(any(), any())).thenReturn(Optional.empty());
        when(debtApprovalRepository.save(any(DebtApprovalRequest.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void stubInvoiceForRequest() {
        when(bookingRepository.findById(booking.getId())).thenReturn(Optional.of(booking));
        when(invoiceRepository.findInvoicesCoveringBooking(booking.getId())).thenReturn(List.of(invoice));
    }
}