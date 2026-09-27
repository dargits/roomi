package plant.stay.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class BookingRequest {
    @NotNull(message = "Khách hàng không được để trống")
    private Long guestId;

    @NotNull(message = "Loại phòng không được để trống")
    private Long roomTypeId;

    private Long roomId; // Optional — có thể gán phòng sau

    @NotNull(message = "Ngày nhận phòng không được để trống")
    private LocalDate checkInDate;

    @NotNull(message = "Ngày trả phòng không được để trống")
    private LocalDate checkOutDate;

    @Min(value = 1, message = "Số lượng khách phải từ 1 người trở lên")
    private Integer guestCount;

    @Min(value = 0, message = "Số lượng trẻ em không được âm")
    private Integer childCount;

    @Size(max = 1000, message = "Ghi chú không được vượt quá 1000 ký tự")
    private String note;

    @Size(max = 50, message = "Kênh nguồn không được vượt quá 50 ký tự")
    private String source; // WALKIN, PHONE, SOCIAL, ONLINE, SIMULATION

    private Long corporateClientId; // ID hồ sơ khách công ty (nếu có)
    private Long groupBookingId; // ID đoàn đặt phòng (nếu có)
}
