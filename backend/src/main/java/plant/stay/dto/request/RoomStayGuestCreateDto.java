package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomStayGuestCreateDto {
    @NotBlank(message = "Họ và tên khách không được để trống")
    private String fullName;

    private Integer birthYear;

    private String documentType; // CCCD, PASSPORT, OTHER

    private String documentNumber;

    private Boolean isChild;
}
