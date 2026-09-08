package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCheckInResultResponse {
    @Builder.Default
    private List<BookingResponse> successfulRooms = new ArrayList<>();
    
    @Builder.Default
    private List<BulkCheckInFailureDto> failedRooms = new ArrayList<>();
    
    private int totalRequested;
    private int missingDocumentRoomCount;
}
