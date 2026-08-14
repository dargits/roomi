package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelSettingRequest {
    
    @NotBlank(message = "Tên cơ sở không được để trống")
    private String propertyName;
    
    @NotBlank(message = "Địa chỉ không được để trống")
    private String address;
    
    private String phone;
    private String email;
    
    @NotNull(message = "Giờ nhận phòng mặc định không được để trống")
    private LocalTime defaultCheckinTime;
    
    @NotNull(message = "Giờ trả phòng mặc định không được để trống")
    private LocalTime defaultCheckoutTime;
    
    private String homeImage;
}
