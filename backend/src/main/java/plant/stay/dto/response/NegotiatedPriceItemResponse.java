package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NegotiatedPriceItemResponse {
    private Long roomTypeId;
    private String roomTypeName;
    private BigDecimal pricePerNight;
}
