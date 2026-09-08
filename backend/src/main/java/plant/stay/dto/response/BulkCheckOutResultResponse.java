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
public class BulkCheckOutResultResponse {
    @Builder.Default
    private List<BookingResponse> successfulRooms = new ArrayList<>();

    @Builder.Default
    private List<BulkCheckInFailureDto> failedRooms = new ArrayList<>();

    private int totalRequested;
    private boolean groupCompleted; // true nếu toàn bộ phòng của đoàn đều đã trả / kết thúc
}
