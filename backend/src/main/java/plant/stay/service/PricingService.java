package plant.stay.service;

import plant.stay.dto.request.HolidayPriceRequest;
import plant.stay.dto.request.WeekendPriceConfigRequest;
import plant.stay.dto.response.HolidayPriceResponse;
import plant.stay.dto.response.NightlyPriceBreakdownResponse;
import plant.stay.dto.response.NightlyPriceDetailDto;
import plant.stay.dto.response.WeekendPriceConfigResponse;
import plant.stay.model.RoomType;
import plant.stay.model.User;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface PricingService {
    // Giá cuối tuần
    List<WeekendPriceConfigResponse> getWeekendConfigs(Long roomTypeId);
    WeekendPriceConfigResponse saveWeekendConfig(WeekendPriceConfigRequest req, User actor);
    void deleteWeekendConfig(Long id, User actor);

    // Giá ngày lễ
    List<HolidayPriceResponse> getHolidayPrices(Long roomTypeId);
    HolidayPriceResponse saveHolidayPrice(HolidayPriceRequest req, User actor);
    void deleteHolidayPrice(Long id, User actor);

    // Tính giá một đêm theo thứ tự ưu tiên: Lễ > Cuối tuần > Mùa > Cơ bản
    NightlyPriceDetailDto calculateNightPrice(RoomType roomType, LocalDate night);

    // Tính tổng tiền phòng cho cả kỳ
    BigDecimal calculateTotalPrice(RoomType roomType, LocalDate checkIn, LocalDate checkOut);

    // Bảng chi tiết giá từng đêm + phụ thu vượt sức chứa
    NightlyPriceBreakdownResponse calculateBreakdown(Long roomTypeId, LocalDate checkIn, LocalDate checkOut, Integer guestCount, Integer childCount);
}
