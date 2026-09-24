package plant.stay.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiPriceAnalysisRequest {
    /** Câu hỏi tùy ý của staff (OWNER/ADMIN) về giá/doanh thu */
    private String question;
    /** Ngày cụ thể cần phân tích (tùy chọn) */
    private LocalDate targetDate;
    /** Số ngày cần rà soát (mặc định 30) */
    private Integer days;
}
