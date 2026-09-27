package plant.stay.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NegotiatedPriceItemRequest {

    @NotNull(message = "ID loại phòng không được để trống")
    private Long roomTypeId;

    private String roomTypeName;

    @NotNull(message = "Mức giá thỏa thuận không được để trống")
    @DecimalMin(value = "0", inclusive = false, message = "Mức giá phải lớn hơn 0")
    private BigDecimal pricePerNight;
}
