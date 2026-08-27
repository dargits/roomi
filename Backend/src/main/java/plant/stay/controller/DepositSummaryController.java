package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.response.DepositResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.DepositRepository;
import plant.stay.util.AuthUtil;

import java.util.List;
import java.util.stream.Collectors;

/**
 * NCL-11-CN-NEW: Danh sách khoản cọc chưa quyết toán toàn hệ thống
 * GET /api/v1/deposits/unsettled
 */
@RestController
@RequestMapping("/api/v1/deposits")
@CrossOrigin("*")
@RequiredArgsConstructor
public class DepositSummaryController {

    private final DepositRepository depositRepository;
    private final AuthUtil authUtil;

    @GetMapping("/unsettled")
    public ResponseEntity<List<DepositResponse>> getUnsettledDeposits(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER
                && user.getRole() != Role.RECEPTIONIST
                && user.getRole() != Role.ADMIN
                && user.getRole() != Role.ACCOUNTANT)) {
            throw new UnauthorizedException("Không có quyền truy cập danh sách cọc");
        }

        List<DepositResponse> result = depositRepository.findUnsettledDeposits()
                .stream().map(d -> DepositResponse.builder()
                        .id(d.getId())
                        .bookingId(d.getBooking() != null ? d.getBooking().getId() : null)
                        .requiredAmount(d.getRequiredAmount())
                        .collectedAmount(d.getCollectedAmount())
                        .refundedAmount(d.getRefundedAmount())
                        .penaltyAmount(d.getPenaltyAmount())
                        .status(d.getStatus())
                        .paymentMethod(d.getPaymentMethod())
                        .shortPaidReason(d.getShortPaidReason())
                        .note(d.getNote())
                        .collectedByName(d.getCollectedBy() != null ? d.getCollectedBy().getName() : null)
                        .processedByName(d.getProcessedBy() != null ? d.getProcessedBy().getName() : null)
                        .collectedAt(d.getCollectedAt())
                        .processedAt(d.getProcessedAt())
                        .createdAt(d.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}
