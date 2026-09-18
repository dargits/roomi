package plant.stay.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import plant.stay.model.ConfirmationChannel;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendConfirmationRequest {

    @NotNull(message = "Vui lòng chọn kênh gửi")
    private ConfirmationChannel channel;

    // Email người nhận (nếu để trống, hệ thống dùng email trong hồ sơ khách)
    private String customEmail;

    // Số điện thoại người nhận (nếu gửi tin nhắn Zalo/SMS)
    private String customPhone;

    // Ghi chú thêm cho lần gửi
    private String note;
}
