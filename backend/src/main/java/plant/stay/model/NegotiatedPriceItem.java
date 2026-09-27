package plant.stay.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.math.BigDecimal;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NegotiatedPriceItem {

    @Column(name = "room_type_id", nullable = false)
    private Long roomTypeId;

    @Column(name = "room_type_name")
    private String roomTypeName;

    @Column(name = "price_per_night", precision = 12, scale = 2, nullable = false)
    private BigDecimal pricePerNight;
}
