package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import plant.stay.dto.request.ApplyDiscountRequest;
import plant.stay.dto.request.RejectDiscountRequest;
import plant.stay.dto.response.DiscountResponse;
import plant.stay.exception.BusinessException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.impl.InvoiceDiscountServiceImpl;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class InvoiceDiscountServiceImplTest {

    private InvoiceRepository invoiceRepository;
    private InvoiceDiscountRepository discountRepository;
    private HotelSettingRepository hotelSettingRepository;
    private PaymentRepository paymentRepository;
    private DepositRepository depositRepository;
    private AuditLogService auditLogService;
    private NotificationService notificationService;
    private InvoiceDiscountServiceImpl invoiceDiscountService;

    private User mockStaff;
    private User mockOwner;
    private Invoice mockInvoice;

    @BeforeEach
    public void setUp() {
        invoiceRepository = mock(InvoiceRepository.class);
        discountRepository = mock(InvoiceDiscountRepository.class);
        hotelSettingRepository = mock(HotelSettingRepository.class);
        paymentRepository = mock(PaymentRepository.class);
        depositRepository = mock(DepositRepository.class);
        auditLogService = mock(AuditLogService.class);
        notificationService = mock(NotificationService.class);

        invoiceDiscountService = new InvoiceDiscountServiceImpl(
                invoiceRepository,
                discountRepository,
                hotelSettingRepository,
                paymentRepository,
                depositRepository,
                auditLogService,
                notificationService
        );

        mockStaff = new User();
        mockStaff.setId(2L);
        mockStaff.setName("Staff");
        mockStaff.setRole(Role.RECEPTIONIST);

        mockOwner = new User();
        mockOwner.setId(1L);
        mockOwner.setName("Owner");
        mockOwner.setRole(Role.OWNER);

        mockInvoice = new Invoice();
        mockInvoice.setId(100L);
        mockInvoice.setRoomAmount(new BigDecimal("1000000"));
        mockInvoice.setServiceAmount(new BigDecimal("200000"));
        mockInvoice.setTotalAmount(new BigDecimal("1200000"));
        mockInvoice.setDiscountAmount(BigDecimal.ZERO);
        mockInvoice.setStatus(InvoiceStatus.PENDING);
    }

    @Test
    @DisplayName("Test: applyDiscount auto-approved when calculatedAmount below threshold")
    public void testApplyDiscountAutoApprove() {
        when(invoiceRepository.findById(100L)).thenReturn(Optional.of(mockInvoice));
        when(discountRepository.existsActiveByInvoiceId(100L, DiscountStatus.REJECTED)).thenReturn(false);
        when(paymentRepository.findByInvoiceId(100L)).thenReturn(Collections.emptyList());

        HotelSetting setting = new HotelSetting();
        setting.setDiscountApprovalThreshold(new BigDecimal("500000")); // Ngưỡng 500k
        when(hotelSettingRepository.findAll()).thenReturn(List.of(setting));

        ApplyDiscountRequest req = new ApplyDiscountRequest();
        req.setDiscountType(DiscountType.FIXED_AMOUNT);
        req.setDiscountValue(new BigDecimal("100000")); // 100k < 500k -> auto-approve
        req.setReason("Khách thân thiết");

        when(discountRepository.save(any(InvoiceDiscount.class))).thenAnswer(inv -> {
            InvoiceDiscount d = inv.getArgument(0);
            d.setId(1L);
            return d;
        });

        DiscountResponse res = invoiceDiscountService.applyDiscount(100L, req, mockStaff);

        assertNotNull(res);
        assertEquals(DiscountStatus.APPLIED, res.getStatus());
        assertEquals(0, new BigDecimal("100000").compareTo(res.getCalculatedAmount()));
        assertEquals(InvoiceStatus.PENDING, mockInvoice.getStatus());
        assertEquals(0, new BigDecimal("1100000").compareTo(mockInvoice.getTotalAmount()));
        verify(auditLogService, times(1)).log(eq("InvoiceDiscount"), anyLong(), eq("APPLY_DISCOUNT"), eq(mockStaff), anyString());
    }

    @Test
    @DisplayName("Test: applyDiscount requires approval when exceeding threshold")
    public void testApplyDiscountRequiresApproval() {
        when(invoiceRepository.findById(100L)).thenReturn(Optional.of(mockInvoice));
        when(discountRepository.existsActiveByInvoiceId(100L, DiscountStatus.REJECTED)).thenReturn(false);
        when(paymentRepository.findByInvoiceId(100L)).thenReturn(Collections.emptyList());

        HotelSetting setting = new HotelSetting();
        setting.setDiscountApprovalThreshold(new BigDecimal("200000"));
        when(hotelSettingRepository.findAll()).thenReturn(List.of(setting));

        ApplyDiscountRequest req = new ApplyDiscountRequest();
        req.setDiscountType(DiscountType.FIXED_AMOUNT);
        req.setDiscountValue(new BigDecimal("300000")); // 300k >= 200k -> Pending approval
        req.setReason("Lỗi dịch vụ phòng");

        when(discountRepository.save(any(InvoiceDiscount.class))).thenAnswer(inv -> {
            InvoiceDiscount d = inv.getArgument(0);
            d.setId(2L);
            return d;
        });

        DiscountResponse res = invoiceDiscountService.applyDiscount(100L, req, mockStaff);

        assertNotNull(res);
        assertEquals(DiscountStatus.PENDING_APPROVAL, res.getStatus());
        assertEquals(InvoiceStatus.PENDING_DISCOUNT_APPROVAL, mockInvoice.getStatus());
        verify(notificationService, times(1)).createForRoles(any(), anyString(), anyString(), anyString(), anyLong());
    }

    @Test
    @DisplayName("Test: applyDiscount on PAID invoice throws BusinessException (QTN-11)")
    public void testApplyDiscountOnPaidInvoiceThrowsException() {
        mockInvoice.setStatus(InvoiceStatus.PAID);
        when(invoiceRepository.findById(100L)).thenReturn(Optional.of(mockInvoice));

        ApplyDiscountRequest req = new ApplyDiscountRequest();
        req.setDiscountType(DiscountType.FIXED_AMOUNT);
        req.setDiscountValue(new BigDecimal("50000"));

        assertThrows(BusinessException.class, () -> {
            invoiceDiscountService.applyDiscount(100L, req, mockStaff);
        });
    }

    @Test
    @DisplayName("Test: approveDiscount updates discount to APPLIED and unlocks invoice")
    public void testApproveDiscountSuccess() {
        mockInvoice.setStatus(InvoiceStatus.PENDING_DISCOUNT_APPROVAL);
        when(invoiceRepository.findById(100L)).thenReturn(Optional.of(mockInvoice));

        InvoiceDiscount discount = InvoiceDiscount.builder()
                .id(5L)
                .invoice(mockInvoice)
                .status(DiscountStatus.PENDING_APPROVAL)
                .calculatedAmount(new BigDecimal("300000"))
                .discountType(DiscountType.FIXED_AMOUNT)
                .discountValue(new BigDecimal("300000"))
                .build();

        when(discountRepository.findActiveByInvoiceId(100L, DiscountStatus.REJECTED)).thenReturn(Optional.of(discount));
        when(discountRepository.save(any(InvoiceDiscount.class))).thenAnswer(inv -> inv.getArgument(0));

        DiscountResponse res = invoiceDiscountService.approveDiscount(100L, mockOwner);

        assertEquals(DiscountStatus.APPLIED, res.getStatus());
        assertEquals(InvoiceStatus.PENDING, mockInvoice.getStatus());
        assertEquals(0, new BigDecimal("900000").compareTo(mockInvoice.getTotalAmount()));
        assertEquals(0, new BigDecimal("300000").compareTo(mockInvoice.getDiscountAmount()));
        verify(auditLogService, times(1)).log(eq("InvoiceDiscount"), eq(5L), eq("APPROVE_DISCOUNT"), eq(mockOwner), anyString());
    }

    @Test
    @DisplayName("Test: rejectDiscount updates discount to REJECTED and unlocks invoice without deducting money")
    public void testRejectDiscountSuccess() {
        mockInvoice.setStatus(InvoiceStatus.PENDING_DISCOUNT_APPROVAL);
        when(invoiceRepository.findById(100L)).thenReturn(Optional.of(mockInvoice));

        InvoiceDiscount discount = InvoiceDiscount.builder()
                .id(6L)
                .invoice(mockInvoice)
                .status(DiscountStatus.PENDING_APPROVAL)
                .calculatedAmount(new BigDecimal("300000"))
                .build();

        when(discountRepository.findActiveByInvoiceId(100L, DiscountStatus.REJECTED)).thenReturn(Optional.of(discount));
        when(discountRepository.save(any(InvoiceDiscount.class))).thenAnswer(inv -> inv.getArgument(0));

        RejectDiscountRequest rejectReq = new RejectDiscountRequest();
        rejectReq.setRejectReason("Mức giảm quá cao không hợp lệ");

        DiscountResponse res = invoiceDiscountService.rejectDiscount(100L, rejectReq, mockOwner);

        assertEquals(DiscountStatus.REJECTED, res.getStatus());
        assertEquals(InvoiceStatus.PENDING, mockInvoice.getStatus());
        assertEquals(0, new BigDecimal("1200000").compareTo(mockInvoice.getTotalAmount()));
        verify(auditLogService, times(1)).log(eq("InvoiceDiscount"), eq(6L), eq("REJECT_DISCOUNT"), eq(mockOwner), anyString());
    }

    @Test
    @DisplayName("Test: removeDiscount deletes discount and restores original invoice amount")
    public void testRemoveDiscountRestoresAmount() {
        mockInvoice.setStatus(InvoiceStatus.PENDING);
        mockInvoice.setDiscountAmount(new BigDecimal("100000"));
        mockInvoice.setTotalAmount(new BigDecimal("1100000"));
        when(invoiceRepository.findById(100L)).thenReturn(Optional.of(mockInvoice));

        InvoiceDiscount discount = InvoiceDiscount.builder()
                .id(7L)
                .invoice(mockInvoice)
                .status(DiscountStatus.APPLIED)
                .calculatedAmount(new BigDecimal("100000"))
                .build();

        when(discountRepository.findActiveByInvoiceId(100L, DiscountStatus.REJECTED)).thenReturn(Optional.of(discount));

        invoiceDiscountService.removeDiscount(100L, mockStaff);

        assertEquals(0, BigDecimal.ZERO.compareTo(mockInvoice.getDiscountAmount()));
        assertEquals(0, new BigDecimal("1200000").compareTo(mockInvoice.getTotalAmount()));
        verify(discountRepository, times(1)).delete(discount);
        verify(auditLogService, times(1)).log(eq("InvoiceDiscount"), eq(7L), eq("REMOVE_DISCOUNT"), eq(mockStaff), anyString());
    }
}
