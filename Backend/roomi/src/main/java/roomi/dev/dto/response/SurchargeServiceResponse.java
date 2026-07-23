package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Builder
@Getter
public class SurchargeServiceResponse {
    private Long id;
    private String name;
    private String description;
    private BigDecimal unitPrice;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
