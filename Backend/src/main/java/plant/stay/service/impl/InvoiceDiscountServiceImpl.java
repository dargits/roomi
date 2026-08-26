package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.ApplyDiscountRequest;
import plant.stay.dto.request.RejectDiscountRequest;
import plant.stay.dto.response.DiscountResponse;
import plant.stay.exception.BusinessException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.HotelSettingRepository;
import plant.stay.repository.InvoiceDiscountRepository;
import plant.stay.repository.InvoiceRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.InvoiceDiscountService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

/**
 * Triển khai toàn bộ luồng nghiệp vụ giảm giá hóa đơn.
 *
 * <p>Quy tắc quan trọng:
 * <ul>
 *   <li>QTN-11: Không giảm giá trên hóa đơn PAID</li>
 *   <li>QTN-12: 0 <= calculatedAmount <= (roomAmount + serviceAmount)</li>
 *   <li>Mỗi hóa đơn chỉ 1 khoản giảm giá hiệu lực tại một thời điểm</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceDiscountServiceImpl implements InvoiceDiscountService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceDiscountRepository discountRepository;
    private final HotelSettingRepository hotelSettingRepository;
    private final AuditLogService auditLogService;

    // =========================================================================
    // APPLY DISCOUNT
    // =========================================================================

    @Override
    @Transactional
    public DiscountResponse applyDiscount(Long invoiceId, ApplyDiscountRequest request, User actor) {

        // 1. Tìm hóa đơn
        Invoice invoice = findInvoiceById(invoiceId);

        // 2. QTN-11: Chỉ cho phép áp dụng giảm giá khi hóa đơn chưa thanh toán
        validateInvoiceNotPaid(invoice);

        // 3. Kiểm tra không có khoản giảm giá đang hiệu lực nào trước đó
        //    (chỉ 1 khoản giảm giá tại một thời điểm)
        boolean hasActive = discountRepository.existsActiveByInvoiceId(invoiceId, DiscountStatus.REJECTED);
        if (hasActive) {
            throw new BusinessException(
                "Hóa đơn đã có khoản giảm giá đang hiệu lực. " +
                "Vui lòng xóa khoản cũ (DELETE /discount) trước khi áp dụng khoản mới."
            );
        }

        // 4. QTN-12: Tính calculatedAmount và kiểm tra giới hạn
        BigDecimal base = invoice.getRoomAmount().add(invoice.getServiceAmount());
        BigDecimal calculatedAmount = calculateDiscount(request, base);

        // 5. Lấy ngưỡng phê duyệt từ cấu hình cơ sở (lấy bản ghi đầu tiên vì 1 hệ thống 1 cơ sở)
        HotelSetting setting = hotelSettingRepository.findAll().stream()
                .findFirst()
                .orElse(null);

        BigDecimal threshold = (setting != null) ? setting.getDiscountApprovalThreshold() : null;

        // 6. Quyết định trạng thái: Auto-approve hay cần Owner duyệt?
        //    - threshold = NULL → luôn auto-approve
        //    - calculatedAmount < threshold → auto-approve
        //    - calculatedAmount >= threshold → PENDING_DISCOUNT_APPROVAL (cần Owner duyệt)
        boolean needsApproval = (threshold != null) && (calculatedAmount.compareTo(threshold) >= 0);
        DiscountStatus discountStatus = needsApproval ? DiscountStatus.PENDING_APPROVAL : DiscountStatus.APPLIED;

        // 7. Tạo bản ghi InvoiceDiscount
        InvoiceDiscount discount = InvoiceDiscount.builder()
                .invoice(invoice)
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .calculatedAmount(calculatedAmount)
                .reason(request.getReason())
                .status(discountStatus)
                .createdBy(actor)
                .build();
        discount = discountRepository.save(discount);

        // 8. Cập nhật Invoice tương ứng với kết quả duyệt
        if (discountStatus == DiscountStatus.APPLIED) {
            // Auto-approved: trừ tiền ngay và giữ trạng thái PENDING chờ thanh toán
            applyDiscountToInvoice(invoice, calculatedAmount, InvoiceStatus.PENDING);
        } else {
            // Cần Owner duyệt: khóa thanh toán và check-out
            invoice.setStatus(InvoiceStatus.PENDING_DISCOUNT_APPROVAL);
            invoiceRepository.save(invoice);
        }

        // 9. Ghi Audit Log
        String detail = String.format(
            "{\"action\":\"APPLY_DISCOUNT\",\"discountType\":\"%s\",\"discountValue\":%s," +
            "\"calculatedAmount\":%s,\"status\":\"%s\",\"reason\":\"%s\"}",
            request.getDiscountType(), request.getDiscountValue(),
            calculatedAmount, discountStatus, request.getReason()
        );
        auditLogService.log("InvoiceDiscount", discount.getId(), "APPLY_DISCOUNT", actor, detail);

        log.info("Discount applied: invoiceId={}, calculatedAmount={}, status={}, actor={}",
                invoiceId, calculatedAmount, discountStatus, actor.getName());

        String statusMessage = needsApproval
                ? "Giảm giá đang chờ phê duyệt từ Chủ cơ sở."
                : "Giảm giá đã được tự động duyệt và áp dụng.";

        return toResponse(discount, statusMessage);
    }

    // =========================================================================
    // REMOVE DISCOUNT
    // =========================================================================

    @Override
    @Transactional
    public void removeDiscount(Long invoiceId, User actor) {

        // 1. Tìm hóa đơn
        Invoice invoice = findInvoiceById(invoiceId);

        // 2. QTN-11: Không được xóa giảm giá trên hóa đơn PAID
        validateInvoiceNotPaid(invoice);

        // 3. Tìm khoản giảm giá đang hiệu lực
        InvoiceDiscount discount = discountRepository
                .findActiveByInvoiceId(invoiceId, DiscountStatus.REJECTED)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Hóa đơn #" + invoiceId + " không có khoản giảm giá nào đang hiệu lực để xóa."));

        // 4. Hoàn tác: nếu giảm giá đã được APPLIED (trừ tiền rồi), phải cộng lại
        if (discount.getStatus() == DiscountStatus.APPLIED) {
            BigDecimal restoredTotal = invoice.getRoomAmount().add(invoice.getServiceAmount());
            invoice.setDiscountAmount(BigDecimal.ZERO);
            invoice.setTotalAmount(restoredTotal);
        }

        // 5. Khôi phục trạng thái hóa đơn về PENDING (bỏ khóa nếu đang chờ duyệt)
        invoice.setStatus(InvoiceStatus.PENDING);
        invoiceRepository.save(invoice);

        // 6. Xóa bản ghi giảm giá
        discountRepository.delete(discount);

        // 7. Ghi Audit Log
        String detail = String.format(
            "{\"action\":\"REMOVE_DISCOUNT\",\"discountId\":%d,\"calculatedAmount\":%s}",
            discount.getId(), discount.getCalculatedAmount()
        );
        auditLogService.log("InvoiceDiscount", discount.getId(), "REMOVE_DISCOUNT", actor, detail);

        log.info("Discount removed: invoiceId={}, discountId={}, actor={}",
                invoiceId, discount.getId(), actor.getName());
    }

    // =========================================================================
    // APPROVE DISCOUNT
    // =========================================================================

    @Override
    @Transactional
    public DiscountResponse approveDiscount(Long invoiceId, User actor) {

        // 1. Tìm hóa đơn
        Invoice invoice = findInvoiceById(invoiceId);

        // 2. Hóa đơn phải đang ở trạng thái PENDING_DISCOUNT_APPROVAL
        if (invoice.getStatus() != InvoiceStatus.PENDING_DISCOUNT_APPROVAL) {
            throw new BusinessException(
                "Hóa đơn #" + invoiceId + " không ở trạng thái chờ duyệt giảm giá. " +
                "Trạng thái hiện tại: " + invoice.getStatus()
            );
        }

        // 3. Tìm khoản giảm giá đang chờ duyệt
        InvoiceDiscount discount = discountRepository
                .findActiveByInvoiceId(invoiceId, DiscountStatus.REJECTED)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy khoản giảm giá chờ duyệt cho hóa đơn #" + invoiceId));

        if (discount.getStatus() != DiscountStatus.PENDING_APPROVAL) {
            throw new BusinessException("Khoản giảm giá không ở trạng thái PENDING_APPROVAL.");
        }

        // 4. Duyệt: cập nhật trạng thái discount
        discount.setStatus(DiscountStatus.APPLIED);
        discount.setReviewedBy(actor);
        discount.setReviewedAt(LocalDateTime.now());
        discountRepository.save(discount);

        // 5. Trừ tiền và cập nhật hóa đơn sang PENDING (mở khóa)
        applyDiscountToInvoice(invoice, discount.getCalculatedAmount(), InvoiceStatus.PENDING);

        // 6. Ghi Audit Log
        String detail = String.format(
            "{\"action\":\"APPROVE_DISCOUNT\",\"discountId\":%d,\"calculatedAmount\":%s}",
            discount.getId(), discount.getCalculatedAmount()
        );
        auditLogService.log("InvoiceDiscount", discount.getId(), "APPROVE_DISCOUNT", actor, detail);

        log.info("Discount approved: invoiceId={}, discountId={}, actor={}",
                invoiceId, discount.getId(), actor.getName());

        return toResponse(discount, "Giảm giá đã được Chủ cơ sở phê duyệt và áp dụng.");
    }

    // =========================================================================
    // REJECT DISCOUNT
    // =========================================================================

    @Override
    @Transactional
    public DiscountResponse rejectDiscount(Long invoiceId, RejectDiscountRequest request, User actor) {

        // 1. Tìm hóa đơn
        Invoice invoice = findInvoiceById(invoiceId);

        // 2. Hóa đơn phải đang ở trạng thái PENDING_DISCOUNT_APPROVAL
        if (invoice.getStatus() != InvoiceStatus.PENDING_DISCOUNT_APPROVAL) {
            throw new BusinessException(
                "Hóa đơn #" + invoiceId + " không ở trạng thái chờ duyệt giảm giá. " +
                "Trạng thái hiện tại: " + invoice.getStatus()
            );
        }

        // 3. Tìm khoản giảm giá đang chờ duyệt
        InvoiceDiscount discount = discountRepository
                .findActiveByInvoiceId(invoiceId, DiscountStatus.REJECTED)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy khoản giảm giá chờ duyệt cho hóa đơn #" + invoiceId));

        if (discount.getStatus() != DiscountStatus.PENDING_APPROVAL) {
            throw new BusinessException("Khoản giảm giá không ở trạng thái PENDING_APPROVAL.");
        }

        // 4. Từ chối: cập nhật discount
        discount.setStatus(DiscountStatus.REJECTED);
        discount.setReviewedBy(actor);
        discount.setReviewedAt(LocalDateTime.now());
        discount.setRejectReason(request.getRejectReason());
        discountRepository.save(discount);

        // 5. Khôi phục hóa đơn về PENDING (mở khóa thanh toán)
        //    Không trừ tiền vì discount chưa được áp dụng khi ở PENDING_APPROVAL
        invoice.setStatus(InvoiceStatus.PENDING);
        invoiceRepository.save(invoice);

        // 6. Ghi Audit Log
        String detail = String.format(
            "{\"action\":\"REJECT_DISCOUNT\",\"discountId\":%d,\"rejectReason\":\"%s\"}",
            discount.getId(), request.getRejectReason()
        );
        auditLogService.log("InvoiceDiscount", discount.getId(), "REJECT_DISCOUNT", actor, detail);

        log.info("Discount rejected: invoiceId={}, discountId={}, actor={}, reason={}",
                invoiceId, discount.getId(), actor.getName(), request.getRejectReason());

        return toResponse(discount, "Chủ cơ sở đã từ chối khoản giảm giá. Hóa đơn trở về trạng thái chờ thanh toán.");
    }

    // =========================================================================
    // GET ACTIVE DISCOUNT
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public DiscountResponse getActiveDiscount(Long invoiceId) {
        // Đảm bảo hóa đơn tồn tại
        findInvoiceById(invoiceId);

        return discountRepository
                .findActiveByInvoiceId(invoiceId, DiscountStatus.REJECTED)
                .map(d -> toResponse(d, null))
                .orElse(null);
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Tìm hóa đơn theo ID, ném ResourceNotFoundException nếu không tìm thấy.
     */
    private Invoice findInvoiceById(Long invoiceId) {
        return invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy hóa đơn với ID: " + invoiceId));
    }

    /**
     * QTN-11: Kiểm tra hóa đơn không được ở trạng thái PAID.
     * Giảm giá chỉ áp dụng được khi hóa đơn ở DRAFT, PENDING_PAYMENT, PENDING hoặc PENDING_DISCOUNT_APPROVAL.
     */
    private void validateInvoiceNotPaid(Invoice invoice) {
        // QTN-11: Không giảm giá trực tiếp trên hóa đơn đã thanh toán
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BusinessException(
                "[QTN-11] Không thể thay đổi giảm giá trên hóa đơn đã thanh toán (PAID). " +
                "Hóa đơn #" + invoice.getId() + " có trạng thái: PAID.",
                HttpStatus.UNPROCESSABLE_ENTITY
            );
        }
    }

    /**
     * QTN-12: Tính số tiền giảm giá thực tế (calculatedAmount) từ request.
     *
     * <p>Quy tắc:
     * <ul>
     *   <li>FIXED_AMOUNT: calculatedAmount = discountValue (không được âm, không vượt base)</li>
     *   <li>PERCENTAGE: calculatedAmount = base * discountValue / 100 (làm tròn 2 chữ số thập phân)</li>
     * </ul>
     *
     * @param request thông tin giảm giá
     * @param base    = roomAmount + serviceAmount
     * @return số tiền giảm thực tế
     * @throws BusinessException nếu vi phạm QTN-12
     */
    private BigDecimal calculateDiscount(ApplyDiscountRequest request, BigDecimal base) {
        BigDecimal calculatedAmount;

        if (request.getDiscountType() == DiscountType.PERCENTAGE) {
            // Phần trăm phải trong khoảng (0, 100]
            if (request.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new BusinessException(
                    "[QTN-12] Giá trị giảm giá theo % không được vượt quá 100%."
                );
            }
            calculatedAmount = base
                    .multiply(request.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            // FIXED_AMOUNT: dùng trực tiếp giá trị
            calculatedAmount = request.getDiscountValue().setScale(2, RoundingMode.HALF_UP);
        }

        // QTN-12: calculatedAmount phải >= 0
        if (calculatedAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException(
                "[QTN-12] Số tiền giảm giá không được âm."
            );
        }

        // QTN-12: calculatedAmount không được vượt tổng tiền (roomAmount + serviceAmount)
        if (calculatedAmount.compareTo(base) > 0) {
            throw new BusinessException(
                String.format(
                    "[QTN-12] Số tiền giảm giá (%s) không được vượt quá tổng tiền hóa đơn (%s). " +
                    "Tổng = Tiền phòng + Dịch vụ phụ thu.",
                    calculatedAmount.toPlainString(), base.toPlainString()
                )
            );
        }

        return calculatedAmount;
    }

    /**
     * Áp dụng calculatedAmount vào hóa đơn: cập nhật discountAmount, totalAmount,
     * và chuyển trạng thái hóa đơn sang targetStatus.
     *
     * <p>QTN-12: totalAmount = (roomAmount + serviceAmount) - discountAmount
     */
    private void applyDiscountToInvoice(Invoice invoice, BigDecimal calculatedAmount, InvoiceStatus targetStatus) {
        invoice.setDiscountAmount(calculatedAmount);
        // QTN-12: Tổng tiền = (Tiền phòng + Dịch vụ phụ thu) - Giảm giá
        BigDecimal newTotal = invoice.getRoomAmount()
                .add(invoice.getServiceAmount())
                .subtract(calculatedAmount);
        invoice.setTotalAmount(newTotal);
        invoice.setStatus(targetStatus);
        invoiceRepository.save(invoice);
    }

    /**
     * Chuyển đổi InvoiceDiscount entity sang DiscountResponse DTO.
     */
    private DiscountResponse toResponse(InvoiceDiscount discount, String statusMessage) {
        return DiscountResponse.builder()
                .id(discount.getId())
                .invoiceId(discount.getInvoice().getId())
                .discountType(discount.getDiscountType())
                .discountValue(discount.getDiscountValue())
                .calculatedAmount(discount.getCalculatedAmount())
                .reason(discount.getReason())
                .status(discount.getStatus())
                .statusMessage(statusMessage)
                .createdAt(discount.getCreatedAt())
                .createdByName(discount.getCreatedBy() != null ? discount.getCreatedBy().getName() : null)
                .reviewedAt(discount.getReviewedAt())
                .reviewedByName(discount.getReviewedBy() != null ? discount.getReviewedBy().getName() : null)
                .rejectReason(discount.getRejectReason())
                .build();
    }
}
