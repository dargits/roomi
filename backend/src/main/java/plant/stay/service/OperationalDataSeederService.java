package plant.stay.service;

import plant.stay.model.User;

import java.util.Map;

public interface OperationalDataSeederService {

    /**
     * Tái tạo toàn bộ dữ liệu mẫu vận hành chuẩn chỉnh từ 01/01/2026 đến nay.
     * Toàn bộ dữ liệu được liên kết quan hệ chặt chẽ:
     * - Khách hàng <-> Giấy tờ định danh CCCD <-> Hạng thành viên & Điểm tích lũy theo doanh chi tiêu
     * - Lượt đặt phòng <-> Phòng thực tế <-> Khách hàng <-> Dịch vụ phụ thu <-> Hóa đơn <-> Thanh toán <-> Đặt cọc
     * - Khai báo tạm trú gắn với từng lượt lưu trú
     * - Nhật ký dọn phòng sau trả phòng gắn với nhân viên buồng phòng & kiểm tra nghiệm thu
     * - Ca làm việc thu ngân hàng ngày (ca sáng/chiều) khớp chuẩn xác 100% doanh thu tiền mặt, chuyển khoản, thẻ
     * - Sổ cái tài chính ngày (Daily Ledger) khớp số liệu doanh thu thực thu
     * - Sự cố phòng & Đồ thất lạc gắn đúng phòng và booking
     * - Tự động tạo bản sao lưu toàn diện (.ZIP) lưu trữ trong trung tâm backup
     *
     * @param actor Người thực hiện thao tác (hoặc null nếu hệ thống tự chạy)
     * @return Báo cáo kết quả số lượng bản ghi đã khởi tạo
     */
    Map<String, Object> reseedOperationalData(User actor);
}
