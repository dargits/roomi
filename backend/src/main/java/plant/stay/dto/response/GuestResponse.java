package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class GuestResponse {
    private Long id;
    private String name;
    private String phone;
    private String idNumber;
    private String email;
    private Integer loyaltyPoints;
    private Long loyaltyTierId;
    private String loyaltyTierName;
    private LocalDateTime createdAt;
}
