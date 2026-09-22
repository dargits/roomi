package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.PriceSuggestionConfigRequest;
import plant.stay.dto.response.PriceSuggestionConfigResponse;
import plant.stay.dto.response.PriceSuggestionDto;
import plant.stay.dto.response.PriceSuggestionResponse;
import plant.stay.exception.BusinessException;
import plant.stay.model.Booking;
import plant.stay.model.DismissedPriceSuggestion;
import plant.stay.model.HotelSetting;
import plant.stay.model.Room;
import plant.stay.model.RoomType;
import plant.stay.model.User;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.DismissedPriceSuggestionRepository;
import plant.stay.repository.HotelSettingRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.PriceSuggestionService;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriceSuggestionServiceImpl implements PriceSuggestionService {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final HotelSettingRepository hotelSettingRepository;
    private final DismissedPriceSuggestionRepository dismissedPriceSuggestionRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public PriceSuggestionResponse getPriceSuggestions(int days, boolean includeDismissed, User actor) {
        if (days <= 0) {
            days = 30;
        }

        LocalDate today = LocalDate.now();
        LocalDate from = today.plusDays(1);
        LocalDate to = today.plusDays(days);

        // 1. Lấy cấu hình ngưỡng của cơ sở
        HotelSetting setting = getOrCreateHotelSetting();
        double highThreshold = setting.getPriceSuggestionHighThreshold() != null ? setting.getPriceSuggestionHighThreshold() : 80.0;
        double lowThreshold = setting.getPriceSuggestionLowThreshold() != null ? setting.getPriceSuggestionLowThreshold() : 30.0;
        int imminentDays = setting.getPriceSuggestionImminentDays() != null ? setting.getPriceSuggestionImminentDays() : 7;
        boolean configured = Boolean.TRUE.equals(setting.getPriceSuggestionConfigured());

        // 2. Kiểm tra điều kiện dữ liệu công suất quá khứ
        LocalDate earliestDate = bookingRepository.findEarliestBookingDate();
        boolean hasMinimumData = false;
        double dataMonthsCount = 0.0;
        boolean hasFullYearData = false;

        if (earliestDate != null) {
            long daysOfData = Math.max(0, ChronoUnit.DAYS.between(earliestDate, today));
            dataMonthsCount = Math.round((daysOfData / 30.4) * 10.0) / 10.0;
            hasMinimumData = daysOfData >= 90; // Tối thiểu 3 tháng dữ liệu
            hasFullYearData = daysOfData >= 365; // Đủ 1 năm dữ liệu
        }

        // 3. Lấy thông tin phòng và loại phòng
        List<Room> allRooms = roomRepository.findAll();
        long totalRooms = allRooms.size();
        List<RoomType> allRoomTypes = roomTypeRepository.findAll();

        // 4. Lấy booking trong khoảng 30 ngày tới
        List<Booking> upcomingBookings = bookingRepository.findForCalendar(from, to);

        // 5. Nếu có dữ liệu 1 năm, lấy booking cùng kỳ năm trước
        List<Booking> historicalBookings = Collections.emptyList();
        if (hasFullYearData) {
            LocalDate histFrom = from.minusYears(1);
            LocalDate histTo = to.minusYears(1);
            historicalBookings = bookingRepository.findForCalendar(histFrom, histTo);
        }

        // 6. Lấy danh sách gợi ý đã bị bỏ qua
        List<DismissedPriceSuggestion> dismissedList = dismissedPriceSuggestionRepository.findByTargetDateBetween(from, to);
        Map<LocalDate, DismissedPriceSuggestion> dismissedMap = dismissedList.stream()
                .collect(Collectors.toMap(DismissedPriceSuggestion::getTargetDate, d -> d, (existing, replacing) -> existing));

        // 7. Duyệt từng ngày để tính toán công suất và gợi ý
        List<PriceSuggestionDto> suggestionList = new ArrayList<>();
        int increaseCount = 0;
        int decreaseCount = 0;
        int dismissedCount = 0;

        for (int i = 1; i <= days; i++) {
            LocalDate targetDate = today.plusDays(i);
            long daysRemaining = i;

            // Đếm số phòng đã đặt trong ngày đó
            long occupiedRooms = upcomingBookings.stream()
                    .filter(b -> !b.getCheckInDate().isAfter(targetDate) && b.getCheckOutDate().isAfter(targetDate))
                    .count();

            long vacantRooms = Math.max(0, totalRooms - occupiedRooms);
            double currentOccupancyRate = totalRooms > 0
                    ? Math.round(((double) occupiedRooms / totalRooms * 100.0) * 10.0) / 10.0
                    : 0.0;

            // Cùng kỳ năm trước
            Double referenceOccupancyRate = null;
            String confidenceLevel;
            String confidenceNote;

            if (hasFullYearData) {
                LocalDate sameDateLastYear = targetDate.minusYears(1);
                long histOccupied = historicalBookings.stream()
                        .filter(b -> !b.getCheckInDate().isAfter(sameDateLastYear) && b.getCheckOutDate().isAfter(sameDateLastYear))
                        .count();
                referenceOccupancyRate = totalRooms > 0
                        ? Math.round(((double) histOccupied / totalRooms * 100.0) * 10.0) / 10.0
                        : 0.0;
                confidenceLevel = "HIGH";
                confidenceNote = "Dữ liệu quá khứ đầy đủ >= 1 năm, tham chiếu cùng kỳ năm trước đạt " + referenceOccupancyRate + "%.";
            } else {
                confidenceLevel = "LOW";
                confidenceNote = "Dữ liệu quá khứ chưa đủ 1 năm (" + dataMonthsCount + " tháng), hệ thống chỉ dùng ngưỡng cấu hình làm tham chiếu và ghi chú mức tin cậy thấp.";
            }

            // Phân rã theo loại phòng
            List<PriceSuggestionDto.RoomTypeOccupancyDto> roomTypeBreakdown = new ArrayList<>();
            for (RoomType rt : allRoomTypes) {
                long rtTotalRooms = allRooms.stream()
                        .filter(r -> r.getRoomType() != null && Objects.equals(r.getRoomType().getId(), rt.getId()))
                        .count();

                long rtOccupied = upcomingBookings.stream()
                        .filter(b -> !b.getCheckInDate().isAfter(targetDate) && b.getCheckOutDate().isAfter(targetDate))
                        .filter(b -> (b.getRoom() != null && b.getRoom().getRoomType() != null && Objects.equals(b.getRoom().getRoomType().getId(), rt.getId()))
                                || (b.getRoomType() != null && Objects.equals(b.getRoomType().getId(), rt.getId())))
                        .count();

                long rtVacant = Math.max(0, rtTotalRooms - rtOccupied);

                roomTypeBreakdown.add(PriceSuggestionDto.RoomTypeOccupancyDto.builder()
                        .roomTypeId(rt.getId())
                        .roomTypeName(rt.getName())
                        .totalRooms(rtTotalRooms)
                        .occupiedRooms(rtOccupied)
                        .vacantRooms(rtVacant)
                        .basePrice(rt.getBasePrice())
                        .build());
            }

            // Xác định loại gợi ý theo quy tắc nghiệp vụ
            String suggestionType = "OPTIMAL";
            String suggestionTitle = "Công suất ổn định";
            String recommendation = "Mức lấp đầy " + currentOccupancyRate + "% nằm trong ngưỡng bình thường.";

            if (currentOccupancyRate >= highThreshold) {
                suggestionType = "INCREASE_PRICE";
                suggestionTitle = "Cân nhắc tăng giá";
                recommendation = String.format("Mức lấp đầy đạt %.1f%% (vượt ngưỡng cấu hình %.1f%%). Còn trống %d phòng, còn %d ngày tới ngày đón khách. Cân nhắc tăng giá phòng hoặc phụ thu để tối ưu doanh thu ngày cháy phòng.",
                        currentOccupancyRate, highThreshold, vacantRooms, daysRemaining);
                increaseCount++;
            } else if (currentOccupancyRate <= lowThreshold && daysRemaining <= imminentDays) {
                suggestionType = "DECREASE_PRICE_OR_CHANNELS";
                suggestionTitle = "Cân nhắc giảm giá hoặc mở bán thêm kênh";
                recommendation = String.format("Chỉ còn %d ngày nữa nhưng mức lấp đầy mới đạt %.1f%% (dưới ngưỡng %.1f%%), còn trống %d/%d phòng. Cân nhắc giảm giá kích cầu hoặc mở bán thêm kênh OTA/đại lý để tránh để trống ngày ế.",
                        daysRemaining, currentOccupancyRate, lowThreshold, vacantRooms, totalRooms);
                decreaseCount++;
            }

            // Kiểm tra trạng thái bị bỏ qua
            DismissedPriceSuggestion dismissedRecord = dismissedMap.get(targetDate);
            boolean isDismissed = dismissedRecord != null;
            if (isDismissed) {
                dismissedCount++;
            }

            PriceSuggestionDto dto = PriceSuggestionDto.builder()
                    .targetDate(targetDate)
                    .dayOfWeek(formatDayOfWeekVietnamese(targetDate.getDayOfWeek()))
                    .daysRemaining(daysRemaining)
                    .totalRooms(totalRooms)
                    .occupiedRooms(occupiedRooms)
                    .vacantRooms(vacantRooms)
                    .currentOccupancyRate(currentOccupancyRate)
                    .referenceOccupancyRate(referenceOccupancyRate)
                    .highThreshold(highThreshold)
                    .lowThreshold(lowThreshold)
                    .imminentDaysThreshold(imminentDays)
                    .suggestionType(suggestionType)
                    .suggestionTitle(suggestionTitle)
                    .recommendation(recommendation)
                    .confidenceLevel(confidenceLevel)
                    .confidenceNote(confidenceNote)
                    .dismissed(isDismissed)
                    .dismissedAt(isDismissed ? dismissedRecord.getDismissedAt() : null)
                    .roomTypeBreakdown(roomTypeBreakdown)
                    .build();

            // Nếu không includeDismissed, chỉ lấy những ngày có gợi ý hành động (INCREASE hoặc DECREASE) và chưa bị bỏ qua
            if (!includeDismissed) {
                if (!isDismissed && !"OPTIMAL".equals(suggestionType)) {
                    suggestionList.add(dto);
                }
            } else {
                suggestionList.add(dto);
            }
        }

        // Sắp xếp ưu tiên: gợi ý cần xử lý trước (cận ngày giảm giá hoặc tăng giá trước), sau đó theo ngày tăng dần
        suggestionList.sort(Comparator.comparingInt((PriceSuggestionDto s) -> {
            if ("DECREASE_PRICE_OR_CHANNELS".equals(s.getSuggestionType())) return 1;
            if ("INCREASE_PRICE".equals(s.getSuggestionType())) return 2;
            return 3;
        }).thenComparing(PriceSuggestionDto::getTargetDate));

        return PriceSuggestionResponse.builder()
                .suggestions(suggestionList)
                .hasMinimumData(hasMinimumData)
                .dataMonthsCount(dataMonthsCount)
                .earliestBookingDate(earliestDate)
                .hasFullYearData(hasFullYearData)
                .configured(configured)
                .highOccupancyThreshold(highThreshold)
                .lowOccupancyThreshold(lowThreshold)
                .imminentDaysThreshold(imminentDays)
                .totalRooms(totalRooms)
                .totalSuggestionsCount(suggestionList.size())
                .increaseCount(increaseCount)
                .decreaseCount(decreaseCount)
                .dismissedCount(dismissedCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PriceSuggestionConfigResponse getSuggestionConfig(User actor) {
        HotelSetting setting = getOrCreateHotelSetting();
        LocalDate today = LocalDate.now();
        LocalDate earliestDate = bookingRepository.findEarliestBookingDate();

        boolean hasMinimumData = false;
        double dataMonthsCount = 0.0;
        boolean hasFullYearData = false;

        if (earliestDate != null) {
            long daysOfData = Math.max(0, ChronoUnit.DAYS.between(earliestDate, today));
            dataMonthsCount = Math.round((daysOfData / 30.4) * 10.0) / 10.0;
            hasMinimumData = daysOfData >= 90;
            hasFullYearData = daysOfData >= 365;
        }

        return PriceSuggestionConfigResponse.builder()
                .highOccupancyThreshold(setting.getPriceSuggestionHighThreshold() != null ? setting.getPriceSuggestionHighThreshold() : 80.0)
                .lowOccupancyThreshold(setting.getPriceSuggestionLowThreshold() != null ? setting.getPriceSuggestionLowThreshold() : 30.0)
                .imminentDaysThreshold(setting.getPriceSuggestionImminentDays() != null ? setting.getPriceSuggestionImminentDays() : 7)
                .configured(Boolean.TRUE.equals(setting.getPriceSuggestionConfigured()))
                .hasMinimumData(hasMinimumData)
                .dataMonthsCount(dataMonthsCount)
                .earliestBookingDate(earliestDate)
                .hasFullYearData(hasFullYearData)
                .build();
    }

    @Override
    @Transactional
    public PriceSuggestionConfigResponse updateSuggestionConfig(PriceSuggestionConfigRequest request, User actor) {
        if (request.getHighOccupancyThreshold() <= request.getLowOccupancyThreshold()) {
            throw new BusinessException("Ngưỡng lấp đầy trên (" + request.getHighOccupancyThreshold() + "%) phải lớn hơn ngưỡng dưới (" + request.getLowOccupancyThreshold() + "%).");
        }

        HotelSetting setting = getOrCreateHotelSetting();
        setting.setPriceSuggestionHighThreshold(request.getHighOccupancyThreshold());
        setting.setPriceSuggestionLowThreshold(request.getLowOccupancyThreshold());
        setting.setPriceSuggestionImminentDays(request.getImminentDaysThreshold());
        setting.setPriceSuggestionConfigured(true);
        setting.setUpdatedBy(actor);
        hotelSettingRepository.save(setting);

        if (auditLogService != null && actor != null) {
            auditLogService.log(
                    "HOTEL_SETTING",
                    setting.getId(),
                    "UPDATE_PRICE_SUGGESTION_CONFIG",
                    actor,
                    "Cập nhật ngưỡng gợi ý giá: Trên " + request.getHighOccupancyThreshold() + "%, Dưới " + request.getLowOccupancyThreshold() + "%, Cận kề " + request.getImminentDaysThreshold() + " ngày"
            );
        }

        return getSuggestionConfig(actor);
    }

    @Override
    @Transactional
    public void dismissSuggestion(LocalDate targetDate, User actor) {
        if (targetDate == null || targetDate.isBefore(LocalDate.now())) {
            throw new BusinessException("Ngày cần bỏ qua không hợp lệ hoặc đã ở trong quá khứ.");
        }

        if (dismissedPriceSuggestionRepository.existsByTargetDate(targetDate)) {
            return; // Đã bỏ qua trước đó
        }

        DismissedPriceSuggestion dismissal = DismissedPriceSuggestion.builder()
                .targetDate(targetDate)
                .dismissedBy(actor)
                .reason("Chủ cơ sở chủ động bỏ qua gợi ý ngày " + targetDate)
                .build();

        DismissedPriceSuggestion saved = dismissedPriceSuggestionRepository.save(dismissal);

        if (auditLogService != null && actor != null) {
            auditLogService.log(
                    "DISMISSED_PRICE_SUGGESTION",
                    saved.getId(),
                    "DISMISS_PRICE_SUGGESTION",
                    actor,
                    "Bỏ qua gợi ý điều chỉnh giá ngày " + targetDate
            );
        }
    }

    @Override
    @Transactional
    public void restoreSuggestion(LocalDate targetDate, User actor) {
        if (targetDate == null) {
            throw new BusinessException("Ngày khôi phục không hợp lệ.");
        }

        dismissedPriceSuggestionRepository.deleteByTargetDate(targetDate);

        if (auditLogService != null && actor != null) {
            auditLogService.log(
                    "DISMISSED_PRICE_SUGGESTION",
                    null,
                    "RESTORE_PRICE_SUGGESTION",
                    actor,
                    "Khôi phục hiển thị gợi ý giá ngày " + targetDate
            );
        }
    }

    private HotelSetting getOrCreateHotelSetting() {
        return hotelSettingRepository.findById(1L)
                .orElseGet(() -> hotelSettingRepository.save(HotelSetting.builder()
                        .propertyName("StayGO Hotel")
                        .address("Việt Nam")
                        .defaultCheckinTime(java.time.LocalTime.of(14, 0))
                        .defaultCheckoutTime(java.time.LocalTime.of(12, 0))
                        .priceSuggestionHighThreshold(80.0)
                        .priceSuggestionLowThreshold(30.0)
                        .priceSuggestionImminentDays(7)
                        .priceSuggestionConfigured(true)
                        .build()));
    }

    private String formatDayOfWeekVietnamese(DayOfWeek dow) {
        return switch (dow) {
            case MONDAY -> "Thứ Hai";
            case TUESDAY -> "Thứ Ba";
            case WEDNESDAY -> "Thứ Tư";
            case THURSDAY -> "Thứ Năm";
            case FRIDAY -> "Thứ Sáu";
            case SATURDAY -> "Thứ Bảy";
            case SUNDAY -> "Chủ Nhật";
        };
    }
}
