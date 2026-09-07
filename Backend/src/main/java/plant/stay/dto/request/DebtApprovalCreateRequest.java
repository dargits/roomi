package plant.stay.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class DebtApprovalCreateRequest {
    @NotNull(message = "Mã đặt phòng không được để trống")
    private Long bookingId;

    @NotNull(message = "Số tiền còn nợ không được để trống")
    @DecimalMin(value = "0.01", message = "Số tiền còn nợ phải lớn hơn 0")
    private BigDecimal debtAmount;

    @NotNull(message = "Hạn thu dự kiến không được để trống")
    private LocalDate dueDate;

    @NotBlank(message = "Lý do nợ không được để trống")
    private String reason;
}
