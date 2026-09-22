package plant.stay.service;

import plant.stay.dto.response.BestSellingServicesReportResponse;

import java.time.LocalDate;

public interface BestSellingServicesReportService {

    /**
     * Báo cáo dịch vụ phụ thu bán chạy trong kỳ:
     * - Liệt kê từng dịch vụ trong danh mục kèm số lượt bán, tổng số lượng, doanh thu và tỷ trọng %
     * - Các dịch vụ 0 lượt bán vẫn hiển thị với số 0 để cân nhắc loại bỏ khỏi danh mục
     * - Doanh thu chỉ lấy từ hóa đơn đã lập (khớp báo cáo doanh thu)
     * - Tách biệt dòng phụ thu sinh tự động (thêm người, lệch giờ) thành nhóm riêng
     * - Cho phép xem theo khoảng thời gian và so sánh giữa các loại phòng
     */
    BestSellingServicesReportResponse getReport(LocalDate from, LocalDate to, Long roomTypeId);

    /**
     * Xuất dữ liệu báo cáo dịch vụ phụ thu bán chạy ra định dạng CSV
     */
    byte[] exportCsv(LocalDate from, LocalDate to);
}
