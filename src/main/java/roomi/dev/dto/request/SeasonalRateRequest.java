package roomi.dev.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class SeasonalRateRequest {

    @NotNull(message = "roomTypeId không được để trống")
    private Long roomTypeId;

    @NotNull(message = "startDate không được để trống")
    private LocalDate startDate;

    @NotNull(message = "endDate không được để trống")
    private LocalDate endDate;

    @NotNull(message = "price không được để trống")
    @Positive(message = "price phải lớn hơn 0")
    private BigDecimal price;
}
