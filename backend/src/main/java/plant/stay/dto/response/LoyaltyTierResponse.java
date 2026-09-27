package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoyaltyTierResponse {
    private Long id;
    private String name;
    private Integer minPoints;
    private Double discountPercent;
    private String benefitDescription;
}
