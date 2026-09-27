package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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

    @Pattern(
        regexp = "^$|^(0|\\+84)(3|5|7|8|9)[0-9]{8}$|^02[0-9]{9}$", 
        message = "Số điện thoại không đúng định dạng (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)"
    )
    private String guestPhone;

    @Pattern(
        regexp = "^$|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", 
        message = "Email không đúng định dạng"
    )
    private String guestEmail;

    @Pattern(
        regexp = "^$|^[0-9]{9}$|^[0-9]{12}$|^[a-zA-Z][0-9]{7,8}$", 
        message = "Số CCCD/CMND hoặc Hộ chiếu không hợp lệ (phải gồm 9 hoặc 12 chữ số, hoặc Hộ chiếu 1 chữ cái và 7-8 số)"
    )
    private String guestIdNumber; // Số CMND / CCCD / Hộ chiếu

    private Long roomId; // Đổi sang phòng vật lý khác nếu muốn

    private BigDecimal expectedPrice; // Giá phòng dự kiến hoặc thực tế thu từ kênh OTA

    private BigDecimal depositAmount; // Tiền kênh đã thu trước / đặt cọc

    private String note;
}
