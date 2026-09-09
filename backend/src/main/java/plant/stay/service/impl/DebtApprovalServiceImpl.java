package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.DebtApprovalCreateRequest;
import plant.stay.dto.request.DebtApprovalRejectRequest;
import plant.stay.dto.response.DebtItemResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.DebtApprovalService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DebtApprovalServiceImpl implements DebtApprovalService {

    private final DebtApprovalRepository debtApprovalRepository;
    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final RoomRepository roomRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public DebtItemResponse requestDebtCheckout(DebtApprovalCreateRequest req, User actor) {
        Booking booking = bookingRepository.findById(req.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đặt phòng #" + req.getBookingId()));

        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể đề nghị trả phòng còn nợ khi đặt phòng đang ở trạng thái CHECKED_IN");
        }

        // Kiểm tra khách: không áp dụng cho khách vãng lai chưa có hồ sơ (yêu cầu story NCL-04-CN-010)
        Guest guest = booking.getGuest();
        if (guest == null || guest.getPhone() == null || guest.getPhone().trim().isEmpty()) {
            throw new IllegalArgumentException("Không áp dụng ngoại lệ trả phòng còn nợ cho khách vãng lai chưa có hồ sơ khách (thiếu số điện thoại liên hệ để thu hồi công nợ)!");
        }

        // Tìm hóa đơn
        Invoice invoice = invoiceRepository.findInvoicesCoveringBooking(booking.getId()).stream().findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Đặt phòng chưa được lập hóa đơn, không thể đề nghị nợ"));

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new IllegalArgumentException("Hóa đơn đã được thanh toán đầy đủ, không cần đề nghị trả phòng còn nợ");
        }
        if (invoice.getStatus() == InvoiceStatus.PENDING_DISCOUNT_APPROVAL) {
            throw new IllegalArgumentException("Hóa đơn đang chờ phê duyệt giảm giá, không thể đề nghị trả phòng còn nợ");
        }

        // Tính số tiền đã thanh toán hiện tại
        BigDecimal totalPaid = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remainingAmount = invoice.getTotalAmount().subtract(totalPaid);

        if (remainingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Hóa đơn không còn dư nợ");
        }

        // Kiểm tra hạn thu
        if (req.getDueDate() == null || req.getDueDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Hạn thu dự kiến phải từ ngày hôm nay trở đi");
        }

        if (req.getDebtAmount().compareTo(remainingAmount) != 0) {
            throw new IllegalArgumentException("Số tiền còn nợ phải khớp với số dư hóa đơn hiện tại");
        }

        // Kiểm tra xem đã có yêu cầu PENDING nào chưa
        debtApprovalRepository.findFirstByBookingIdAndStatus(booking.getId(), DebtApprovalStatus.PENDING)
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Đặt phòng này đang có một yêu cầu trả phòng còn nợ chờ duyệt!");
                });

        DebtApprovalRequest request = DebtApprovalRequest.builder()
                .booking(booking)
                .invoice(invoice)
                .guest(guest)
                .debtAmount(remainingAmount)
                .dueDate(req.getDueDate())
                .reason(req.getReason())
                .status(DebtApprovalStatus.PENDING)
                .requestedBy(actor)
                .build();

        request = debtApprovalRepository.save(request);

        auditLogService.log("DebtApprovalRequest", request.getId(), "REQUEST_DEBT_CHECKOUT", actor,
                "Lễ tân " + actor.getName() + " đề nghị trả phòng còn nợ cho phòng "
                + (booking.getRoom() != null ? booking.getRoom().getRoomNumber() : "")
                + " (Booking #" + booking.getId() + "), số tiền nợ: " + remainingAmount
                + "đ, hạn thu: " + req.getDueDate() + ", lý do: " + req.getReason());

        return toDto(request);
    }

    @Override
    @Transactional
    public DebtItemResponse approveDebtCheckout(Long requestId, User actor) {
        DebtApprovalRequest request = debtApprovalRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu duyệt nợ #" + requestId));

        if (request.getStatus() != DebtApprovalStatus.PENDING) {
            throw new IllegalArgumentException("Yêu cầu này đã được xử lý (trạng thái: " + request.getStatus() + ")");
        }

        Booking booking = request.getBooking();
        Invoice invoice = request.getInvoice();

        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Đặt phòng không còn ở trạng thái CHECKED_IN, không thể phê duyệt trả phòng còn nợ");
        }
        if (invoice.getStatus() == InvoiceStatus.PENDING_DISCOUNT_APPROVAL) {
            throw new IllegalArgumentException("Hóa đơn đang chờ phê duyệt giảm giá, không thể phê duyệt trả phòng còn nợ");
        }
        BigDecimal totalPaid = paymentRepository.findByInvoiceId(invoice.getId()).stream()
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (invoice.getStatus() == InvoiceStatus.PAID
                || invoice.getTotalAmount().subtract(totalPaid).compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Hóa đơn không còn dư nợ, không cần phê duyệt trả phòng còn nợ");
        }

        // Cập nhật trạng thái duyệt
        request.setStatus(DebtApprovalStatus.APPROVED);
        request.setApprovedBy(actor);
        request.setApprovedAt(LocalDateTime.now());
        debtApprovalRepository.save(request);

        // Ngoại lệ có kiểm soát: Đặt phòng chuyển sang CHECKED_OUT
        booking.setStatus(BookingStatus.CHECKED_OUT);
        booking.setCheckedOutAt(LocalDateTime.now());
        if (invoice != null && invoice.getTotalAmount() != null) {
            booking.setActualPrice(invoice.getTotalAmount());
        }
        bookingRepository.save(booking);

        // Phòng chuyển sang DIRTY (cần dọn)
        if (booking.getRoom() != null) {
            booking.getRoom().setStatus(RoomStatus.DIRTY);
            roomRepository.save(booking.getRoom());
        }

        // Hóa đơn GIỮ NGUYÊN trạng thái còn nợ (PENDING_PAYMENT / PENDING), KHÔNG chuyển sang PAID
        if (invoice.getStatus() == InvoiceStatus.DRAFT) {
            invoice.setStatus(InvoiceStatus.PENDING_PAYMENT);
            invoiceRepository.save(invoice);
        }

        auditLogService.log("DebtApprovalRequest", request.getId(), "APPROVE_DEBT_CHECKOUT", actor,
                "Chủ cơ sở " + actor.getName() + " đã phê duyệt trả phòng còn nợ cho Booking #" + booking.getId()
                + ", số tiền nợ: " + request.getDebtAmount() + "đ, hạn thu: " + request.getDueDate());

        return toDto(request);
    }

    @Override
    @Transactional
    public DebtItemResponse rejectDebtCheckout(Long requestId, DebtApprovalRejectRequest req, User actor) {
        DebtApprovalRequest request = debtApprovalRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu duyệt nợ #" + requestId));

        if (request.getStatus() != DebtApprovalStatus.PENDING) {
            throw new IllegalArgumentException("Yêu cầu này đã được xử lý (trạng thái: " + request.getStatus() + ")");
        }

        request.setStatus(DebtApprovalStatus.REJECTED);
        request.setApprovedBy(actor);
        request.setApprovedAt(LocalDateTime.now());
        request.setRejectReason(req.getRejectReason());
        debtApprovalRepository.save(request);

        auditLogService.log("DebtApprovalRequest", request.getId(), "REJECT_DEBT_CHECKOUT", actor,
                "Chủ cơ sở " + actor.getName() + " từ chối trả phòng còn nợ cho Booking #" + request.getBooking().getId()
                + ", lý do: " + req.getRejectReason());

        return toDto(request);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DebtItemResponse> getActiveDebts() {
        // Chỉ các khoản nợ đã APPROVED và hóa đơn chưa PAID
        List<DebtApprovalRequest> activeDebts = debtApprovalRepository.findActiveApprovedDebts();

        LocalDate today = LocalDate.now();
        return activeDebts.stream()
                .map(this::toDto)
                .sorted(Comparator
                        .comparingLong(DebtItemResponse::getDaysOverdue).reversed() // Mức quá hạn giảm dần
                        .thenComparing(DebtItemResponse::getDueDate))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DebtItemResponse> getPendingRequests() {
        return debtApprovalRepository.findByStatusOrderByRequestedAtDesc(DebtApprovalStatus.PENDING)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DebtItemResponse> getAllRequests() {
        return debtApprovalRepository.findAll().stream()
                .map(this::toDto)
                .sorted(Comparator.comparing(DebtItemResponse::getRequestedAt).reversed())
                .collect(Collectors.toList());
    }

    private DebtItemResponse toDto(DebtApprovalRequest r) {
        Invoice inv = r.getInvoice();
        BigDecimal totalAmount = inv != null ? inv.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal paidAmount = BigDecimal.ZERO;
        if (inv != null) {
            paidAmount = paymentRepository.findByInvoiceId(inv.getId()).stream()
                    .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        BigDecimal actualDebt = totalAmount.subtract(paidAmount);
        if (actualDebt.compareTo(BigDecimal.ZERO) < 0) {
            actualDebt = BigDecimal.ZERO;
        }

        LocalDate today = LocalDate.now();
        long daysOverdue = 0;
        if (r.getDueDate() != null && r.getDueDate().isBefore(today)) {
            daysOverdue = ChronoUnit.DAYS.between(r.getDueDate(), today);
        }

        return DebtItemResponse.builder()
                .id(r.getId())
                .bookingId(r.getBooking() != null ? r.getBooking().getId() : null)
                .invoiceId(inv != null ? inv.getId() : null)
                .invoiceNumber(inv != null ? ("HD-" + inv.getId()) : null)
                .guestId(r.getGuest() != null ? r.getGuest().getId() : null)
                .guestName(r.getGuest() != null ? r.getGuest().getName() : null)
                .guestPhone(r.getGuest() != null ? r.getGuest().getPhone() : null)
                .roomNumber(r.getBooking() != null && r.getBooking().getRoom() != null ? r.getBooking().getRoom().getRoomNumber() : null)
                .totalAmount(totalAmount)
                .paidAmount(paidAmount)
                .debtAmount(r.getStatus() == DebtApprovalStatus.APPROVED ? actualDebt : r.getDebtAmount())
                .dueDate(r.getDueDate())
                .daysOverdue(daysOverdue)
                .status(r.getStatus())
                .reason(r.getReason())
                .requestedByName(r.getRequestedBy() != null ? r.getRequestedBy().getName() : null)
                .requestedAt(r.getRequestedAt())
                .approvedByName(r.getApprovedBy() != null ? r.getApprovedBy().getName() : null)
                .approvedAt(r.getApprovedAt())
                .rejectReason(r.getRejectReason())
                .build();
    }
}
