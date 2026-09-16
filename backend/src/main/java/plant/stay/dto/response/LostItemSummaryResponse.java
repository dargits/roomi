package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LostItemSummaryResponse {
    private long totalHolding;
    private long totalContacted;
    private long totalReturned;
    private long totalDisposed;
    private long totalExpiredHolding; // Đang giữ nhưng đã quá hạn lưu giữ
}
