package plant.stay.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCheckOutRequest {
    /**
     * Danh sách bookingId các phòng được chọn trả phòng.
     * Nếu null hoặc rỗng, mặc định xử lý tất cả các phòng đang CHECKED_IN của đoàn.
     */
    private List<Long> bookingIds;
}
