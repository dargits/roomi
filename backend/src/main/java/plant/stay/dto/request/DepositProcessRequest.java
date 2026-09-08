package plant.stay.dto.request;

import lombok.Data;

/**
 * Request hoàn tiền hoặc xử lý cọc no-show — NCL-11-CN-003, NCL-11-CN-004, NCL-11-CN-005
 */
@Data
public class DepositProcessRequest {
    // Lý do hoàn/tịch thu (bắt buộc với no-show override — NCL-11-CN-005)
    private String reason;

    // Override số tiền giữ lại (chỉ OWNER — NCL-11-CN-005-TC bổ sung)
    private java.math.BigDecimal penaltyOverride;
}
