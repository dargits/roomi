package plant.stay.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import plant.stay.dto.request.CreateLostItemRequest;
import plant.stay.dto.request.DisposeLostItemRequest;
import plant.stay.dto.request.ReturnLostItemRequest;
import plant.stay.dto.response.LostItemLogResponse;
import plant.stay.dto.response.LostItemResponse;
import plant.stay.dto.response.LostItemSummaryResponse;
import plant.stay.model.LostItemStatus;
import plant.stay.model.User;

import java.time.LocalDate;
import java.util.List;

public interface LostItemService {

    LostItemResponse create(CreateLostItemRequest request, User actor);

    Page<LostItemResponse> getAll(Long roomId, LostItemStatus status, LocalDate fromDate, LocalDate toDate,
                                  String keyword, Boolean isExpired, Pageable pageable);

    LostItemResponse getById(Long id);

    LostItemResponse markContacted(Long id, String notes, User actor);

    LostItemResponse returnToGuest(Long id, ReturnLostItemRequest request, User actor);

    LostItemResponse disposeItem(Long id, DisposeLostItemRequest request, User actor);

    List<LostItemLogResponse> getLogsByLostItemId(Long id);

    LostItemSummaryResponse getSummary();
}
