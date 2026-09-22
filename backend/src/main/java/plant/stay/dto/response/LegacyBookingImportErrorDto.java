package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LegacyBookingImportErrorDto {
    private int rowNumber;
    private String guestName;
    private String roomNumber;
    private String checkInDate;
    private String checkOutDate;
    private String reason;
}
