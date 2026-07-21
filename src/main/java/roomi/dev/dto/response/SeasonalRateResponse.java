package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Builder
@Getter
@Setter
public class SeasonalRateResponse {
    private Long id;
    private Long roomTypeId;
    private String roomTypeName;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal price;
}