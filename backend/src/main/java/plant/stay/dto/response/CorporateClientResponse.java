package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CorporateClientResponse {
    private Long id;
    private String companyName;
    private String taxCode;
    private String contactPerson;
    private String contactPhone;
    private String contactEmail;
    private String address;
    private String note;
    private Boolean active;
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
