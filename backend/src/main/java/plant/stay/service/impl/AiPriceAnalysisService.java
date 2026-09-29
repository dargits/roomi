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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * AiPriceAnalysisService — Dịch vụ phân tích và gợi ý điều chỉnh giá phòng bằng AI (Revenue Management).
 * Nạp đầy đủ dữ liệu thời gian thực: hiệu suất lịch sử 30 ngày qua, lượng đặt phòng on-the-books 30 ngày tới,
 * phân rã công suất theo từng hạng phòng cụ thể, cấu hình giá niêm yết, giá cuối tuần và khung biên độ giá an toàn
 * để AI đưa ra khuyến nghị chuẩn xác, khả thi và tối đa hóa doanh thu khách sạn.
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
     * Phân tích tổng thể 30 ngày tới và đưa ra báo cáo khuyến nghị chiến lược giá chi tiết.
     *
     * @param suggestionData Dữ liệu gợi ý từ hệ thống rule-based
     * @return Báo cáo tư vấn chuyên sâu từ AI (định dạng Markdown)
     */
    public String analyzeOverall(PriceSuggestionResponse suggestionData) {
        String context = buildPriceContext(suggestionData);

        List<RoomType> roomTypes = roomTypeRepository.findAll();
        String roomTypesList = roomTypes.stream()
                .map(rt -> rt.getName() + " (Giá niêm yết: " + formatCurrency(rt.getBasePrice()) + " VNĐ/đêm)")
                .collect(Collectors.joining("; "));

        String question = String.format("""
                Dựa trên toàn bộ dữ liệu thực tế (Baseline 30 ngày qua, Đặt phòng On-the-books 30 ngày tới, Phân rã nhu cầu theo từng hạng phòng, và Khung biên độ giá an toàn), hãy đóng vai Chuyên gia Quản trị Doanh thu Khách sạn (Hotel Revenue Management Specialist) để lập Báo cáo Tư vấn Điều chỉnh Giá chuyên sâu cho Ban Quản Lý / Chủ cơ sở:

                1. **Đánh giá hiệu suất kinh doanh & Xu hướng đặt phòng**:
                   - So sánh đối chiếu kết quả 30 ngày qua (Baseline) với lượng phòng đã đặt trước 30 ngày tới (On-the-books).
                   - Phân tích chênh lệch công suất giữa Cuối tuần (T6-CN) và Ngày thường (T2-T5).
                   - Đánh giá phân hóa nhu cầu theo từng hạng phòng cụ thể: hạng phòng nào có nhu cầu cao (cháy phòng), hạng phòng nào còn tồn nhiều.

                2. **Bảng khuyến nghị điều chỉnh giá cho TỪNG HẠNG PHÒNG THỰC TẾ**:
                   *(Áp dụng cho các hạng phòng hiện có của khách sạn: %s)*
                   Lập bảng Markdown chi tiết gồm đầy đủ các cột sau:
                   | Hạng phòng | Giá cơ sở hiện tại | Giá ngày thường đề xuất (T2-T5) | %% Thay đổi | Giá cuối tuần đề xuất (T6-CN) | %% Thay đổi | Căn cứ định giá & Phân khúc khách hàng mục tiêu |
                   *Yêu cầu bắt buộc: Đề xuất mức giá VNĐ cụ thể, làm tròn chẵn (bước nhảy 50.000 hoặc 100.000 VNĐ), tuyệt đối nằm trong khung giá sàn và giá trần an toàn.*

                3. **Top 5 - 7 Ngày trọng điểm cần can thiệp giá ngay trong 30 ngày tới**:
                   - Nêu rõ ngày cụ thể (dd/MM/yyyy), thứ trong tuần, tỷ lệ lấp đầy hiện tại.
                   - Chỉ rõ hành động điều chỉnh: Tăng giá bao nhiêu, áp dụng cho hạng phòng nào (đối với ngày chạm ngưỡng cao) hoặc kích cầu bằng giải pháp gì (đối với ngày cận kề chạm ngưỡng thấp).

                4. **Chiến lược tối ưu phi giá (Non-Price Optimization Strategies)**:
                   - Chính sách Số đêm lưu trú tối thiểu (Min LOS) cho các ngày cuối tuần hoặc cao điểm để tối ưu lấp đầy các ngày giáp ranh.
                   - Giải pháp kích cầu ngày thường (T2-T5): Bán gói combo (kèm buffet sáng, xe đưa đón/thuê xe máy), Flash sale giờ chót (Last-minute deal) mà không làm mất giá trị thương hiệu.
                   - Chiến lược chênh lệch giá nâng hạng (Upselling): Giữ khoảng cách giá hấp dẫn để khách tự nguyện nâng cấp từ hạng thấp lên hạng cao.

                5. **Dự báo tiềm năng tăng trưởng doanh thu**:
                   - Ước tính doanh thu bổ sung dự kiến (bằng VNĐ) khi áp dụng bảng giá đề xuất trên và diễn giải phương pháp tính toán khả thi.

                Trả lời bằng tiếng Việt chuyên nghiệp, sử dụng bảng biểu markdown chỉn chu, heading phân tầng rõ ràng, in đậm các con số và chỉ số then chốt.
                """, roomTypesList);

        return geminiService.chat(context, question);
    }

    /**
     * Phân tích chi tiết cho một ngày cụ thể.
     *
     * @param dto          Dữ liệu gợi ý của ngày cụ thể
     * @param userQuestion Câu hỏi của người dùng về ngày đó
     * @return Phân tích chi tiết từ AI
     */
    public String analyzeDay(PriceSuggestionDto dto, String userQuestion) {
        String context = buildDayContext(dto);
        String finalQuestion = userQuestion != null && !userQuestion.isBlank()
                ? userQuestion
                : """
                  Hãy phân tích chi tiết tình trạng ngày này và đề xuất:
                  1. Đánh giá mức độ cấp thiết điều chỉnh giá dựa trên số ngày còn lại (Lead time) và tỷ lệ lấp đầy.
                  2. Bảng giá đề xuất cụ thể (VNĐ) cho TỪNG loại phòng trong ngày này kèm tỷ lệ % điều chỉnh so với giá cơ sở niêm yết.
                  3. Chiến lược bổ trợ: có nên áp dụng điều kiện Min LOS, hạn chế kênh OTA chiết khấu cao, hay tung ưu đãi giá trị gia tăng (Value-add) không.
                  Trả lời bằng tiếng Việt chuyên nghiệp, có bảng biểu rõ ràng.
                  """;
        return geminiService.chat(context, finalQuestion);
    }

    /**
     * Trả lời câu hỏi nghiệp vụ tùy ý về định giá/doanh thu từ Chủ cơ sở (OWNER) hoặc Quản trị viên (ADMIN).
     */
    public String askAboutPricing(String userQuestion, PriceSuggestionResponse suggestionData) {
        String context = buildPriceContext(suggestionData);
        return geminiService.chat(context, userQuestion);
    }

    // ===== Context Builders =====

    @Transactional(readOnly = true)
    protected String buildPriceContext(PriceSuggestionResponse data) {
        StringBuilder sb = new StringBuilder();
        sb.append("# Bạn là Chuyên gia Tư vấn Định giá Phòng & Tối ưu Doanh thu Khách sạn hàng đầu (Hotel Revenue Management Specialist)\n\n");

        // 1. Thông tin cơ sở lưu trú và cấu hình ngưỡng
        HotelSetting setting = hotelSettingRepository.findById(1L).orElse(null);
        long totalRoomsCount = roomRepository.count();
        String hotelName = setting != null && setting.getPropertyName() != null ? setting.getPropertyName() : "Khách sạn Stay Away";

        sb.append("## 1. Thông tin Cơ sở lưu trú & Cấu hình Ngưỡng điều hành\n");
        sb.append("- Tên khách sạn: **").append(hotelName).append("**\n");
        if (setting != null && setting.getAddress() != null) {
            sb.append("- Địa chỉ: ").append(setting.getAddress()).append("\n");
        }
        sb.append("- Tổng quy mô phòng vật lý: **").append(totalRoomsCount).append(" phòng**\n");
        sb.append("- Ngưỡng lấp đầy CAO (kích hoạt tăng giá / Surge pricing): **").append(data.getHighOccupancyThreshold()).append("%**\n");
        sb.append("- Ngưỡng lấp đầy THẤP (kích hoạt kích cầu / Giảm giá cận ngày): **").append(data.getLowOccupancyThreshold()).append("%**\n");
        sb.append("- Ngưỡng số ngày cận kề (Imminent window): **").append(data.getImminentDaysThreshold()).append(" ngày**\n\n");

        // 2. Danh mục loại phòng, Giá niêm yết, Giá cuối tuần & Khung biên độ giá an toàn
        List<RoomType> roomTypes = roomTypeRepository.findAll();
        List<WeekendPriceConfig> weekendConfigs = weekendPriceConfigRepository.findAllActive();

        sb.append("## 2. Danh mục hạng phòng, Giá niêm yết & Khung biên độ giá an toàn\n");
        sb.append("| Hạng phòng | Giá niêm yết (Ngày thường) | Giá cuối tuần hiện hành | Sức chứa | Giá sàn an toàn (-25%) | Giá trần cao điểm (+50%) |\n");
        sb.append("|------------|----------------------------|-------------------------|----------|------------------------|--------------------------|\n");

        for (RoomType rt : roomTypes) {
            BigDecimal base = rt.getBasePrice() != null ? rt.getBasePrice() : BigDecimal.ZERO;
            BigDecimal floor = base.multiply(new BigDecimal("0.75")).setScale(0, RoundingMode.HALF_UP);
            BigDecimal ceiling = base.multiply(new BigDecimal("1.50")).setScale(0, RoundingMode.HALF_UP);

            String weekendStr = "Theo giá ngày thường";
            Optional<WeekendPriceConfig> wcOpt = weekendConfigs.stream()
                    .filter(wc -> wc.getRoomType() != null && rt.getId().equals(wc.getRoomType().getId()))
                    .findFirst();
            if (wcOpt.isPresent()) {
                weekendStr = formatCurrency(wcOpt.get().getPricePerNight()) + " VNĐ (" + wcOpt.get().getWeekendDays() + ")";
            }

            sb.append("| **").append(rt.getName()).append("**")
                    .append(" | ").append(formatCurrency(base)).append(" VNĐ")
                    .append(" | ").append(weekendStr)
                    .append(" | ").append(rt.getMaxCapacity() != null ? rt.getMaxCapacity() + " người" : "2 người")
                    .append(" | ").append(formatCurrency(floor)).append(" VNĐ")
                    .append(" | ").append(formatCurrency(ceiling)).append(" VNĐ")
                    .append(" |\n");
        }
        sb.append("\n*Quy tắc bảo vệ biên lợi nhuận: Không đề xuất mức giá thấp hơn Giá sàn để tránh phá vỡ định vị thương hiệu và chi phí biến đổi (giặt ủi, dọn dẹp, điện nước); không vượt quá Giá trần ngày thường để tránh mất tính cạnh tranh.*\n\n");

        // 3. Baseline thực tế 30 ngày qua (Hiệu suất đã phục vụ)
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

        sb.append("## 3. Hiệu suất vận hành thực tế 30 ngày qua (Baseline lịch sử)\n");
        sb.append(String.format("- Tỷ lệ lấp đầy thực tế: **%.1f%%** (%d/%d phòng-đêm đã phục vụ)\n",
                pastOccupancyRate, pastOccupiedNights, pastTotalPossibleNights));
        sb.append("- Tổng doanh thu thực tế 30 ngày qua: **").append(formatCurrency(pastActualRevenue)).append(" VNĐ**\n");
        sb.append("- Giá phòng bình quân thực tế (ADR): **").append(formatCurrency(pastAdr)).append(" VNĐ/đêm**\n");
        sb.append("- **Đặc thù hành vi đặt phòng (Booking Lead Time)**: Khách hàng thường đặt phòng sát ngày (1 đến 5 ngày trước check-in). Do đó, tỷ lệ lấp đầy on-the-books của các ngày xa (từ 7 đến 30 ngày tới) hiện tại đang ở mức tự nhiên, khách sạn không nên vội vàng hạ giá sớm.\n\n");

        // 4. Tổng hợp đặt phòng ghi nhận trước 30 ngày tới (On-the-books)
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

        // Tổng hợp công suất theo từng hạng phòng trong 30 ngày tới
        Map<String, Long> rtOccupiedMap = new HashMap<>();
        Map<String, Long> rtTotalMap = new HashMap<>();
        Map<String, BigDecimal> rtBasePriceMap = new HashMap<>();

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

            if (s.getRoomTypeBreakdown() != null) {
                for (PriceSuggestionDto.RoomTypeOccupancyDto rt : s.getRoomTypeBreakdown()) {
                    String name = rt.getRoomTypeName();
                    rtOccupiedMap.put(name, rtOccupiedMap.getOrDefault(name, 0L) + rt.getOccupiedRooms());
                    rtTotalMap.put(name, rtTotalMap.getOrDefault(name, 0L) + rt.getTotalRooms());
                    if (rt.getBasePrice() != null) {
                        rtBasePriceMap.putIfAbsent(name, rt.getBasePrice());
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

        sb.append("## 4. Dữ liệu đặt phòng đã ghi nhận (On-the-books) 30 ngày tới\n");
        sb.append(String.format("- Tỷ lệ lấp đầy on-the-books toàn khách sạn: **%.1f%%** (%d/%d phòng-đêm)\n",
                avgOccupancy, totalOccupiedNights, totalAvailableNights));
        sb.append(String.format("- Công suất Cuối tuần (T6-CN, %d ngày): **%.1f%%** (%d/%d phòng-đêm)\n",
                weekendDaysCount, weekendAvgOccupancy, weekendOccupiedNights, weekendAvailableNights));
        sb.append(String.format("- Công suất Ngày thường (T2-T5, %d ngày): **%.1f%%** (%d/%d phòng-đêm)\n",
                weekdayDaysCount, weekdayAvgOccupancy, weekdayOccupiedNights, weekdayAvailableNights));
        sb.append("- Doanh thu phòng đã ký nhận trước: **").append(formatCurrency(estimatedRevenue)).append(" VNĐ**\n");
        sb.append("- Số ngày chạm ngưỡng TĂNG GIÁ (Cầu cao >= ").append(data.getHighOccupancyThreshold()).append("%): **").append(data.getIncreaseCount()).append(" ngày**\n");
        sb.append("- Số ngày chạm ngưỡng GIẢM GIÁ / MỞ KÊNH (Cận ngày nguy cơ ế <= ").append(data.getLowOccupancyThreshold()).append("%): **").append(data.getDecreaseCount()).append(" ngày**\n");
        sb.append("- Mức độ tin cậy dữ liệu cùng kỳ: **").append(data.isHasFullYearData() ? "Cao (Đã có dữ liệu lịch sử cùng kỳ năm ngoái)" : "Trung bình (Dựa trên ngưỡng cấu hình thực tế)").append("**\n\n");

        // 5. Phân rã nhu cầu theo từng hạng phòng (Room Type Demand Breakdown)
        if (!rtTotalMap.isEmpty()) {
            sb.append("## 5. Phân rã nhu cầu và tỷ lệ lấp đầy theo từng Hạng phòng (30 ngày tới)\n");
            sb.append("| Hạng phòng | Đã đặt trước (phòng-đêm) | Tổng cung (phòng-đêm) | Tỷ lệ lấp đầy | Đánh giá mức độ cầu |\n");
            sb.append("|------------|--------------------------|-----------------------|---------------|----------------------|\n");
            for (Map.Entry<String, Long> entry : rtTotalMap.entrySet()) {
                String rName = entry.getKey();
                long tot = entry.getValue();
                long occ = rtOccupiedMap.getOrDefault(rName, 0L);
                double rate = tot > 0 ? ((double) occ / tot) * 100.0 : 0.0;
                String demandAssess = rate >= 70.0 ? "🔥 Rất cao (Nguy cơ cháy phòng)" :
                        rate >= 40.0 ? "⚡ Tốt (Ổn định)" : "💤 Chậm (Cần chiến lược kích cầu)";
                sb.append("| **").append(rName).append("**")
                        .append(" | ").append(occ)
                        .append(" | ").append(tot)
                        .append(" | ").append(String.format("%.1f%%", rate))
                        .append(" | ").append(demandAssess)
                        .append(" |\n");
            }
            sb.append("\n");
        }

        // 6. Chi tiết từng ngày trong 30 ngày tới kèm trạng thái hạng phòng
        if (!suggestions.isEmpty()) {
            sb.append("## 6. Bảng theo dõi công suất và tình trạng từng ngày (30 ngày tới)\n");
            sb.append("| Ngày | Thứ | Lấp đầy | Đã đặt / Tổng | Phòng trống | Khuyến nghị hệ thống | Trạng thái từng hạng phòng |\n");
            sb.append("|------|-----|---------|---------------|-------------|----------------------|----------------------------|\n");
            for (PriceSuggestionDto s : suggestions) {
                StringBuilder rtDetail = new StringBuilder();
                if (s.getRoomTypeBreakdown() != null) {
                    for (PriceSuggestionDto.RoomTypeOccupancyDto rtb : s.getRoomTypeBreakdown()) {
                        if (rtDetail.length() > 0) rtDetail.append(", ");
                        rtDetail.append(rtb.getRoomTypeName()).append(": ").append(rtb.getOccupiedRooms()).append("/").append(rtb.getTotalRooms());
                    }
                }

                sb.append("| ").append(s.getTargetDate().format(DATE_FMT))
                        .append(" | ").append(s.getDayOfWeek())
                        .append(" | ").append(s.getCurrentOccupancyRate()).append("%")
                        .append(" | ").append(s.getOccupiedRooms()).append("/").append(s.getTotalRooms())
                        .append(" | ").append(s.getVacantRooms())
                        .append(" | ").append(mapSuggestionTypeVi(s.getSuggestionType()))
                        .append(" | ").append(rtDetail.toString())
                        .append(" |\n");
            }
            sb.append("\n");
        }

        // 7. Khung nguyên tắc Quản trị Doanh thu (Revenue Management Framework)
        sb.append("## 7. Khung nguyên tắc Quản trị Doanh thu & Định giá động (Revenue Management Rules)\n");
        sb.append("1. **Nguyên tắc Surge Pricing (Ngày nhu cầu cao >= Ngưỡng cao)**: Tăng giá theo bậc (+10% đến +25%) cho các hạng phòng đang bán chạy. Tạm dừng các chương trình khuyến mãi sâu trên kênh OTA. Đối với ngày cuối tuần, áp dụng điều kiện lưu trú tối thiểu 2 đêm (Min LOS = 2) để kéo thêm đêm ở cho ngày Thứ 6 hoặc Chủ Nhật.\n");
        sb.append("2. **Nguyên tắc Kích cầu cận ngày (Cận kề <= ").append(data.getImminentDaysThreshold()).append(" ngày & Lấp đầy thấp)**: Chỉ giảm giá nhẹ (-10% đến -15%) cho các ngày sát nút. Ưu tiên tặng giá trị gia tăng (Value-add: miễn phí buffet sáng, miễn phí nhận phòng sớm/trả muộn, voucher thuê xe) thay vì giảm giá sốc để tránh phá giá thương hiệu.\n");
        sb.append("3. **Nguyên tắc Giữ giá ngày xa (> ").append(data.getImminentDaysThreshold()).append(" ngày)**: Tuyệt đối KHÔNG giảm giá sớm đối với các ngày còn cách xa, vì hành vi đặt phòng phần lớn diễn ra sát ngày (1-5 ngày). Giữ giá niêm yết để tối đa hóa doanh thu từ khách đặt sát ngày sẵn sàng trả giá cao.\n");
        sb.append("4. **Nguyên tắc Định giá chéo & Nâng hạng (Upselling)**: Khi hạng phòng tiêu chuẩn đã đầy hoặc tăng giá, giữ khoảng cách giá chênh lệch vừa phải (150.000 - 250.000 VNĐ) giữa các hạng phòng để khuyến khích khách tự nâng cấp lên hạng Cao Cấp hoặc Sang Trọng.\n\n");

        return sb.toString();
    }

    private String buildDayContext(PriceSuggestionDto dto) {
        StringBuilder sb = new StringBuilder();
        sb.append("# Chuyên gia Tư vấn Định giá Phòng Khách sạn — Phân tích Chi tiết Theo Ngày\n\n");
        sb.append("## Dữ liệu ngày ").append(dto.getTargetDate().format(DATE_FMT))
                .append(" (").append(dto.getDayOfWeek()).append(")\n");
        sb.append("- Số ngày còn lại đến ngày nhận phòng: **").append(dto.getDaysRemaining()).append(" ngày**\n");
        sb.append("- Tổng số phòng: **").append(dto.getTotalRooms()).append(" phòng**\n");
        sb.append("- Đã đặt: **").append(dto.getOccupiedRooms()).append(" phòng**\n");
        sb.append("- Còn trống: **").append(dto.getVacantRooms()).append(" phòng**\n");
        sb.append("- Tỷ lệ lấp đầy hiện tại: **").append(dto.getCurrentOccupancyRate()).append("%**\n");
        if (dto.getReferenceOccupancyRate() != null) {
            sb.append("- Cùng kỳ năm trước: **").append(dto.getReferenceOccupancyRate()).append("%**\n");
        }
        sb.append("- Ngưỡng cao kích hoạt tăng giá: **").append(dto.getHighThreshold()).append("%**\n");
        sb.append("- Ngưỡng thấp kích hoạt kích cầu: **").append(dto.getLowThreshold()).append("%**\n");
        sb.append("- Khuyến nghị từ hệ thống: **").append(mapSuggestionTypeVi(dto.getSuggestionType())).append("**\n");
        sb.append("- Mức độ tin cậy dữ liệu: **").append("HIGH".equals(dto.getConfidenceLevel()) ? "Cao" : "Thấp").append("**\n\n");

        // Chi tiết từng loại phòng trong ngày
        if (dto.getRoomTypeBreakdown() != null && !dto.getRoomTypeBreakdown().isEmpty()) {
            sb.append("## Tình trạng phân rã theo từng hạng phòng trong ngày\n");
            sb.append("| Hạng phòng | Đã đặt | Tổng phòng | Còn trống | Giá cơ sở niêm yết | Giá sàn an toàn (-25%) | Giá trần cao điểm (+50%) |\n");
            sb.append("|------------|--------|------------|-----------|--------------------|------------------------|--------------------------|\n");
            for (PriceSuggestionDto.RoomTypeOccupancyDto rt : dto.getRoomTypeBreakdown()) {
                BigDecimal base = rt.getBasePrice() != null ? rt.getBasePrice() : BigDecimal.ZERO;
                BigDecimal floor = base.multiply(new BigDecimal("0.75")).setScale(0, RoundingMode.HALF_UP);
                BigDecimal ceiling = base.multiply(new BigDecimal("1.50")).setScale(0, RoundingMode.HALF_UP);

                sb.append("| **").append(rt.getRoomTypeName()).append("**")
                        .append(" | ").append(rt.getOccupiedRooms())
                        .append(" | ").append(rt.getTotalRooms())
                        .append(" | ").append(rt.getVacantRooms())
                        .append(" | ").append(formatCurrency(base)).append(" VNĐ")
                        .append(" | ").append(formatCurrency(floor)).append(" VNĐ")
                        .append(" | ").append(formatCurrency(ceiling)).append(" VNĐ")
                        .append(" |\n");
            }
            sb.append("\n");
        }

        sb.append("## Yêu cầu tư vấn định giá cho ngày này:\n");
        sb.append("- Đề xuất mức giá cụ thể bằng VNĐ cho TỪNG loại phòng trong ngày ").append(dto.getTargetDate().format(DATE_FMT)).append(".\n");
        sb.append("- Giải thích lý do căn cứ vào số ngày còn lại (").append(dto.getDaysRemaining()).append(" ngày), tỷ lệ lấp đầy hiện tại (").append(dto.getCurrentOccupancyRate()).append("%), và tình trạng phòng trống của từng hạng.\n");
        sb.append("- Đưa ra hành động bổ trợ: có cần điều chỉnh số đêm tối thiểu (Min LOS), mở/đóng kênh OTA, hay tạo ưu đãi gia tăng giá trị không.\n");

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
            case "INCREASE_PRICE" -> "🔴 Cân nhắc tăng giá (Cầu cao)";
            case "DECREASE_PRICE_OR_CHANNELS" -> "🟡 Giảm giá/Kích cầu cận ngày";
            case "OPTIMAL" -> "🟢 Lấp đầy lý tưởng";
            default -> type != null ? type : "Bình thường";
        };
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "0";
        return String.format(java.util.Locale.GERMANY, "%,.0f", amount.doubleValue());
    }
}
