package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import plant.stay.model.LostItemStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LostItemLogResponse {

    private Long id;
    private Long lostItemId;
    private String action;
    private LostItemStatus previousStatus;
    private LostItemStatus newStatus;
    private String notes;
    private Long performedById;
    private String performedByName;
    private LocalDateTime createdAt;
}
