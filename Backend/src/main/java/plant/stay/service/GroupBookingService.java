package plant.stay.service;

import plant.stay.dto.request.GroupBookingRequest;
import plant.stay.dto.request.GroupDepositCreateRequest;
import plant.stay.dto.request.GroupRoomAssignmentRequest;
import plant.stay.dto.response.BookingResponse;
import plant.stay.dto.response.GroupBookingResponse;
import plant.stay.dto.response.GroupCancelPreviewResponse;
import plant.stay.dto.response.GroupRoomAssignmentSuggestionResponse;
import plant.stay.model.Deposit;
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

    /**
     * Preview tính phí hủy một phần theo thời gian thực (P1.4).
     */
    GroupCancelPreviewResponse previewCancelPartial(Long groupBookingId, List<Long> bookingIds);

    /**
     * Trả phòng hàng loạt cho đoàn (NCL-13-CN-006):
     * Liệt kê chi tiết từng phòng, phụ thu, thanh toán và cho phép bỏ chọn phòng ở thêm.
     */
    plant.stay.dto.response.BulkCheckOutSummaryResponse getBulkCheckOutSummary(Long groupBookingId);
    plant.stay.dto.response.BulkCheckOutResultResponse bulkCheckOut(Long groupBookingId, plant.stay.dto.request.BulkCheckOutRequest req, User actor);

    /**
     * P0: Ghi nhận thu tiền đặt cọc cho đoàn.
     */
    Deposit createDeposit(Long groupBookingId, GroupDepositCreateRequest request, User actor);

    /**
     * P0: Lấy danh sách các khoản cọc của hồ sơ đoàn.
     */
    List<Deposit> getDeposits(Long groupBookingId);
}
