package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class NegotiatedPriceAgreementResponse {
    private Long id;
    private String name;
    private Long corporateClientId;
    private String corporateClientName;
    private Long groupBookingId;
    private String groupBookingRepName;
    private BigDecimal pricePerNight;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean active;
    private String note;
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
