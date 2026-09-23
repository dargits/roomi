package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class NegotiatedPricePreviewResponse {
    private boolean applied;
    private Long agreementId;
    private String agreementName;
    private String agreementType; // "GROUP" | "CORPORATE" | "NONE"
    private String clientOrGroupName;
    private BigDecimal pricePerNight;
    private Integer totalNights;
    private BigDecimal totalPrice;
    private BigDecimal standardPrice;
}
