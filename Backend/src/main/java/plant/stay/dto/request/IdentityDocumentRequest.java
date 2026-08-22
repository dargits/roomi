package plant.stay.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import plant.stay.model.IdentityDocumentType;

@Data
public class IdentityDocumentRequest {
    @NotNull(message = "Loại giấy tờ không được để trống")
    private IdentityDocumentType documentType;

    private String documentNumber;

    @NotBlank(message = "Ảnh giấy tờ không được để trống")
    private String imageUrl;
}
