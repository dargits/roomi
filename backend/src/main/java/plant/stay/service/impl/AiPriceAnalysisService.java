package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.PriceSuggestionDto;
import plant.stay.dto.response.PriceSuggestionResponse;
import plant.stay.model.HotelSetting;
import plant.stay.model.RoomType;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.HotelSettingRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.repository.RoomTypeRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * AiPriceAnalysisService — Phân tích giá thông minh bằng AI.
 * Nạp dữ liệu công suất, doanh thu, thị trường vào context → Gemini đưa ra khuyến nghị cụ thể.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiPriceAnalysisService {

    private final GeminiService geminiService;
    private final HotelSettingRepository hotelSettingRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Phân tích toàn bộ danh sách gợi ý giá bằng AI.
     * Nhận kết quả từ rule-based system, nạp vào context và hỏi AI để có phân tích sâu hơn.
     *
     * @param suggestionData Dữ liệu gợi ý từ hệ thống rule-based
     * @return Phân tích và khuyến nghị chi tiết từ AI (dạng text/markdown)
     */
    public String analyzeOverall(PriceSuggestionResponse suggestionData) {
        String context = buildPriceContext(suggestionData);
        String question = "Dựa trên dữ liệu công suất và gợi ý giá trên, hãy:\n" +
                "1. Phân tích xu hướng đặt phòng tổng quan\n" +
                "2. Đưa ra khuyến nghị điều chỉnh giá cụ thể cho từng loại phòng\n" +
                "3. Gợi ý chiến lược tăng doanh thu trong 30 ngày tới\n" +
                "4. Cảnh báo các ngày cần chú ý đặc biệt\n\n" +
                "Trả lời bằng tiếng Việt, dùng định dạng markdown rõ ràng với heading và bullet points.";
        return geminiService.chat(context, question);
    }

    /**
     * Phân tích chi tiết cho một ngày cụ thể.
     *
     * @param dto  Dữ liệu gợi ý của ngày cụ thể
     * @param userQuestion Câu hỏi của người dùng về ngày đó
     * @return Phân tích chi tiết từ AI
     */
    public String analyzeDay(PriceSuggestionDto dto, String userQuestion) {
        String context = buildDayContext(dto);
        String finalQuestion = userQuestion != null && !userQuestion.isBlank()
                ? userQuestion
                : "Phân tích tình trạng ngày này và đề xuất chiến lược giá cụ thể. Trả lời bằng tiếng Việt.";
        return geminiService.chat(context, finalQuestion);
    }

    /**
     * Trả lời câu hỏi tùy ý về giá/doanh thu từ staff (OWNER/ADMIN).
     */
    public String askAboutPricing(String userQuestion, PriceSuggestionResponse suggestionData) {
        String context = buildPriceContext(suggestionData);
        return geminiService.chat(context, userQuestion);
    }

    // ===== Context Builders =====

    @Transactional(readOnly = true)
    protected String buildPriceContext(PriceSuggestionResponse data) {
        StringBuilder sb = new StringBuilder();
        sb.append("# Bạn là chuyên gia tư vấn định giá phòng và tối ưu doanh thu khách sạn (Revenue Management Expert)\n\n");

        // Thông tin khách sạn
        HotelSetting setting = hotelSettingRepository.findById(1L).orElse(null);
        if (setting != null) {
            sb.append("## Khách sạn: ").append(setting.getPropertyName()).append("\n");
            sb.append("- Địa chỉ: ").append(setting.getAddress()).append("\n");
            sb.append("- Ngưỡng lấp đầy CAO (cân nhắc tăng giá): ").append(data.getHighOccupancyThreshold()).append("%\n");
            sb.append("- Ngưỡng lấp đầy THẤP (cân nhắc giảm giá): ").append(data.getLowOccupancyThreshold()).append("%\n");
            sb.append("- Ngưỡng ngày cận kề: ").append(data.getImminentDaysThreshold()).append(" ngày\n\n");
        }

        // Thông tin loại phòng
        List<RoomType> roomTypes = roomTypeRepository.findAll();
        sb.append("## Danh mục loại phòng & Giá cơ sở\n");
        for (RoomType rt : roomTypes) {
            sb.append("- **").append(rt.getName()).append("**: Giá niêm yết ").append(formatCurrency(rt.getBasePrice())).append(" VNĐ/đêm");
            if (rt.getMaxCapacity() != null) sb.append(", tối đa ").append(rt.getMaxCapacity()).append(" khách");
            sb.append("\n");
        }
        sb.append("\n");

        // Tính toán các chỉ số kinh doanh tổng hợp 30 ngày
        List<PriceSuggestionDto> suggestions = data.getSuggestions() != null ? data.getSuggestions() : List.of();
        int totalDays = suggestions.size();
        long totalOccupiedNights = 0;
        long totalAvailableNights = 0;
        int weekendDaysCount = 0;
        long weekendOccupiedNights = 0;
        long weekendAvailableNights = 0;
        int weekdayDaysCount = 0;
        long weekdayOccupiedNights = 0;
        long weekdayAvailableNights = 0;
        BigDecimal estimatedRevenue = BigDecimal.ZERO;

        for (PriceSuggestionDto s : suggestions) {
            long occ = s.getOccupiedRooms();
            long tot = s.getTotalRooms();
            totalOccupiedNights += occ;
            totalAvailableNights += tot;

            boolean isWeekend = "Thứ 6".equalsIgnoreCase(s.getDayOfWeek())
                    || "Thứ 7".equalsIgnoreCase(s.getDayOfWeek())
                    || "Chủ Nhật".equalsIgnoreCase(s.getDayOfWeek());

            if (isWeekend) {
                weekendDaysCount++;
                weekendOccupiedNights += occ;
                weekendAvailableNights += tot;
            } else {
                weekdayDaysCount++;
                weekdayOccupiedNights += occ;
                weekdayAvailableNights += tot;
            }

            // Ước tính doanh thu từ breakdown nếu có
            if (s.getRoomTypeBreakdown() != null) {
                for (PriceSuggestionDto.RoomTypeOccupancyDto rt : s.getRoomTypeBreakdown()) {
                    if (rt.getBasePrice() != null) {
                        estimatedRevenue = estimatedRevenue.add(
                                rt.getBasePrice().multiply(BigDecimal.valueOf(rt.getOccupiedRooms()))
                        );
                    }
                }
            }
        }

        double avgOccupancy = totalAvailableNights > 0
                ? (double) totalOccupiedNights / totalAvailableNights * 100.0
                : 0.0;
        double weekendAvgOccupancy = weekendAvailableNights > 0
                ? (double) weekendOccupiedNights / weekendAvailableNights * 100.0
                : 0.0;
        double weekdayAvgOccupancy = weekdayAvailableNights > 0
                ? (double) weekdayOccupiedNights / weekdayAvailableNights * 100.0
                : 0.0;

        sb.append("## Chỉ số vận hành tổng hợp (30 ngày tới)\n");
        sb.append(String.format("- Tỷ lệ lấp đầy trung bình 30 ngày: **%.1f%%** (%d/%d lượt phòng-đêm)\n",
                avgOccupancy, totalOccupiedNights, totalAvailableNights));
        sb.append(String.format("- Công suất Cuối tuần (T6-CN, %d ngày): **%.1f%%** (%d/%d phòng)\n",
                weekendDaysCount, weekendAvgOccupancy, weekendOccupiedNights, weekendAvailableNights));
        sb.append(String.format("- Công suất Giữa tuần (T2-T5, %d ngày): **%.1f%%** (%d/%d phòng)\n",
                weekdayDaysCount, weekdayAvgOccupancy, weekdayOccupiedNights, weekdayAvailableNights));
        sb.append("- Doanh thu phòng dự kiến hiện tại: **").append(formatCurrency(estimatedRevenue)).append(" VNĐ**\n");
        sb.append("- Số ngày khuyến nghị TĂNG GIÁ (nhu cầu cao): **").append(data.getIncreaseCount()).append(" ngày**\n");
        sb.append("- Số ngày khuyến nghị GIẢM GIÁ / MỞ KÊNH (nguy cơ ế phòng): **").append(data.getDecreaseCount()).append(" ngày**\n");
        sb.append("- Độ tin cậy dữ liệu lịch sử: **").append(data.isHasFullYearData() ? "Cao (đã có dữ liệu cùng kỳ năm ngoái)" : "Trung bình (dựa trên ngưỡng cấu hình)").append("**\n\n");

        // Chi tiết toàn bộ 30 ngày tới
        if (!suggestions.isEmpty()) {
            sb.append("## Chi tiết công suất và tình trạng từng ngày (30 ngày tới)\n");
            sb.append("| Ngày | Thứ | Lấp đầy | Đã đặt / Tổng | Phòng trống | Khuyến nghị hệ thống |\n");
            sb.append("|------|-----|---------|---------------|-------------|----------------------|\n");
            for (PriceSuggestionDto s : suggestions) {
                sb.append("| ").append(s.getTargetDate().format(DATE_FMT))
                        .append(" | ").append(s.getDayOfWeek())
                        .append(" | ").append(s.getCurrentOccupancyRate()).append("%")
                        .append(" | ").append(s.getOccupiedRooms()).append("/").append(s.getTotalRooms())
                        .append(" | ").append(s.getVacantRooms())
                        .append(" | ").append(mapSuggestionTypeVi(s.getSuggestionType()))
                        .append(" |\n");
            }
            sb.append("\n");
        }

        sb.append("## Yêu cầu phản hồi từ AI\n");
        sb.append("1. **Đánh giá tổng quan hiệu suất**: Nhận định về công suất TB, so sánh cuối tuần vs giữa tuần.\n");
        sb.append("2. **Chiến lược giá theo nhóm ngày**: Mức tăng giá cụ thể cho ngày cao điểm/cuối tuần (tăng bao nhiêu % hoặc VNĐ), và giải pháp kích cầu cho ngày giữa tuần (giảm giá flash sale, tạo combo, mở kênh OTA).\n");
        sb.append("3. **Khuyến nghị chi tiết cho từng loại phòng**: Đề xuất mức điều chỉnh giá cụ thể (bằng số tiền VNĐ hoặc %) cho từng hạng phòng.\n");
        sb.append("4. **Cảnh báo các ngày trọng điểm**: Chỉ ra các ngày cụ thể cần can thiệp giá ngay lập tức.\n");
        sb.append("5. **Dự báo tiềm năng doanh thu**: Ước tính doanh thu có thể tăng thêm sau khi tối ưu định giá.\n");
        sb.append("Trình bày bằng tiếng Việt chuyên nghiệp, định dạng markdown rõ ràng, sử dụng bullet point và in đậm các số liệu quan trọng.\n");

        return sb.toString();
    }

    private String buildDayContext(PriceSuggestionDto dto) {
        StringBuilder sb = new StringBuilder();
        sb.append("# Chuyên gia tư vấn định giá khách sạn\n\n");
        sb.append("## Dữ liệu ngày ").append(dto.getTargetDate().format(DATE_FMT))
                .append(" (").append(dto.getDayOfWeek()).append(")\n");
        sb.append("- Số ngày còn lại: ").append(dto.getDaysRemaining()).append(" ngày\n");
        sb.append("- Tổng phòng: ").append(dto.getTotalRooms()).append("\n");
        sb.append("- Đã đặt: ").append(dto.getOccupiedRooms()).append("\n");
        sb.append("- Còn trống: ").append(dto.getVacantRooms()).append("\n");
        sb.append("- Tỷ lệ lấp đầy: ").append(dto.getCurrentOccupancyRate()).append("%\n");
        if (dto.getReferenceOccupancyRate() != null) {
            sb.append("- Cùng kỳ năm trước: ").append(dto.getReferenceOccupancyRate()).append("%\n");
        }
        sb.append("- Ngưỡng cao: ").append(dto.getHighThreshold()).append("%\n");
        sb.append("- Ngưỡng thấp: ").append(dto.getLowThreshold()).append("%\n");
        sb.append("- Gợi ý hệ thống: ").append(mapSuggestionTypeVi(dto.getSuggestionType())).append("\n");
        sb.append("- Mức tin cậy: ").append("HIGH".equals(dto.getConfidenceLevel()) ? "Cao" : "Thấp").append("\n\n");

        // Chi tiết theo loại phòng
        if (dto.getRoomTypeBreakdown() != null && !dto.getRoomTypeBreakdown().isEmpty()) {
            sb.append("## Phân rã theo loại phòng\n");
            for (PriceSuggestionDto.RoomTypeOccupancyDto rt : dto.getRoomTypeBreakdown()) {
                sb.append("- **").append(rt.getRoomTypeName()).append("**: ")
                        .append(rt.getOccupiedRooms()).append("/").append(rt.getTotalRooms())
                        .append(" phòng đặt, giá ").append(formatCurrency(rt.getBasePrice())).append(" VNĐ\n");
            }
        }

        sb.append("\n## Hướng dẫn\n");
        sb.append("Phân tích chi tiết và đề xuất mức giá cụ thể (VNĐ) cho từng loại phòng trong ngày này.\n");
        sb.append("Xem xét: xu hướng thị trường, ngày trong tuần, số ngày còn lại, cùng kỳ năm trước.\n");

        return sb.toString();
    }

    private String mapSuggestionTypeVi(String type) {
        return switch (type != null ? type : "") {
            case "INCREASE_PRICE" -> "🔴 Cân nhắc tăng giá";
            case "DECREASE_PRICE_OR_CHANNELS" -> "🟡 Giảm giá/mở kênh";
            case "OPTIMAL" -> "🟢 Ổn định";
            default -> type != null ? type : "Không xác định";
        };
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "Liên hệ";
        return String.format("%,.0f", amount.doubleValue());
    }
}
