package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateLostItemRequest {

    @NotNull(message = "Phòng không được để trống")
    private Long roomId;

    @NotBlank(message = "Tên hoặc mô tả món đồ không được để trống")
    private String itemName;

    @NotBlank(message = "Vị trí tìm thấy không được để trống")
    private String foundLocation;

    @NotNull(message = "Ngày tìm thấy không được để trống")
    private LocalDate foundDate;

    private LocalTime foundTime;

    private String storageLocation; // Nơi cất giữ hiện tại

    private String imageUrl;

    private String notes; // Ghi chú ban đầu
}
