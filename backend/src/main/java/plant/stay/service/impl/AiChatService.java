package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.model.Booking;
import plant.stay.model.CancellationPolicy;
import plant.stay.model.ExtraService;
import plant.stay.model.HotelSetting;
import plant.stay.model.RoomType;
import plant.stay.model.WeekendPriceConfig;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.CancellationPolicyRepository;
import plant.stay.repository.ExtraServiceRepository;
import plant.stay.repository.HotelSettingRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.WeekendPriceConfigRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AiChatService — Dịch vụ trợ lý ảo AI Concierge dành cho khách hàng trực tuyến.
 * Nạp đầy đủ dữ liệu thời gian thực của khách sạn (loại phòng, giá niêm yết, giá cuối tuần,
 * dịch vụ phụ thu, chính sách cọc/hủy/nhận-trả phòng, tính năng tra cứu đơn & hóa đơn trực tuyến)
 * vào context để AI phân tích và đưa ra câu trả lời chuẩn xác, hữu ích nhất.
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
    private final CancellationPolicyRepository cancellationPolicyRepository;
    private final WeekendPriceConfigRepository weekendPriceConfigRepository;
    private final ExtraServiceRepository extraServiceRepository;

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
        String systemPrompt = buildHotelContext(checkIn, checkOut, userMessage);
        return geminiService.chat(systemPrompt, userMessage);
    }

    /**
     * Tương thích ngược: Xây dựng system prompt không kèm tin nhắn người dùng.
     */
    @Transactional(readOnly = true)
    public String buildHotelContext(LocalDate checkIn, LocalDate checkOut) {
        return buildHotelContext(checkIn, checkOut, null);
    }

    /**
     * Xây dựng system prompt giàu dữ liệu thời gian thực: thông tin cơ sở lưu trú,
     * bảng giá phòng niêm yết & cuối tuần, dịch vụ phụ thu, chính sách và cơ chế tra cứu trực tuyến.
     */
    @Transactional(readOnly = true)
    public String buildHotelContext(LocalDate checkIn, LocalDate checkOut, String userMessage) {
        StringBuilder sb = new StringBuilder();

        // 1. Định danh và vai trò trợ lý ảo
        sb.append("# Bạn là StayBot — Trợ lý AI Concierge cao cấp của khách sạn\n\n");
        sb.append("Nhiệm vụ của bạn là tư vấn tận tâm, chính xác, lịch sự và giải đáp mọi thắc mắc của khách về thông tin cơ sở lưu trú, tư vấn chọn phòng phù hợp với số lượng người và ngân sách, thông tin bảng giá, dịch vụ phụ thu, chính sách nhận/trả phòng, chính sách hủy phòng và hướng dẫn tra cứu đơn đặt phòng/hóa đơn trực tuyến.\n\n");

        // 2. Thông tin cơ sở lưu trú
        HotelSetting setting = hotelSettingRepository.findById(1L).orElse(null);
        String hotelName = setting != null && setting.getPropertyName() != null ? setting.getPropertyName() : "Khách sạn Stay Away";
        String hotelPhone = setting != null && setting.getPhone() != null ? setting.getPhone() : "0365224245";
        String hotelEmail = setting != null && setting.getEmail() != null ? setting.getEmail() : "lienhe@stayaway.vn";
        String checkinTime = setting != null && setting.getDefaultCheckinTime() != null ? setting.getDefaultCheckinTime().toString() : "14:00";
        String checkoutTime = setting != null && setting.getDefaultCheckoutTime() != null ? setting.getDefaultCheckoutTime().toString() : "12:00";

        sb.append("## 1. Thông tin cơ sở lưu trú\n");
        sb.append("- Tên khách sạn: **").append(hotelName).append("**\n");
        if (setting != null && setting.getAddress() != null) {
            sb.append("- Địa chỉ: ").append(setting.getAddress()).append("\n");
        }
        sb.append("- Hotline Lễ tân (24/7): **").append(hotelPhone).append("**\n");
        sb.append("- Email hỗ trợ: **").append(hotelEmail).append("**\n");
        sb.append("- Giờ nhận phòng tiêu chuẩn (Check-in): Từ **").append(checkinTime).append("** hàng ngày.\n");
        sb.append("- Giờ trả phòng tiêu chuẩn (Check-out): Trước **").append(checkoutTime).append("** trưa hàng ngày.\n");
        sb.append("- Chính sách Check-in sớm / Check-out muộn: Khách sạn linh hoạt hỗ trợ tùy thuộc vào tình trạng phòng trống thực tế trong ngày (có thể áp dụng phụ thu theo quy định).\n");
        sb.append("- **Gửi hành lý miễn phí**: Khách có thể gửi hành lý hoàn toàn miễn phí tại quầy Lễ tân trước giờ nhận phòng hoặc sau giờ trả phòng.\n\n");

        // 3. Danh mục loại phòng, Bảng giá niêm yết, Bảng giá cuối tuần và Tình trạng phòng trống
        List<RoomType> roomTypes = roomTypeRepository.findAll();
        List<WeekendPriceConfig> weekendConfigs = weekendPriceConfigRepository.findAllActive();

        if (!roomTypes.isEmpty()) {
            sb.append("## 2. Danh mục hạng phòng, Bảng giá & Tình trạng phòng\n");
            for (RoomType rt : roomTypes) {
                sb.append("### Hạng phòng: **").append(rt.getName()).append("**\n");
                if (rt.getBasePrice() != null) {
                    sb.append("- **Giá cơ sở niêm yết (Ngày thường)**: **").append(formatCurrency(rt.getBasePrice())).append(" VNĐ/đêm**\n");
                }

                // Kiểm tra giá cuối tuần cấu hình riêng
                Optional<WeekendPriceConfig> wcOpt = weekendConfigs.stream()
                        .filter(wc -> wc.getRoomType() != null && rt.getId().equals(wc.getRoomType().getId()))
                        .findFirst();
                if (wcOpt.isPresent()) {
                    WeekendPriceConfig wc = wcOpt.get();
                    sb.append("- **Giá cuối tuần (").append(wc.getWeekendDays() != null ? wc.getWeekendDays() : "T6-CN")
                            .append(")**: **").append(formatCurrency(wc.getPricePerNight())).append(" VNĐ/đêm**\n");
                }

                int stdCap = rt.getStandardCapacity() != null ? rt.getStandardCapacity() : 2;
                int maxCap = rt.getMaxCapacity() != null ? rt.getMaxCapacity() : stdCap;
                sb.append("- **Sức chứa**: Tiêu chuẩn ").append(stdCap).append(" người lớn, Tối đa ").append(maxCap).append(" người\n");

                int maxChildAge = rt.getMaxChildAgeFree() != null ? rt.getMaxChildAgeFree() : 6;
                BigDecimal extraPersonCharge = rt.getExtraPersonChargePerNight() != null ? rt.getExtraPersonChargePerNight() : BigDecimal.ZERO;
                sb.append("- **Chính sách trẻ em & người phát sinh**: Trẻ em dưới ").append(maxChildAge)
                        .append(" tuổi được miễn phí ngủ cùng bố mẹ. Phụ thu thêm người/giường phụ: ")
                        .append(formatCurrency(extraPersonCharge)).append(" VNĐ/người/đêm.\n");

                if (rt.getAmenitiesDescription() != null && !rt.getAmenitiesDescription().isBlank()) {
                    sb.append("- **Tiện nghi phòng**: ").append(rt.getAmenitiesDescription()).append("\n");
                }

                long roomCount = roomRepository.findAll().stream()
                        .filter(r -> r.getRoomType() != null && rt.getId().equals(r.getRoomType().getId()))
                        .count();
                sb.append("- **Tổng số phòng vật lý**: ").append(roomCount).append(" phòng\n");

                // Tính phòng trống theo ngày
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
                    sb.append("- **Tình trạng khả dụng (").append(checkIn.format(DATE_FMT))
                            .append(" → ").append(checkOut.format(DATE_FMT))
                            .append(")**: **").append(available).append(" phòng trống**\n");
                }
                sb.append("\n");
            }
        }

        // 4. Thống kê nhanh tình trạng hôm nay
        LocalDate today = LocalDate.now();
        long totalRooms = roomRepository.count();
        long occupiedToday = bookingRepository.findForCalendar(today, today.plusDays(1)).stream()
                .map(b -> b.getRoom() != null ? b.getRoom().getId() : -1L)
                .distinct()
                .count();
        long availableToday = Math.max(0, totalRooms - occupiedToday);
        sb.append("## 3. Tình trạng phòng hôm nay (").append(today.format(DATE_FMT)).append(")\n");
        sb.append("- Tổng quy mô phòng: **").append(totalRooms).append(" phòng**\n");
        sb.append("- Đang có khách lưu trú: **").append(occupiedToday).append(" phòng**\n");
        sb.append("- Số phòng sẵn sàng đón khách: **").append(availableToday).append(" phòng trống**\n\n");

        // 5. Danh mục Dịch vụ phụ thu (Extra Services)
        List<ExtraService> services = extraServiceRepository.findAllByActiveTrue();
        if (!services.isEmpty()) {
            sb.append("## 4. Bảng giá Dịch vụ phụ thu & Tiện ích bổ sung\n");
            for (ExtraService s : services) {
                sb.append("- **").append(s.getName()).append("**: **").append(formatCurrency(s.getUnitPrice()))
                        .append(" VNĐ / ").append(s.getUnit() != null ? s.getUnit() : "lần").append("**");
                if (s.getDescription() != null && !s.getDescription().isBlank()) {
                    sb.append(" — *").append(s.getDescription()).append("*");
                }
                sb.append("\n");
            }
            sb.append("\n");
        }

        // 6. Chính sách Hủy phòng & Hoàn tiền (Cancellation Policy)
        List<CancellationPolicy> cancelPolicies = cancellationPolicyRepository.findAll();
        if (!cancelPolicies.isEmpty()) {
            sb.append("## 5. Chính sách Hủy phòng & Hoàn tiền cọc\n");
            for (CancellationPolicy cp : cancelPolicies) {
                String rtName = cp.getRoomType() != null ? cp.getRoomType().getName() : "Áp dụng chung tất cả hạng phòng";
                int freeHours = cp.getFreeCancelHours() != null ? cp.getFreeCancelHours() : 24;
                BigDecimal penalty = cp.getPenaltyPercent() != null ? cp.getPenaltyPercent() : BigDecimal.ZERO;
                sb.append("- **").append(rtName).append("**: Miễn phí hủy trước **").append(freeHours).append(" giờ** so với thời điểm nhận phòng tiêu chuẩn. ");
                if (penalty.compareTo(BigDecimal.ZERO) > 0) {
                    sb.append("Nếu hủy muộn hơn hoặc vắng mặt (No-show), áp dụng phí phạt **").append(penalty.stripTrailingZeros().toPlainString()).append("% tiền cọc**.");
                } else {
                    sb.append("Hủy miễn phí hoàn lại 100% tiền cọc.");
                }
                sb.append("\n");
            }
            sb.append("\n");
        }

        // 7. Chính sách Đặt cọc & Phương thức thanh toán
        sb.append("## 6. Chính sách Đặt cọc & Phương thức thanh toán\n");
        sb.append("- **Đặt cọc giữ phòng**: Để đảm bảo phòng được giữ chắc chắn trong các dịp cao điểm hoặc cuối tuần, khách sạn áp dụng đặt cọc từ 30% - 50% giá trị đặt phòng.\n");
        sb.append("- **Hình thức thanh toán**: Quý khách có thể thanh toán thuận tiện qua Chuyển khoản QR ngân hàng (tự động xác nhận giao dịch ngay lập tức), Thẻ tín dụng/ghi nợ quốc tế (Visa, MasterCard), Thẻ ATM nội địa hoặc Tiền mặt tại quầy Lễ tân.\n\n");

        // 8. Hướng dẫn & Cơ chế Tra cứu Đơn đặt phòng & Hóa đơn trực tuyến (NCL-09-CN-008)
        sb.append("## 7. Tính năng Tra cứu Đặt phòng & Hóa đơn thanh toán trực tuyến\n");
        sb.append("- **Hệ thống CÓ tính năng tra cứu trực tuyến chính thức** trên website để khách tự kiểm tra chi tiết đặt phòng và tải hóa đơn thanh toán:\n");
        sb.append("  1. Khách có thể nhấn nút **\"Tra cứu hóa đơn\"** ở góc trên cùng bên phải thanh Menu (Header) của website.\n");
        sb.append("  2. Hoặc truy cập đường dẫn trực tiếp: `/booking-detail/{Mã_đơn}?tab=info` (xem chi tiết) và `/booking-detail/{Mã_đơn}?tab=invoice` (xem hóa đơn).\n");
        sb.append("  3. **Yêu cầu bảo mật bắt buộc**: Vì lý do bảo vệ dữ liệu cá nhân, khách PHẢI nhập đúng cả **Mã đặt phòng** (ví dụ: `#188` hoặc `188`) và **Số điện thoại** đã đăng ký khi đặt phòng.\n");
        sb.append("  4. **Quy định xem hóa đơn**: Chỉ các hóa đơn đã hoàn tất thanh toán (trạng thái Đã thanh toán) mới được phép tra cứu, xem và in/kết xuất trực tuyến.\n");
        sb.append("  5. **Hỗ trợ trong đoạn chat**: Nếu khách hỏi tra cứu mã đơn trong chat, bạn hãy nhiệt tình hướng dẫn khách các bước trên HOẶC mời khách gửi Mã đặt phòng kèm Số điện thoại đăng ký ngay trong ô chat này để bạn hỗ trợ kiểm tra nhanh cho khách.\n\n");

        // 9. Kiểm tra thực tế nếu khách cung cấp mã đặt phòng trong tin nhắn
        appendBookingLookupContextIfRelevant(sb, userMessage);

        // 10. Hướng dẫn hành vi ứng xử & phong cách trả lời cho AI
        sb.append("## 8. Hướng dẫn hành vi & phong cách trả lời cho AI (BẮT BUỘC TUÂN THỦ)\n");
        sb.append("- Xưng hô: Gọi người dùng là **\"Quý khách\"** hoặc **\"Bạn\"**, xưng là **\"Em\"** hoặc **\"StayBot\"**.\n");
        sb.append("- Giọng điệu: Thân thiện, chu đáo, nhiệt tình, lịch sự, sử dụng tiếng Việt tự nhiên và các biểu tượng cảm xúc (emoji) phù hợp để tạo cảm giác mến khách.\n");
        sb.append("- Trình bày: Định dạng Markdown chuyên nghiệp, in đậm tên phòng, giá tiền, dùng gạch đầu dòng rõ ràng.\n");
        sb.append("- **Khi khách hỏi tìm/chọn phòng**: Hãy phân tích số lượng người lớn, trẻ em và ngày lưu trú; gợi ý 1-2 hạng phòng phù hợp nhất kèm báo giá rõ ràng, tiện ích nổi bật và hướng dẫn khách bấm đặt phòng.\n");
        sb.append("- **Khi khách hỏi về tra cứu mã đơn/hóa đơn**: TUYỆT ĐỐI KHÔNG trả lời 'hệ thống trợ lý ảo chưa thể tra cứu' hay 'tôi không biết'. Hãy giải thích rõ ràng tính năng Tra cứu trực tuyến trên website, cung cấp liên kết `/booking-detail/{mã_đơn}?tab=info` hoặc hướng dẫn khách nhập Mã đơn + SĐT để kiểm tra ngay.\n");
        sb.append("- Không bịa đặt thông tin sai lệch ngoài dữ liệu khách sạn đã cung cấp trong context này.\n");

        return sb.toString();
    }

    /**
     * Tự động quét và đối chiếu dữ liệu nếu tin nhắn của khách chứa mã đặt phòng.
     */
    private void appendBookingLookupContextIfRelevant(StringBuilder sb, String userMessage) {
        if (userMessage == null || userMessage.isBlank()) return;

        Pattern p = Pattern.compile("(?:#|mã|đơn|booking|phòng)?\\s*#?([0-9]{1,7})", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(userMessage);

        while (m.find()) {
            try {
                Long potentialBookingId = Long.parseLong(m.group(1));
                String fullMatch = m.group(0).toLowerCase();
                boolean isExplicitCode = fullMatch.contains("#") || fullMatch.contains("mã") || fullMatch.contains("đơn") || fullMatch.contains("booking");
                if (!isExplicitCode && potentialBookingId < 10) {
                    continue;
                }

                Booking b = bookingRepository.findById(potentialBookingId).orElse(null);
                if (b != null) {
                    sb.append("### Kết quả đối soát trực tiếp cho Mã đặt phòng #").append(b.getId()).append(" trong hệ thống:\n");

                    String guestPhone = b.getGuest() != null ? b.getGuest().getPhone() : "";
                    boolean phoneMatches = false;
                    if (!guestPhone.isBlank()) {
                        Pattern phonePat = Pattern.compile("[0-9]{9,11}");
                        Matcher phoneMat = phonePat.matcher(userMessage.replaceAll("\\s+", ""));
                        while (phoneMat.find()) {
                            if (isPhoneMatch(guestPhone, phoneMat.group())) {
                                phoneMatches = true;
                                break;
                            }
                        }
                    }

                    if (phoneMatches) {
                        sb.append("- Khách hàng đã cung cấp đúng số điện thoại đăng ký trùng khớp với đơn đặt phòng này!\n");
                        sb.append("- Tên khách lưu trú: ").append(b.getGuest() != null ? b.getGuest().getName() : "Khách hàng").append("\n");
                        sb.append("- Hạng phòng: ").append(b.getRoomType() != null ? b.getRoomType().getName() : "Phòng tiêu chuẩn").append("\n");
                        if (b.getRoom() != null && b.getRoom().getRoomNumber() != null) {
                            sb.append("- Số phòng: Phòng ").append(b.getRoom().getRoomNumber()).append("\n");
                        }
                        sb.append("- Ngày nhận phòng: ").append(b.getCheckInDate() != null ? b.getCheckInDate().format(DATE_FMT) : "").append("\n");
                        sb.append("- Ngày trả phòng: ").append(b.getCheckOutDate() != null ? b.getCheckOutDate().format(DATE_FMT) : "").append("\n");
                        sb.append("- Trạng thái đặt phòng: ").append(b.getStatus()).append("\n");
                        if (b.getExpectedPrice() != null) {
                            sb.append("- Tổng tiền dự kiến: ").append(formatCurrency(b.getExpectedPrice())).append(" VNĐ\n");
                        }
                        sb.append("- Liên kết xem chi tiết đặt phòng: `/booking-detail/").append(b.getId()).append("?tab=info&phone=").append(guestPhone).append("`\n");
                        sb.append("- Liên kết xem hóa đơn (đối với đơn đã thanh toán): `/booking-detail/").append(b.getId()).append("?tab=invoice&phone=").append(guestPhone).append("`\n");
                        sb.append("- **HÀNH ĐỘNG CHO AI**: Hãy tóm tắt ngắn gọn, chu đáo các thông tin xác thực trên cho khách và gửi liên kết xem chi tiết trực tuyến.\n\n");
                    } else {
                        sb.append("- Mã đặt phòng #").append(b.getId()).append(" CÓ TỒN TẠI trên hệ thống khách sạn. TUY NHIÊN khách CHƯA cung cấp số điện thoại hoặc số điện thoại cung cấp chưa khớp.\n");
                        sb.append("- **QUY TẮC BẢO MẬT**: Bạn TUYỆT ĐỐI KHÔNG TIẾT LỘ tên khách, số phòng, số tiền hay thông tin cá nhân của đơn này.\n");
                        sb.append("- **HÀNH ĐỘNG CHO AI**: Hãy vui vẻ thông báo với khách rằng đơn #").append(b.getId()).append(" đã được ghi nhận trên hệ thống. Để bảo mật dữ liệu lưu trú, mời khách nhắn thêm Số điện thoại đã đăng ký, hoặc truy cập liên kết tra cứu trực tuyến: `/booking-detail/").append(b.getId()).append("?tab=info` để xác thực số điện thoại và xem chi tiết.\n\n");
                    }
                    break;
                }
            } catch (Exception e) {
                log.debug("Không thể phân tích mã đặt phòng từ tin nhắn: {}", e.getMessage());
            }
        }
    }

    private boolean isPhoneMatch(String registered, String input) {
        if (registered == null || input == null) return false;
        String regClean = registered.replaceAll("[^0-9]", "");
        String inClean = input.replaceAll("[^0-9]", "");
        if (regClean.isEmpty() || inClean.isEmpty()) return false;
        if (regClean.equals(inClean)) return true;
        if (regClean.startsWith("84") && inClean.equals("0" + regClean.substring(2))) return true;
        if (inClean.startsWith("84") && regClean.equals("0" + inClean.substring(2))) return true;
        return false;
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "Liên hệ";
        return String.format(Locale.GERMANY, "%,.0f", amount.doubleValue());
    }
}
