package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.HolidayPriceRequest;
import plant.stay.dto.request.WeekendPriceConfigRequest;
import plant.stay.dto.response.HolidayPriceResponse;
import plant.stay.dto.response.NightlyPriceBreakdownResponse;
import plant.stay.dto.response.NightlyPriceDetailDto;
import plant.stay.dto.response.WeekendPriceConfigResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.HolidayPrice;
import plant.stay.model.RoomType;
import plant.stay.model.SeasonalPrice;
import plant.stay.model.User;
import plant.stay.model.WeekendPriceConfig;
import plant.stay.repository.HolidayPriceRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.SeasonalPriceRepository;
import plant.stay.repository.WeekendPriceConfigRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.PricingService;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PricingServiceImpl implements PricingService {

    private final WeekendPriceConfigRepository weekendPriceConfigRepository;
    private final HolidayPriceRepository holidayPriceRepository;
    private final SeasonalPriceRepository seasonalPriceRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final AuditLogService auditLogService;

    // ===== Weekend Price Config =====

    @Override
    @Transactional(readOnly = true)
    public List<WeekendPriceConfigResponse> getWeekendConfigs(Long roomTypeId) {
        return weekendPriceConfigRepository.findByRoomTypeId(roomTypeId).stream()
                .map(this::toWeekendResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public WeekendPriceConfigResponse saveWeekendConfig(WeekendPriceConfigRequest req, User actor) {
        RoomType roomType = roomTypeRepository.findById(req.getRoomTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng #" + req.getRoomTypeId()));

        WeekendPriceConfig config = weekendPriceConfigRepository.findFirstByRoomTypeIdAndActiveTrue(req.getRoomTypeId())
                .orElse(WeekendPriceConfig.builder().roomType(roomType).build());

        config.setWeekendDays(req.getWeekendDays().toUpperCase());
        config.setPricePerNight(req.getPricePerNight());
        if (req.getActive() != null) config.setActive(req.getActive());

        WeekendPriceConfig saved = weekendPriceConfigRepository.save(config);
        auditLogService.log("RoomType", roomType.getId(), "UPDATE_WEEKEND_PRICE", actor,
                "Cập nhật giá cuối tuần loại phòng " + roomType.getName() + ": " + req.getPricePerNight() + " đ (" + req.getWeekendDays() + ")");
        return toWeekendResponse(saved);
    }

    @Override
    @Transactional
    public void deleteWeekendConfig(Long id, User actor) {
        WeekendPriceConfig config = weekendPriceConfigRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cấu hình giá cuối tuần #" + id));
        weekendPriceConfigRepository.delete(config);
        auditLogService.log("RoomType", config.getRoomType().getId(), "DELETE_WEEKEND_PRICE", actor,
                "Xóa cấu hình giá cuối tuần loại phòng " + config.getRoomType().getName());
    }

    // ===== Holiday Price =====

    @Override
    @Transactional(readOnly = true)
    public List<HolidayPriceResponse> getHolidayPrices(Long roomTypeId) {
        return holidayPriceRepository.findByRoomTypeId(roomTypeId).stream()
                .map(this::toHolidayResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public HolidayPriceResponse saveHolidayPrice(HolidayPriceRequest req, User actor) {
        RoomType roomType = roomTypeRepository.findById(req.getRoomTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng #" + req.getRoomTypeId()));

        HolidayPrice price = holidayPriceRepository.findFirstByRoomTypeIdAndHolidayDate(req.getRoomTypeId(), req.getHolidayDate())
                .orElse(HolidayPrice.builder().roomType(roomType).holidayDate(req.getHolidayDate()).build());

        price.setHolidayName(req.getHolidayName());
        price.setPricePerNight(req.getPricePerNight());
        if (req.getActive() != null) price.setActive(req.getActive());

        HolidayPrice saved = holidayPriceRepository.save(price);
        auditLogService.log("RoomType", roomType.getId(), "UPDATE_HOLIDAY_PRICE", actor,
                "Cập nhật giá ngày lễ " + req.getHolidayName() + " (" + req.getHolidayDate() + ") cho loại phòng " + roomType.getName() + ": " + req.getPricePerNight() + " đ");
        return toHolidayResponse(saved);
    }

    @Override
    @Transactional
    public void deleteHolidayPrice(Long id, User actor) {
        HolidayPrice price = holidayPriceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giá ngày lễ #" + id));
        holidayPriceRepository.delete(price);
        auditLogService.log("RoomType", price.getRoomType().getId(), "DELETE_HOLIDAY_PRICE", actor,
                "Xóa giá ngày lễ " + price.getHolidayName() + " (" + price.getHolidayDate() + ") của loại phòng " + price.getRoomType().getName());
    }

    // ===== Price Calculation (Priority: Holiday > Weekend > Season > Base) =====

    @Override
    @Transactional(readOnly = true)
    public NightlyPriceDetailDto calculateNightPrice(RoomType roomType, LocalDate night) {
        String dayName = formatDayOfWeek(night.getDayOfWeek());

        // 1. Ưu tiên cao nhất: Giá ngày lễ
        Optional<HolidayPrice> holidayOpt = holidayPriceRepository.findFirstByRoomTypeIdAndHolidayDateAndActiveTrue(roomType.getId(), night);
        if (holidayOpt.isPresent()) {
            HolidayPrice hp = holidayOpt.get();
            return NightlyPriceDetailDto.builder()
                    .date(night)
                    .dayOfWeek(dayName)
                    .appliedPrice(hp.getPricePerNight())
                    .priceSource("HOLIDAY")
                    .sourceName("Ngày lễ: " + hp.getHolidayName())
                    .build();
        }

        // 2. Ưu tiên nhì: Giá ngày cuối tuần
        Optional<WeekendPriceConfig> weekendOpt = weekendPriceConfigRepository.findFirstByRoomTypeIdAndActiveTrue(roomType.getId());
        if (weekendOpt.isPresent()) {
            WeekendPriceConfig wc = weekendOpt.get();
            if (isWeekendDay(wc.getWeekendDays(), night.getDayOfWeek())) {
                return NightlyPriceDetailDto.builder()
                        .date(night)
                        .dayOfWeek(dayName)
                        .appliedPrice(wc.getPricePerNight())
                        .priceSource("WEEKEND")
                        .sourceName("Giá cuối tuần (" + dayName + ")")
                        .build();
            }
        }

        // 3. Ưu tiên ba: Giá theo mùa
        List<SeasonalPrice> seasonal = seasonalPriceRepository.findByRoomTypeAndDate(roomType.getId(), night);
        if (!seasonal.isEmpty()) {
            SeasonalPrice sp = seasonal.get(0);
            return NightlyPriceDetailDto.builder()
                    .date(night)
                    .dayOfWeek(dayName)
                    .appliedPrice(sp.getPricePerNight())
                    .priceSource("SEASONAL")
                    .sourceName("Giá theo mùa (" + sp.getStartDate() + " - " + sp.getEndDate() + ")")
                    .build();
        }

        // 4. Mặc định: Giá cơ bản
        BigDecimal base = roomType.getBasePrice() != null ? roomType.getBasePrice() : BigDecimal.ZERO;
        return NightlyPriceDetailDto.builder()
                .date(night)
                .dayOfWeek(dayName)
                .appliedPrice(base)
                .priceSource("BASE")
                .sourceName("Giá cơ bản loại phòng")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateTotalPrice(RoomType roomType, LocalDate checkIn, LocalDate checkOut) {
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        if (nights <= 0) nights = 1;

        BigDecimal total = BigDecimal.ZERO;
        for (long i = 0; i < nights; i++) {
            LocalDate night = checkIn.plusDays(i);
            total = total.add(calculateNightPrice(roomType, night).getAppliedPrice());
        }
        return total;
    }

    @Override
    @Transactional(readOnly = true)
    public NightlyPriceBreakdownResponse calculateBreakdown(Long roomTypeId, LocalDate checkIn, LocalDate checkOut, Integer guestCount, Integer childCount) {
        RoomType roomType = roomTypeRepository.findById(roomTypeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng #" + roomTypeId));

        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        if (nights <= 0) nights = 1;

        List<NightlyPriceDetailDto> details = new ArrayList<>();
        BigDecimal totalRoomPrice = BigDecimal.ZERO;

        for (long i = 0; i < nights; i++) {
            LocalDate night = checkIn.plusDays(i);
            NightlyPriceDetailDto dto = calculateNightPrice(roomType, night);
            details.add(dto);
            totalRoomPrice = totalRoomPrice.add(dto.getAppliedPrice());
        }

        int stdCap = roomType.getStandardCapacity() != null ? roomType.getStandardCapacity() : 2;
        int maxCap = roomType.getMaxCapacity() != null ? roomType.getMaxCapacity() : 2;
        int totalGuests = guestCount != null ? guestCount : stdCap;

        if (totalGuests > maxCap) {
            throw new IllegalArgumentException("Số khách (" + totalGuests + ") vượt quá sức chứa tối đa của phòng (" + maxCap + " người). Vui lòng chọn loại phòng lớn hơn.");
        }

        // Tính phụ thu người vượt tiêu chuẩn (trẻ em không tính phụ thu theo story NCL-02-CN-005)
        int extraGuests = Math.max(0, totalGuests - stdCap);
        if (childCount != null && childCount > 0) {
            // Trẻ em được miễn phụ thu
            int freeChildren = Math.min(childCount, extraGuests);
            extraGuests = Math.max(0, extraGuests - freeChildren);
        }

        BigDecimal extraPerNight = roomType.getExtraPersonChargePerNight() != null ? roomType.getExtraPersonChargePerNight() : BigDecimal.ZERO;
        BigDecimal totalExtraCharge = extraPerNight.multiply(BigDecimal.valueOf(extraGuests)).multiply(BigDecimal.valueOf(nights));
        BigDecimal grandTotal = totalRoomPrice.add(totalExtraCharge);

        return NightlyPriceBreakdownResponse.builder()
                .roomTypeId(roomType.getId())
                .roomTypeName(roomType.getName())
                .checkInDate(checkIn)
                .checkOutDate(checkOut)
                .totalNights(nights)
                .nightlyDetails(details)
                .totalRoomPrice(totalRoomPrice)
                .standardCapacity(stdCap)
                .maxCapacity(maxCap)
                .guestCount(totalGuests)
                .extraGuests(extraGuests)
                .extraPersonChargePerNight(extraPerNight)
                .totalExtraCharge(totalExtraCharge)
                .grandTotal(grandTotal)
                .build();
    }

    private boolean isWeekendDay(String weekendDays, DayOfWeek dow) {
        if (weekendDays == null || weekendDays.isBlank()) return false;
        return java.util.Arrays.stream(weekendDays.split(","))
                .map(String::trim)
                .anyMatch(d -> d.equalsIgnoreCase(dow.name()));
    }

    private String formatDayOfWeek(DayOfWeek dow) {
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

    private WeekendPriceConfigResponse toWeekendResponse(WeekendPriceConfig wc) {
        return WeekendPriceConfigResponse.builder()
                .id(wc.getId())
                .roomTypeId(wc.getRoomType().getId())
                .roomTypeName(wc.getRoomType().getName())
                .weekendDays(wc.getWeekendDays())
                .pricePerNight(wc.getPricePerNight())
                .active(wc.isActive())
                .createdAt(wc.getCreatedAt())
                .updatedAt(wc.getUpdatedAt())
                .build();
    }

    private HolidayPriceResponse toHolidayResponse(HolidayPrice hp) {
        return HolidayPriceResponse.builder()
                .id(hp.getId())
                .holidayName(hp.getHolidayName())
                .holidayDate(hp.getHolidayDate())
                .roomTypeId(hp.getRoomType().getId())
                .roomTypeName(hp.getRoomType().getName())
                .pricePerNight(hp.getPricePerNight())
                .active(hp.isActive())
                .createdAt(hp.getCreatedAt())
                .updatedAt(hp.getUpdatedAt())
                .build();
    }
}
