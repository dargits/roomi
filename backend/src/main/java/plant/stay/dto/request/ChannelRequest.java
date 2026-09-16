package plant.stay.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelRequest {

    @NotBlank(message = "Tên kênh không được để trống")
    private String name;

    @NotBlank(message = "Mã kênh không được để trống")
    private String channelCode; // AIRBNB, BOOKING_COM, AGODA, TRIP_COM, OTHER

    private String externalCalendarUrl; // Đường dẫn tệp lịch mà kênh cung cấp

    // Loại phòng và phân bổ mặc định (tùy chọn hoặc tương thích phiên bản cũ)
    private Long roomTypeId;
    private Integer allocatedRooms;

    // Danh sách ánh xạ chi tiết giữa mã loại phòng kênh và loại phòng hệ thống
    private java.util.List<ChannelRoomMappingRequest> mappings;

    @Min(value = 1, message = "Chu kỳ cập nhật phải từ 1 phút trở lên")
    private Integer syncIntervalMinutes;

    private Boolean isActive;
}
