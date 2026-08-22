package plant.stay.service;

import plant.stay.dto.request.GroupBookingRequest;
import plant.stay.dto.request.GroupRoomAssignmentRequest;
import plant.stay.dto.response.GroupBookingResponse;
import plant.stay.dto.response.GroupRoomAssignmentSuggestionResponse;
import plant.stay.model.User;

import java.util.List;

public interface GroupBookingService {
    GroupBookingResponse create(GroupBookingRequest request, User actor);
    List<GroupBookingResponse> getAll();
    GroupBookingResponse getById(Long id);
    GroupRoomAssignmentSuggestionResponse getAssignmentSuggestion(Long groupBookingId);
    GroupBookingResponse assignRooms(Long groupBookingId, GroupRoomAssignmentRequest request, User actor);

    /**
     * NCL-13-CN-004: Hủy một phần số phòng trong hồ sơ đoàn.
     * Áp phí hủy theo chính sách nếu trong hạn, không hủy được toàn bộ đoàn qua endpoint này.
     * Thực hiện theo nguyên tắc QTN-25: atomic — thành công toàn bộ hoặc rollback.
     */
    GroupBookingResponse cancelPartialRooms(Long groupBookingId, List<Long> bookingIds, User actor);
}