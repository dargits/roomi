package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NightlyPriceDetailDto {
    private LocalDate date;
    private String dayOfWeek;
    private BigDecimal appliedPrice;
    private String priceSource; // HOLIDAY, WEEKEND, SEASONAL, BASE
    private String sourceName; // Tên hiển thị (vd: "Lễ 2/9", "Giá cuối tuần", "Giá theo mùa", "Giá cơ bản")
}
