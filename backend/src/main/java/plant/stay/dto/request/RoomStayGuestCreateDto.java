package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RoomStayGuestCreateDto {
    @NotBlank(message = "Họ và tên khách không được để trống")
    private String fullName;

    private Integer birthYear;

    private String documentType; // CCCD, PASSPORT, OTHER

    private String documentNumber;

    private Boolean isChild;
}
