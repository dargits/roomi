package plant.stay.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class NegotiatedPriceAgreementRequest {

    @NotBlank(message = "Tên thỏa thuận giá không được để trống")
    private String name;

    private Long corporateClientId;

    private Long groupBookingId;

    @NotNull(message = "Mức giá thỏa thuận không được để trống")
    @DecimalMin(value = "0", inclusive = false, message = "Mức giá phải lớn hơn 0")
    private BigDecimal pricePerNight;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate startDate;

    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDate endDate;

    private Boolean active;

    private String note;
}
