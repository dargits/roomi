package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConvertBlockToBookingRequest {

    @NotBlank(message = "Tên khách hàng không được để trống")
    private String guestName;

    private String guestPhone;

    private String guestEmail;

    private String guestIdNumber; // Số CMND / CCCD / Hộ chiếu

    private Long roomId; // Đổi sang phòng vật lý khác nếu muốn

    private BigDecimal expectedPrice; // Giá phòng dự kiến hoặc thực tế thu từ kênh OTA

    private BigDecimal depositAmount; // Tiền kênh đã thu trước / đặt cọc

    private String note;
}
