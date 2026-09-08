package plant.stay.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

/**
 * Request chạy kịch bản stress test đồng thời — NCL-03-CN-008
 */
@Data
public class ConcurrencyTestRequest {

    @NotNull(message = "Phòng cần chỉ định")
    private Long roomId;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate dateFrom;

    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDate dateTo;

    @Min(value = 2, message = "Cần ít nhất 2 yêu cầu đồng thời")
    private int requestCount = 20;
}
