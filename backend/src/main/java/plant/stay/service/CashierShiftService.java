package plant.stay.service;

import plant.stay.dto.request.CashierShiftCloseRequest;
import plant.stay.dto.request.CashierShiftOpenRequest;
import plant.stay.dto.request.CashierShiftReopenRequest;
import plant.stay.dto.response.CashierShiftResponse;
import plant.stay.model.User;

import java.time.LocalDate;
import java.util.List;

/**
 * Service quản lý ca thu ngân (Cashier Shift) trong hệ thống StayAway PMS.
 * Bao gồm các nghiệp vụ: mở ca, đối soát doanh thu, chốt ca và mở lại ca.
 */
public interface CashierShiftService {

    /**
     * Mở ca thu ngân mới cho nhân viên thu ngân / lễ tân.
     *
     * @param request Dữ liệu mở ca (số tiền quỹ đầu ca, ghi chú mở ca)
     * @param actor   Người dùng thực hiện thao tác mở ca
     * @return Thông tin ca thu ngân vừa được mở
     */
    CashierShiftResponse open(CashierShiftOpenRequest request, User actor);

    /**
     * Lấy thông tin ca thu ngân hiện tại đang mở của nhân viên đang đăng nhập.
     *
     * @param actor Người dùng hiện tại
     * @return Thông tin ca thu ngân kèm số liệu thống kê tạm tính
     */
    CashierShiftResponse getCurrent(User actor);

    /**
     * Xem trước báo cáo tổng kết ca thu ngân trước khi thực hiện chốt ca.
     * Tính toán tổng tiền mặt, chuyển khoản, thẻ, tiền cọc và tiền mặt lý thuyết cần bàn giao.
     *
     * @param shiftId Mã định danh ca thu ngân
     * @param actor   Người dùng yêu cầu xem trước
     * @return Báo cáo đối soát doanh thu tạm thời của ca
     */
    CashierShiftResponse preview(Long shiftId, User actor);

    /**
     * Chốt ca thu ngân và bàn giao tiền mặt.
     * So sánh tiền mặt thực tế với tiền mặt lý thuyết, ghi nhận chênh lệch (nếu có) và tạo snapshot chốt ca.
     *
     * @param shiftId Mã định danh ca thu ngân cần chốt
     * @param request Dữ liệu chốt ca (tiền mặt thực tế đếm được, giải trình chênh lệch)
     * @param actor   Người dùng thực hiện chốt ca
     * @return Thông tin ca sau khi chốt thành công kèm mã bản ghi chốt ca (closingId)
     */
    CashierShiftResponse close(Long shiftId, CashierShiftCloseRequest request, User actor);

    /**
     * Mở lại ca thu ngân đã chốt để điều chỉnh hoặc bổ sung chứng từ.
     * Lưu ý: Chỉ Chủ cơ sở (OWNER) mới có quyền mở lại ca và sổ ngày tương ứng phải chưa bị khóa.
     *
     * @param shiftId Mã định danh ca thu ngân cần mở lại
     * @param request Dữ liệu yêu cầu mở lại ca (lý do mở lại)
     * @param actor   Người dùng thực hiện (yêu cầu role OWNER)
     * @return Thông tin ca sau khi mở lại về trạng thái OPEN
     */
    CashierShiftResponse reopen(Long shiftId, CashierShiftReopenRequest request, User actor);

    /**
     * Lấy thông tin chi tiết của một ca thu ngân theo mã ID.
     *
     * @param shiftId Mã định danh ca thu ngân
     * @param actor   Người dùng yêu cầu xem
     * @return Chi tiết ca thu ngân và các số liệu tài chính liên quan
     */
    CashierShiftResponse getById(Long shiftId, User actor);

    /**
     * Lấy danh sách các ca thu ngân theo ngày và bộ lọc chênh lệch tiền mặt.
     *
     * @param date           Ngày cần lọc danh sách ca thu ngân
     * @param hasDiscrepancy Lọc ca có chênh lệch tiền mặt (true/false, hoặc null để lấy tất cả)
     * @return Danh sách các ca thu ngân thỏa mãn điều kiện lọc
     */
    List<CashierShiftResponse> list(LocalDate date, Boolean hasDiscrepancy);

    /**
     * Lấy lịch sử tất cả các ca thu ngân của một nhân viên cụ thể.
     *
     * @param actor Nhân viên cần xem lịch sử ca làm việc
     * @return Danh sách các ca thu ngân của nhân viên đó theo thứ tự thời gian
     */
    List<CashierShiftResponse> history(User actor);
}