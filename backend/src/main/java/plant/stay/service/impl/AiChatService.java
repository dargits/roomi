package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
 * AiChatService — Dịch vụ chat AI dành cho khách vãng lai (public).
 * Nạp dữ liệu khách sạn (loại phòng, giá, chính sách) vào context để AI trả lời.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService {

    private final GeminiService geminiService;
    private final HotelSettingRepository hotelSettingRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Trả lời câu hỏi của khách về khách sạn.
     *
     * @param userMessage Câu hỏi của khách
     * @param checkIn     Ngày check-in (nullable)
     * @param checkOut    Ngày check-out (nullable)
     * @return Câu trả lời từ AI
     */
    public String chat(String userMessage, LocalDate checkIn, LocalDate checkOut) {
        String systemPrompt = buildHotelContext(checkIn, checkOut);
        return geminiService.chat(systemPrompt, userMessage);
    }

    /**
     * Xây dựng system prompt chứa đầy đủ thông tin khách sạn, loại phòng, giá, chính sách.
     */
    @Transactional(readOnly = true)
    protected String buildHotelContext(LocalDate checkIn, LocalDate checkOut) {
        StringBuilder sb = new StringBuilder();

        // Thông tin cơ bản khách sạn
        HotelSetting setting = hotelSettingRepository.findById(1L).orElse(null);
        sb.append("# Bạn là trợ lý AI của khách sạn\n\n");

        if (setting != null) {
            sb.append("## Thông tin khách sạn\n");
            sb.append("- Tên: ").append(setting.getPropertyName()).append("\n");
            sb.append("- Địa chỉ: ").append(setting.getAddress()).append("\n");
            if (setting.getPhone() != null) sb.append("- Điện thoại: ").append(setting.getPhone()).append("\n");
            if (setting.getEmail() != null) sb.append("- Email: ").append(setting.getEmail()).append("\n");
            if (setting.getDefaultCheckinTime() != null)
                sb.append("- Giờ nhận phòng: ").append(setting.getDefaultCheckinTime()).append("\n");
            if (setting.getDefaultCheckoutTime() != null)
                sb.append("- Giờ trả phòng: ").append(setting.getDefaultCheckoutTime()).append("\n");
            sb.append("\n");
        }

        // Danh sách loại phòng và giá
        List<RoomType> roomTypes = roomTypeRepository.findAll();
        if (!roomTypes.isEmpty()) {
            sb.append("## Các loại phòng & giá\n");
            for (RoomType rt : roomTypes) {
                sb.append("### ").append(rt.getName()).append("\n");
                if (rt.getBasePrice() != null) {
                    sb.append("- Giá cơ bản: ").append(formatCurrency(rt.getBasePrice())).append(" VNĐ/đêm\n");
                }
                if (rt.getMaxCapacity() != null) {
                    sb.append("- Sức chứa tối đa: ").append(rt.getMaxCapacity()).append(" người\n");
                }
                if (rt.getAmenitiesDescription() != null && !rt.getAmenitiesDescription().isBlank()) {
                    sb.append("- Tiện nghi: ").append(rt.getAmenitiesDescription()).append("\n");
                }
                // Đếm số phòng
                long roomCount = roomRepository.findAll().stream()
                        .filter(r -> r.getRoomType() != null && rt.getId().equals(r.getRoomType().getId()))
                        .count();
                sb.append("- Số lượng phòng: ").append(roomCount).append(" phòng\n");

                // Kiểm tra tình trạng trống nếu có ngày check-in/out
                if (checkIn != null && checkOut != null) {
                    long occupied = bookingRepository.findForCalendar(checkIn, checkOut).stream()
                            .filter(b -> {
                                if (b.getRoomType() != null) return rt.getId().equals(b.getRoomType().getId());
                                if (b.getRoom() != null && b.getRoom().getRoomType() != null)
                                    return rt.getId().equals(b.getRoom().getRoomType().getId());
                                return false;
                            })
                            .map(b -> b.getRoom() != null ? b.getRoom().getId() : b.getId())
                            .distinct()
                            .count();
                    long available = Math.max(0, roomCount - occupied);
                    sb.append("- Phòng trống (").append(checkIn.format(DATE_FMT))
                            .append(" → ").append(checkOut.format(DATE_FMT))
                            .append("): **").append(available).append(" phòng**\n");
                }
                sb.append("\n");
            }
        }

        // Thống kê nhanh hôm nay
        LocalDate today = LocalDate.now();
        long totalRooms = roomRepository.count();
        long occupiedToday = bookingRepository.findForCalendar(today, today.plusDays(1)).stream()
                .map(b -> b.getRoom() != null ? b.getRoom().getId() : -1L)
                .distinct()
                .count();
        long availableToday = Math.max(0, totalRooms - occupiedToday);
        sb.append("## Tình trạng hiện tại (hôm nay ").append(today.format(DATE_FMT)).append(")\n");
        sb.append("- Tổng phòng: ").append(totalRooms).append("\n");
        sb.append("- Đang có khách: ").append(occupiedToday).append("\n");
        sb.append("- Phòng trống: ").append(availableToday).append("\n\n");

        // Hướng dẫn hành vi AI
        sb.append("## Hướng dẫn cho AI\n");
        sb.append("- Trả lời bằng tiếng Việt thân thiện, lịch sự.\n");
        sb.append("- Chỉ trả lời các câu hỏi liên quan đến khách sạn, đặt phòng, giá cả, chính sách.\n");
        sb.append("- Nếu khách hỏi đặt phòng, hướng dẫn họ gọi điện hoặc đặt trực tuyến.\n");
        sb.append("- Không bịa đặt thông tin không có trong context.\n");
        sb.append("- Trả lời ngắn gọn, súc tích, dùng emoji phù hợp để thân thiện hơn.\n");
        sb.append("- Nếu không biết câu trả lời, hướng dẫn khách liên hệ trực tiếp với khách sạn.\n");

        return sb.toString();
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "Liên hệ";
        return String.format("%,.0f", amount.doubleValue());
    }
}
