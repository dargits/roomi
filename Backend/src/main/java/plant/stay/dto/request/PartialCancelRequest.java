package plant.stay.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * NCL-13-CN-004: Request hủy một phần số phòng trong hồ sơ đặt phòng đoàn.
 * Danh sách bookingIds là những booking cần hủy (không phải hủy toàn bộ đoàn).
 */
@Data
public class PartialCancelRequest {

    @NotEmpty(message = "Phải chọn ít nhất một booking để hủy")
    private List<Long> bookingIds;
}
