package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class StayDeclarationResponseDTO {
    private LocalDate declarationDate;
    private int totalGuests;
    private int completeGuests;
    private int missingDocumentGuests;
    private int pendingDeclarations;
    private List<GuestStatusDTO> guests;
}