package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelSettingResponse {
    private Long id;
    private String propertyName;
    private String address;
    private String phone;
    private String email;
    private LocalTime defaultCheckinTime;
    private LocalTime defaultCheckoutTime;
    private String homeImage;
}
