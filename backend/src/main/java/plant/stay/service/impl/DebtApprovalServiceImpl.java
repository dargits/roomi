package plant.stay.service.impl;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.DebtApprovalCreateRequest;
import plant.stay.dto.request.DebtApprovalRejectRequest;
import plant.stay.dto.request.DebtCollectionLogRequest;
import plant.stay.dto.response.*;
import plant.stay.exception.BusinessException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.DebtApprovalService;
import plant.stay.service.NotificationService;
import org.springframework.http.HttpStatus;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class DebtApprovalServiceImpl implements DebtApprovalService {

    private final DebtApprovalRepository debtApprovalRepository;
    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final RoomRepository roomRepository;
    private final AuditLogService auditLogService;
    private final DebtCollectionLogRepository collectionLogRepository;
    private final NotificationService notificationService;

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

    @Override
    @Transactional(readOnly = true)
    public void sendDueTomorrowReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<DebtApprovalRequest> list = debtApprovalRepository.findByStatusOrderByRequestedAtDesc(DebtApprovalStatus.APPROVED);
        for (DebtApprovalRequest req : list) {
            if (tomorrow.equals(req.getDueDate())) {
                log.info("[DEBT REMINDER] Nhắc nợ khách hàng {} cho khoản nợ đến hạn ngày mai: {}",
                        req.getGuest() != null ? req.getGuest().getName() : "", req.getDebtAmount());
            }
        }
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

        // Tính agingBucket
        String agingBucket = calcAgingBucket(daysOverdue, r.getDueDate(), today);

        // Tính reminderStatus
        String reminderStatus = calcReminderStatus(r.getNextReminderDate(), today);

        // Số lần đã liên hệ
        long collectionCount = collectionLogRepository.countByDebtApprovalRequestId(r.getId());

        // Ngày check-in / check-out
        LocalDate checkInDate = r.getBooking() != null ? r.getBooking().getCheckInDate() : null;
        LocalDate checkOutDate = r.getBooking() != null ? r.getBooking().getCheckOutDate() : null;

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
                // === Aging report fields ===
                .agingBucket(agingBucket)
                .reminderStatus(reminderStatus)
                .lastContactedAt(r.getLastContactedAt())
                .lastContactNote(r.getLastContactNote())
                .nextReminderDate(r.getNextReminderDate())
                .collectionCount(collectionCount)
                .checkInDate(checkInDate)
                .checkOutDate(checkOutDate)
                .build();
    }

    // ========== Aging Report ==========

    @Override
    @Transactional(readOnly = true)
    public DebtAgingReportResponse getDebtAgingReport(
            LocalDate asOfDate,
            LocalDate fromCheckout,
            LocalDate toCheckout,
            Long guestId,
            String bucketFilter,
            String reminderFilter) {

        LocalDate today = asOfDate != null ? asOfDate : LocalDate.now();

        // 1. Nạp dữ liệu theo chế độ xem
        List<DebtApprovalRequest> rawDebts;
        if (fromCheckout != null && toCheckout != null) {
            rawDebts = debtApprovalRepository.findActiveApprovedDebtsByCheckoutBetween(fromCheckout, toCheckout);
        } else {
            rawDebts = debtApprovalRepository.findActiveApprovedDebts();
        }

        // 2. Chuyển sang DTO (tính actualDebt, daysOverdue, agingBucket, reminderStatus)
        List<DebtItemResponse> allItems = rawDebts.stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        // 3. Lọc theo guestId nếu có
        if (guestId != null) {
            allItems = allItems.stream()
                    .filter(item -> guestId.equals(item.getGuestId()))
                    .collect(Collectors.toList());
        }

        // 4. Tổng hợp bucket TRƯỚC KHI filter bucket/reminder (để KPI cards luôn hiện đầy đủ)
        BigDecimal grandTotal = allItems.stream()
                .map(DebtItemResponse::getDebtAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int totalInvoices = allItems.size();
        List<DebtAgingBucketDto> buckets = buildBuckets(allItems, grandTotal);

        // 5. Tổng hợp theo khách hàng
        List<CustomerDebtSummaryDto> customerSummaries = buildCustomerSummaries(allItems);

        // 6. Đếm số khoản cần nhắc hôm nay
        int remindersToday = (int) allItems.stream()
                .filter(item -> "DUE_TODAY".equals(item.getReminderStatus()) || "OVERDUE_REMINDER".equals(item.getReminderStatus()))
                .count();

        // 7. Áp filter bucket/reminder cho danh sách chi tiết
        List<DebtItemResponse> filteredItems = allItems.stream()
                .filter(item -> bucketFilter == null || bucketFilter.equals(item.getAgingBucket()))
                .filter(item -> reminderFilter == null || reminderFilter.equals(item.getReminderStatus()))
                .sorted(Comparator.comparingLong(DebtItemResponse::getDaysOverdue).reversed()
                        .thenComparing(Comparator.comparing(DebtItemResponse::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))))
                .collect(Collectors.toList());

        // 8. Đối soát doanh thu nếu lọc theo kỳ
        DebtAgingReconciliationDto reconciliation = null;
        if (fromCheckout != null && toCheckout != null) {
            reconciliation = buildReconciliation(allItems, fromCheckout, toCheckout, rawDebts);
        }

        return DebtAgingReportResponse.builder()
                .asOfDate(today)
                .grandTotalDebt(grandTotal)
                .totalInvoices(totalInvoices)
                .buckets(buckets)
                .items(filteredItems)
                .customerSummaries(customerSummaries)
                .remindersDueTodayCount(remindersToday)
                .reconciliation(reconciliation)
                .build();
    }

    @Override
    @Transactional
    public DebtCollectionLogResponse addCollectionLog(Long debtId, DebtCollectionLogRequest req, User actor) {
        DebtApprovalRequest debt = debtApprovalRepository.findById(debtId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khoản nợ #" + debtId));
        if (debt.getStatus() != DebtApprovalStatus.APPROVED) {
            throw new BusinessException("Chỉ có thể ghi nhận đòi nợ cho khoản đã được phê duyệt", HttpStatus.BAD_REQUEST);
        }

        LocalDateTime contactDate = req.getContactDate() != null ? req.getContactDate() : LocalDateTime.now();

        DebtCollectionLog log = DebtCollectionLog.builder()
                .debtApprovalRequest(debt)
                .contactDate(contactDate)
                .contactMethod(req.getContactMethod())
                .contactResult(req.getContactResult())
                .notes(req.getNotes())
                .promisedDate(req.getPromisedDate())
                .nextReminderDate(req.getNextReminderDate())
                .recordedBy(actor)
                .build();
        log = collectionLogRepository.save(log);

        // Cập nhật trường denormalized trên DebtApprovalRequest
        debt.setLastContactedAt(contactDate);
        debt.setLastContactNote(req.getNotes().length() > 200 ? req.getNotes().substring(0, 200) + "..." : req.getNotes());
        debt.setNextReminderDate(req.getNextReminderDate());
        debtApprovalRepository.save(debt);

        auditLogService.log("DebtApprovalRequest", debtId, "ADD_COLLECTION_LOG", actor,
                "Ghi nhận liên hệ đòi nợ: " + req.getContactMethod() + " - " + req.getNotes());

        return toCollectionLogDto(log);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DebtCollectionLogResponse> getCollectionLogs(Long debtId) {
        if (!debtApprovalRepository.existsById(debtId)) {
            throw new ResourceNotFoundException("Không tìm thấy khoản nợ #" + debtId);
        }
        return collectionLogRepository.findByDebtApprovalRequestIdOrderByContactDateDesc(debtId)
                .stream()
                .map(this::toCollectionLogDto)
                .collect(Collectors.toList());
    }

    @Override
    public byte[] exportDebtAgingCsv(
            LocalDate asOfDate,
            LocalDate fromCheckout,
            LocalDate toCheckout,
            Long guestId,
            String bucketFilter) {
        DebtAgingReportResponse report = getDebtAgingReport(
                asOfDate, fromCheckout, toCheckout, guestId, bucketFilter, null);
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            // UTF-8 BOM để Excel nhận diện tiếng Việt
            baos.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});
            try (OutputStreamWriter writer = new OutputStreamWriter(baos, StandardCharsets.UTF_8)) {
                // Header
                writer.write("BÁO CÁO TUỔI NỢ & NHẮC THU\r\n");
                writer.write("Ngày chốt:," + report.getAsOfDate().format(dtf) + "\r\n");
                writer.write("Tổng dư nợ:," + report.getGrandTotalDebt() + "\r\n");
                writer.write("Tổng hóa đơn:," + report.getTotalInvoices() + "\r\n\r\n");

                // Bảng 1: Phân nhóm tuổi nợ
                writer.write("PHÂN NHÓM TUỔI NỢ\r\n");
                writer.write("Nhóm,Số hóa đơn,Tổng tiền nợ,Tỷ trọng (%)\r\n");
                for (DebtAgingBucketDto b : report.getBuckets()) {
                    writer.write(String.format("\"%s\",%d,%s,%.1f%%%r\n",
                            b.getBucketName(), b.getInvoiceCount(),
                            b.getTotalAmount(), b.getPercentage()));
                }
                writer.write("\r\n");

                // Bảng 2: Chi tiết
                writer.write("DANH SÁCH CHI TIẾT CÔNG NỢ\r\n");
                writer.write("Mã HĐ,Khách hàng,Số điện thoại,Phòng,Ngày trả phòng,Hạn cam kết,Số ngày quá hạn,Phân nhóm,Còn nợ,Người phê duyệt,Liên hệ gần nhất,Ghi chú,Hẹn liên hệ lại\r\n");
                for (DebtItemResponse item : report.getItems()) {
                    writer.write(String.format("\"%s\",\"%s\",\"%s\",\"%s\",%s,%s,%d,\"%s\",%s,\"%s\",%s,\"%s\",%s\r\n",
                            nvl(item.getInvoiceNumber()),
                            nvl(item.getGuestName()),
                            nvl(item.getGuestPhone()),
                            nvl(item.getRoomNumber()),
                            item.getCheckOutDate() != null ? item.getCheckOutDate().format(dtf) : "",
                            item.getDueDate() != null ? item.getDueDate().format(dtf) : "",
                            item.getDaysOverdue(),
                            bucketLabel(item.getAgingBucket()),
                            item.getDebtAmount(),
                            nvl(item.getApprovedByName()),
                            item.getLastContactedAt() != null ? item.getLastContactedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")) : "",
                            nvl(item.getLastContactNote()),
                            item.getNextReminderDate() != null ? item.getNextReminderDate().format(dtf) : ""));
                }
            }
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Không thể xuất file CSV báo cáo tuổi nợ", e);
        }
    }

    @Override
    @Transactional
    public void sendDailyDebtReminders() {
        LocalDate today = LocalDate.now();
        List<DebtApprovalRequest> debtsToRemind = debtApprovalRepository.findDebtsNeedingReminder(today);
        for (DebtApprovalRequest debt : debtsToRemind) {
            String guestName = debt.getGuest() != null ? debt.getGuest().getName() : "Khách hàng";
            String title = "Nhắc đòi nợ: " + guestName;
            String body = "Đến hạn liên hệ lại khoản nợ " + debt.getDebtAmount() + "đ (HĐ-" + debt.getInvoice().getId() + "). Hạn cam kết: " + debt.getDueDate();
            try {
                notificationService.createForRoles(
                        NotificationType.DEBT_REMINDER, title, body,
                        "DebtApprovalRequest", debt.getId());
                log.info("[DEBT REMINDER] Đã gửi nhắc đòi nợ cho khoản #{} - Khách: {}", debt.getId(), guestName);
            } catch (Exception e) {
                log.error("[DEBT REMINDER] Lỗi khi gửi nhắc đòi nợ #{}: {}", debt.getId(), e.getMessage());
            }
        }
        log.info("[DEBT REMINDER] Đã xử lý {} khoản nợ đến hạn nhắc hôm nay ({}).", debtsToRemind.size(), today);
    }

    // ========== Helper methods ==========

    private String calcAgingBucket(long daysOverdue, LocalDate dueDate, LocalDate today) {
        if (dueDate == null || !dueDate.isBefore(today)) return "CURRENT";
        if (daysOverdue <= 14) return "OVERDUE_UNDER_15";
        if (daysOverdue <= 30) return "OVERDUE_15_TO_30";
        return "OVERDUE_OVER_30";
    }

    private String calcReminderStatus(LocalDate nextReminderDate, LocalDate today) {
        if (nextReminderDate == null) return "NONE";
        if (nextReminderDate.equals(today)) return "DUE_TODAY";
        if (nextReminderDate.isBefore(today)) return "OVERDUE_REMINDER";
        return "UPCOMING";
    }

    private List<DebtAgingBucketDto> buildBuckets(List<DebtItemResponse> items, BigDecimal grandTotal) {
        record BucketSpec(String key, String name, String severity) {}
        List<BucketSpec> specs = List.of(
                new BucketSpec("OVERDUE_OVER_30",  "Trên 30 ngày",       "CRITICAL"),
                new BucketSpec("OVERDUE_15_TO_30", "Từ 15 - 30 ngày",    "DANGER"),
                new BucketSpec("OVERDUE_UNDER_15", "Quá hạn < 15 ngày",  "WARNING"),
                new BucketSpec("CURRENT",           "Trong hạn",          "SUCCESS")
        );
        List<DebtAgingBucketDto> buckets = new ArrayList<>();
        for (BucketSpec spec : specs) {
            List<DebtItemResponse> group = items.stream()
                    .filter(i -> spec.key().equals(i.getAgingBucket()))
                    .collect(Collectors.toList());
            BigDecimal total = group.stream()
                    .map(DebtItemResponse::getDebtAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            double pct = grandTotal.compareTo(BigDecimal.ZERO) > 0
                    ? total.divide(grandTotal, 4, RoundingMode.HALF_UP).doubleValue() * 100
                    : 0.0;
            buckets.add(DebtAgingBucketDto.builder()
                    .bucketKey(spec.key())
                    .bucketName(spec.name())
                    .severity(spec.severity())
                    .invoiceCount(group.size())
                    .totalAmount(total)
                    .percentage(Math.round(pct * 10.0) / 10.0)
                    .build());
        }
        return buckets;
    }

    private List<CustomerDebtSummaryDto> buildCustomerSummaries(List<DebtItemResponse> items) {
        Map<Long, List<DebtItemResponse>> byGuest = items.stream()
                .filter(i -> i.getGuestId() != null)
                .collect(Collectors.groupingBy(DebtItemResponse::getGuestId));
        return byGuest.entrySet().stream()
                .map(entry -> {
                    List<DebtItemResponse> group = entry.getValue();
                    DebtItemResponse first = group.get(0);
                    BigDecimal totalDebt = group.stream()
                            .map(DebtItemResponse::getDebtAmount)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    long maxDaysOverdue = group.stream()
                            .mapToLong(DebtItemResponse::getDaysOverdue)
                            .max().orElse(0);
                    String highestBucket = group.stream()
                            .max(Comparator.comparingLong(DebtItemResponse::getDaysOverdue))
                            .map(DebtItemResponse::getAgingBucket)
                            .orElse("CURRENT");
                    LocalDate earliestDue = group.stream()
                            .map(DebtItemResponse::getDueDate)
                            .filter(Objects::nonNull)
                            .min(Comparator.naturalOrder())
                            .orElse(null);
                    return CustomerDebtSummaryDto.builder()
                            .guestId(entry.getKey())
                            .guestName(first.getGuestName())
                            .guestPhone(first.getGuestPhone())
                            .totalDebt(totalDebt)
                            .invoiceCount(group.size())
                            .earliestDueDate(earliestDue)
                            .maxDaysOverdue(maxDaysOverdue)
                            .highestRiskBucket(highestBucket)
                            .build();
                })
                .sorted(Comparator.comparingLong(CustomerDebtSummaryDto::getMaxDaysOverdue).reversed())
                .collect(Collectors.toList());
    }

    private DebtAgingReconciliationDto buildReconciliation(
            List<DebtItemResponse> agingItems,
            LocalDate fromCheckout, LocalDate toCheckout,
            List<DebtApprovalRequest> rawDebts) {
        // agingCheckoutDebt: tổng actualDebt của các booking checkout trong kỳ (từ toDto)
        BigDecimal agingCheckoutDebt = agingItems.stream()
                .map(DebtItemResponse::getDebtAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // revenueReportDebt: tái tạo công thức của ReportController.revenue
        BigDecimal revenueReportDebt = rawDebts.stream()
                .map(d -> {
                    Invoice inv = d.getInvoice();
                    if (inv == null) return BigDecimal.ZERO;
                    Booking b = d.getBooking();
                    BigDecimal effectiveRevenue = BigDecimal.ZERO;
                    if (b != null && b.getActualPrice() != null && b.getActualPrice().compareTo(BigDecimal.ZERO) > 0) {
                        effectiveRevenue = b.getActualPrice();
                    } else if (inv.getTotalAmount() != null && inv.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
                        effectiveRevenue = inv.getTotalAmount();
                    } else if (b != null && b.getExpectedPrice() != null) {
                        effectiveRevenue = b.getExpectedPrice();
                    }
                    BigDecimal paid = paymentRepository.findByInvoiceId(inv.getId()).stream()
                            .map(Payment::getAmount).filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal debt = effectiveRevenue.subtract(paid);
                    return debt.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : debt;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal discrepancy = agingCheckoutDebt.subtract(revenueReportDebt);
        return DebtAgingReconciliationDto.builder()
                .fromCheckout(fromCheckout)
                .toCheckout(toCheckout)
                .agingCheckoutDebt(agingCheckoutDebt)
                .revenueReportDebt(revenueReportDebt)
                .discrepancy(discrepancy)
                .matched(discrepancy.compareTo(BigDecimal.ZERO) == 0)
                .build();
    }

    private DebtCollectionLogResponse toCollectionLogDto(DebtCollectionLog log) {
        return DebtCollectionLogResponse.builder()
                .id(log.getId())
                .debtApprovalRequestId(log.getDebtApprovalRequest() != null ? log.getDebtApprovalRequest().getId() : null)
                .contactDate(log.getContactDate())
                .contactMethod(log.getContactMethod())
                .contactResult(log.getContactResult())
                .notes(log.getNotes())
                .promisedDate(log.getPromisedDate())
                .nextReminderDate(log.getNextReminderDate())
                .recordedByName(log.getRecordedBy() != null ? log.getRecordedBy().getName() : null)
                .createdAt(log.getCreatedAt())
                .build();
    }

    private String bucketLabel(String bucketKey) {
        if (bucketKey == null) return "";
        return switch (bucketKey) {
            case "CURRENT"          -> "Trong hạn";
            case "OVERDUE_UNDER_15" -> "Quá hạn < 15 ngày";
            case "OVERDUE_15_TO_30"-> "Từ 15 - 30 ngày";
            case "OVERDUE_OVER_30" -> "Trên 30 ngày";
            default -> bucketKey;
        };
    }

    private String nvl(String s) { return s != null ? s : ""; }
}
