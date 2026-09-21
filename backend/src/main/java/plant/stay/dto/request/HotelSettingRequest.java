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

    private Boolean reminderEmailEnabled;
    private LocalTime reminderMorningTime;
    private Integer lostItemRetentionDays;

    private Boolean periodicCleaningEnabled;

    @jakarta.validation.constraints.Min(value = 1, message = "Số ngày phòng trống tối thiểu là 1 ngày")
    @jakarta.validation.constraints.Max(value = 90, message = "Số ngày phòng trống tối đa là 90 ngày")
    private Integer periodicCleaningDays;

    @jakarta.validation.constraints.Min(value = 5, message = "Thời gian hết hạn phiên tối thiểu là 5 phút")
    @jakarta.validation.constraints.Max(value = 1440, message = "Thời gian hết hạn phiên tối đa là 1440 phút (24 giờ)")
    private Integer sessionTimeoutMinutes;

    @jakarta.validation.constraints.Min(value = 0, message = "Số phiên đồng thời không được âm")
    @jakarta.validation.constraints.Max(value = 50, message = "Số phiên đồng thời tối đa là 50")
    private Integer maxConcurrentSessions;

    @jakarta.validation.constraints.Min(value = 1, message = "Thời hạn phiên tối thiểu là 1 giờ")
    @jakarta.validation.constraints.Max(value = 720, message = "Thời hạn phiên tối đa là 720 giờ (30 ngày)")
    private Integer maxSessionLifetimeHours;

    private Boolean publicInvoiceLookupEnabled;
}
