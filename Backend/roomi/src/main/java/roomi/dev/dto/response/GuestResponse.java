package roomi.dev.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Builder
@Getter
@Setter
public class GuestResponse {
    private Long id;
    private String fullName;
    private String phone;
    private String email;
    private String idNumber;
    private String note;
    private Integer loyaltyPoints;
    private LocalDateTime createdAt;
}
