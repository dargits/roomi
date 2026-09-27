package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.PriceSuggestionDto;
import plant.stay.dto.response.PriceSuggestionResponse;
import plant.stay.model.Booking;
import plant.stay.model.HotelSetting;
import plant.stay.model.RoomType;
import plant.stay.model.WeekendPriceConfig;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.HotelSettingRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.WeekendPriceConfigRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
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
    private final WeekendPriceConfigRepository weekendPriceConfigRepository;

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
        String question = """
                Dựa trên dữ liệu toàn diện (hiệu suất thực tế 30 ngày qua, lượng đặt phòng 30 ngày tới, cơ cấu loại phòng và chính sách giá cuối tuần), hãy cung cấp báo cáo tư vấn chuyên sâu:
                
                1. **Đánh giá hiệu suất kinh doanh & Xu hướng đặt phòng**: So sánh đối chiếu kết quả 30 ngày qua với 30 ngày tới. Phân tích chênh lệch công suất giữa Cuối tuần (T6-CN) và Ngày thường (T2-T5).
                2. **Bảng khuyến nghị giá cụ thể cho từng loại phòng**: Cho 4 hạng phòng (Tiêu chuẩn, Cao cấp, Sang trọng, Tổng thống), đề xuất cụ thể:
                   - Mức giá ngày thường đề xuất (VNĐ/đêm)
                   - Mức giá cuối tuần đề xuất (VNĐ/đêm)
                   - % điều chỉnh so với giá cơ sở hiện tại
                3. **Chiến lược tối ưu theo ngày**:
                   - Chiến lược ngày cao điểm / cuối tuần: chính sách giá surge pricing, số đêm lưu trú tối thiểu (Min LOS).
                   - Chiến lược kích cầu ngày thường (T2-T5): giải pháp khuyến mãi flash sale, combo lưu trú, kênh OTA.
                4. **Top các ngày trọng điểm cần can thiệp giá ngay trong 30 ngày tới**: Chỉ rõ ngày cụ thể và hành động điều chỉnh giá tương ứng.
                5. **Dự báo tiềm năng tăng trưởng doanh thu**: Ước tính doanh thu bổ sung (VNĐ) khi áp dụng khuyến nghị trên.
                
                Trả lời bằng tiếng Việt chuyên nghiệp, sử dụng bảng biểu markdown, heading rõ ràng, in đậm các con số quan trọng.
                """;
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
                : "Phân tích tình trạng ngày này và đề xuất mức giá cụ thể (VNĐ) cho từng loại phòng. Trả lời bằng tiếng Việt.";
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
        sb.append("# Bạn là chuyên gia tư vấn định giá phòng và tối ưu doanh thu khách sạn hàng đầu (Hotel Revenue Management Specialist)\n\n");

        // 1. Thông tin cơ sở lưu trú
        HotelSetting setting = hotelSettingRepository.findById(1L).orElse(null);
        long totalRoomsCount = roomRepository.count();
        if (setting != null) {
            sb.append("## 1. Thông tin Khách Sạn: ").append(setting.getPropertyName()).append("\n");
            sb.append("- Địa chỉ: ").append(setting.getAddress()).append("\n");
            sb.append("- Tổng quy mô phòng vật lý: ").append(totalRoomsCount).append(" phòng\n");
            sb.append("- Ngưỡng lấp đầy CAO (kích hoạt tăng giá): ").append(data.getHighOccupancyThreshold()).append("%\n");
            sb.append("- Ngưỡng lấp đầy THẤP (kích hoạt giảm giá/kích cầu): ").append(data.getLowOccupancyThreshold()).append("%\n");
            sb.append("- Ngưỡng ngày cận kề: ").append(data.getImminentDaysThreshold()).append(" ngày\n\n");
        }

        // 2. Thông tin hạng phòng & Giá niêm yết
        List<RoomType> roomTypes = roomTypeRepository.findAll();
        sb.append("## 2. Danh mục loại phòng & Giá cơ sở niêm yết\n");
        for (RoomType rt : roomTypes) {
            sb.append("- **").append(rt.getName()).append("**: Giá cơ sở ").append(formatCurrency(rt.getBasePrice())).append(" VNĐ/đêm");
            if (rt.getMaxCapacity() != null) sb.append(", sức chứa ").append(rt.getMaxCapacity()).append(" người");
            sb.append("\n");
        }
        sb.append("\n");

        // 3. Chính sách giá cuối tuần hiện hành
        List<WeekendPriceConfig> weekendConfigs = weekendPriceConfigRepository.findAllActive();
        if (!weekendConfigs.isEmpty()) {
            sb.append("## 3. Cấu hình bảng giá cuối tuần đang áp dụng\n");
            for (WeekendPriceConfig wc : weekendConfigs) {
                String rtName = wc.getRoomType() != null ? wc.getRoomType().getName() : "Tất cả";
                sb.append("- **").append(rtName).append("**: Giá cuối tuần (").append(wc.getWeekendDays())
                        .append(") = ").append(formatCurrency(wc.getPricePerNight())).append(" VNĐ/đêm\n");
            }
            sb.append("\n");
        }

        // 4. Baseline thực tế 30 ngày qua (Dữ liệu lịch sử đã phục vụ)
        LocalDate today = LocalDate.now();
        LocalDate past30DaysStart = today.minusDays(30);
        List<Booking> pastBookings = bookingRepository.findCheckedOutBetween(past30DaysStart, today);

        long pastOccupiedNights = 0;
        BigDecimal pastActualRevenue = BigDecimal.ZERO;
        for (Booking b : pastBookings) {
            if (b.getCheckInDate() != null && b.getCheckOutDate() != null) {
                long nights = Math.max(1, ChronoUnit.DAYS.between(b.getCheckInDate(), b.getCheckOutDate()));
                pastOccupiedNights += nights;
            }
            BigDecimal price = b.getActualPrice() != null ? b.getActualPrice() : b.getExpectedPrice();
            if (price != null) {
                pastActualRevenue = pastActualRevenue.add(price);
            }
        }
        long pastTotalPossibleNights = Math.max(1, totalRoomsCount * 30);
        double pastOccupancyRate = ((double) pastOccupiedNights / pastTotalPossibleNights) * 100.0;
        BigDecimal pastAdr = pastOccupiedNights > 0
                ? pastActualRevenue.divide(BigDecimal.valueOf(pastOccupiedNights), RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        sb.append("## 4. Hiệu suất vận hành thực tế 30 ngày qua (Baseline quá khứ)\n");
        sb.append(String.format("- Tỷ lệ lấp đầy thực tế: **%.1f%%** (%d/%d phòng-đêm đã phục vụ)\n",
                pastOccupancyRate, pastOccupiedNights, pastTotalPossibleNights));
        sb.append("- Tổng doanh thu thực tế 30 ngày qua: **").append(formatCurrency(pastActualRevenue)).append(" VNĐ**\n");
        sb.append("- Giá phòng bình quân thực tế (ADR): **").append(formatCurrency(pastAdr)).append(" VNĐ/đêm**\n");
        sb.append("- **Lưu ý đặc thù về hành vi đặt phòng (Booking Lead Time)**: Phần lớn khách hàng của khách sạn có hành vi đặt phòng sát ngày (từ 1 đến 5 ngày trước khi nhận phòng). Vì vậy, công suất ghi nhận trước của các ngày từ 7 đến 30 ngày tới hiện ở mức thấp là hiện tượng bình thường của thị trường, không phải do khách sạn suy giảm doanh thu.\n\n");

        // 5. Tính toán các chỉ số kinh doanh 30 ngày tới (On-the-books)
        List<PriceSuggestionDto> suggestions = data.getSuggestions() != null ? data.getSuggestions() : List.of();
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

            boolean isWeekend = isWeekendDay(s.getDayOfWeek());

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

        sb.append("## 5. Dữ liệu đặt phòng đã ghi nhận (On-the-books) 30 ngày tới\n");
        sb.append(String.format("- Tỷ lệ lấp đầy on-the-books 30 ngày tới: **%.1f%%** (%d/%d phòng-đêm)\n",
                avgOccupancy, totalOccupiedNights, totalAvailableNights));
        sb.append(String.format("- Công suất Cuối tuần (T6-CN, %d ngày): **%.1f%%** (%d/%d phòng)\n",
                weekendDaysCount, weekendAvgOccupancy, weekendOccupiedNights, weekendAvailableNights));
        sb.append(String.format("- Công suất Ngày thường (T2-T5, %d ngày): **%.1f%%** (%d/%d phòng)\n",
                weekdayDaysCount, weekdayAvgOccupancy, weekdayOccupiedNights, weekdayAvailableNights));
        sb.append("- Doanh thu phòng đã đặt trước: **").append(formatCurrency(estimatedRevenue)).append(" VNĐ**\n");
        sb.append("- Số ngày chạm ngưỡng TĂNG GIÁ (nhu cầu cao): **").append(data.getIncreaseCount()).append(" ngày**\n");
        sb.append("- Số ngày chạm ngưỡng GIẢM GIÁ / MỞ KÊNH (nguy cơ ế phòng cận ngày): **").append(data.getDecreaseCount()).append(" ngày**\n");
        sb.append("- Độ tin cậy dữ liệu lịch sử cùng kỳ: **").append(data.isHasFullYearData() ? "Cao (đã có dữ liệu cùng kỳ năm ngoái)" : "Trung bình (dựa trên ngưỡng cấu hình)").append("**\n\n");

        // Chi tiết toàn bộ 30 ngày tới
        if (!suggestions.isEmpty()) {
            sb.append("## 6. Chi tiết công suất và tình trạng từng ngày (30 ngày tới)\n");
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

        return sb.toString();
    }

    private String buildDayContext(PriceSuggestionDto dto) {
        StringBuilder sb = new StringBuilder();
        sb.append("# Chuyên gia tư vấn định giá phòng khách sạn\n\n");
        sb.append("## Dữ liệu ngày ").append(dto.getTargetDate().format(DATE_FMT))
                .append(" (").append(dto.getDayOfWeek()).append(")\n");
        sb.append("- Số ngày còn lại đến ngày nhận phòng: ").append(dto.getDaysRemaining()).append(" ngày\n");
        sb.append("- Tổng số phòng: ").append(dto.getTotalRooms()).append("\n");
        sb.append("- Đã đặt: ").append(dto.getOccupiedRooms()).append("\n");
        sb.append("- Còn trống: ").append(dto.getVacantRooms()).append("\n");
        sb.append("- Tỷ lệ lấp đầy hiện tại: ").append(dto.getCurrentOccupancyRate()).append("%\n");
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
                        .append(" phòng đặt, giá cơ sở ").append(formatCurrency(rt.getBasePrice())).append(" VNĐ\n");
            }
        }

        sb.append("\n## Yêu cầu tư vấn\n");
        sb.append("Phân tích chi tiết và đề xuất mức giá cụ thể bằng VNĐ cho từng loại phòng trong ngày này.\n");
        sb.append("Cân nhắc: ngày cuối tuần hay ngày thường, số ngày còn lại (cận kề hay xa), và tỷ lệ lấp đầy hiện có.\n");

        return sb.toString();
    }

    private boolean isWeekendDay(String dayOfWeek) {
        if (dayOfWeek == null) return false;
        String d = dayOfWeek.toLowerCase().trim();
        return d.contains("sáu") || d.contains("6")
                || d.contains("bảy") || d.contains("7")
                || d.contains("chủ nhật") || d.contains("cn")
                || d.contains("friday") || d.contains("saturday") || d.contains("sunday");
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
        if (amount == null) return "0";
        return String.format("%,.0f", amount.doubleValue());
    }
}
