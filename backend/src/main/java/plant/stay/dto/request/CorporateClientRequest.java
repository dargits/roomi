package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CorporateClientRequest {
    @NotBlank(message = "Tên công ty không được để trống")
    private String companyName;

    private String taxCode;
    private String contactPerson;
    private String contactPhone;
    private String contactEmail;
    private String address;
    private String note;
    private Boolean active;
}
