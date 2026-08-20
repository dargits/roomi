package plant.stay.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import plant.stay.model.InvoiceMode;

@Data
public class GroupInvoiceCreateRequest {

    @NotNull(message = "Cách lập hóa đơn không được để trống")
    private InvoiceMode mode;

    private String note;
}