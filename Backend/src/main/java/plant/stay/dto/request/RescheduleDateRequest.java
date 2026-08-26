package plant.stay.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

/**
 * Request dời lịch đặt phòng (chỉ áp dụng cho status NEW hoặc CONFIRMED).
 * Lý do dời lịch là tùy chọn — không bắt buộc.
 */
@Data
public class RescheduleDateRequest {

    @NotNull(message = "Ngày nhận phòng mới không được để trống")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate newCheckInDate;

    @NotNull(message = "Ngày trả phòng mới không được để trống")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate newCheckOutDate;

    /** Lý do dời lịch — tùy chọn, sẽ được ghi vào note và audit log nếu có */
    private String reason;
}
