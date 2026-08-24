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
     * Trả phòng hàng loạt cho đoàn: checkout tất cả phòng CHECKED_IN trong đoàn.
     * Chỉ thực hiện được khi tất cả phòng đã CHECKED_IN và hóa đơn đoàn đã được thanh toán.
     * Trả về danh sách kết quả checkout từng phòng.
     */
    List<BookingResponse> bulkCheckOut(Long groupBookingId, User actor);

    /**
     * P0: Ghi nhận thu tiền đặt cọc cho đoàn.
     */
    Deposit createDeposit(Long groupBookingId, GroupDepositCreateRequest request, User actor);

    /**
     * P0: Lấy danh sách các khoản cọc của hồ sơ đoàn.
     */
    List<Deposit> getDeposits(Long groupBookingId);
}
