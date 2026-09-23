package plant.stay.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CleaningStandardUpdateRequest {

    @NotNull(message = "Danh sách định mức không được để trống")
    @Valid
    private List<StandardItem> standards;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StandardItem {
        @NotNull(message = "ID loại phòng không được để trống")
        private Long roomTypeId;

        @NotNull(message = "Định mức dọn sau trả phòng không được để trống")
        @Min(value = 5, message = "Định mức thời gian dọn tối thiểu là 5 phút")
        private Integer standardCheckoutCleaningMinutes;

        @NotNull(message = "Định mức dọn định kỳ không được để trống")
        @Min(value = 5, message = "Định mức thời gian dọn tối thiểu là 5 phút")
        private Integer standardPeriodicCleaningMinutes;
    }
}
