package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Builder
@Getter
@Setter
public class PriceLookupResponse {
    private Long roomTypeId;
    private String roomTypeName;
    private LocalDate date;
    private BigDecimal price;
    private BigDecimal basePrice;
    private boolean isSeasonalRate;
    private String priceSource; // "BASE_PRICE" hoặc "SEASONAL_RATE"
}