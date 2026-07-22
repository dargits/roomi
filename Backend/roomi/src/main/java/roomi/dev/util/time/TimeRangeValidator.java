package roomi.dev.util.time;

import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;

import java.time.LocalDate;

/**
 * Utility class kiểm tra tính hợp lệ của khoảng thời gian đặt phòng.
 */
public final class TimeRangeValidator {
    
    private TimeRangeValidator() {
        // utility class — không cho khởi tạo
    }
    
    /**
     * Kiểm tra đầy đủ khoảng thời gian booking:
     *  1. Cả hai date không được null
     *  2. checkIn phải trước checkOut
     *  3. checkIn không được là ngày trong quá khứ
     *  4. Số đêm tối thiểu là 1
     *
     * @throws BusinessException nếu vi phạm bất kỳ điều kiện nào
     */
    public static void validate(LocalDate checkIn, LocalDate checkOut) {
        requireNotNull(checkIn, "checkInDate không được để trống");
        requireNotNull(checkOut, "checkOutDate không được để trống");
        requireCheckInBeforeCheckOut(checkIn, checkOut);
        requireNotInPast(checkIn);
    }
    
    /**
     * Kiểm tra khoảng thời gian không yêu cầu checkIn từ hôm nay trở đi.
     * Dùng cho trường hợp cập nhật booking đã có (checkIn có thể trong quá khứ).
     *
     * @throws BusinessException nếu checkIn >= checkOut
     */
    public static void validateDateOrder(LocalDate checkIn, LocalDate checkOut) {
        requireNotNull(checkIn, "checkInDate không được để trống");
        requireNotNull(checkOut, "checkOutDate không được để trống");
        requireCheckInBeforeCheckOut(checkIn, checkOut);
    }
    
    /**
     * Kiểm tra khoảng thời gian tối thiểu (minNights).
     *
     * @throws BusinessException nếu số đêm ít hơn yêu cầu
     */
    public static void validateMinNights(LocalDate checkIn, LocalDate checkOut, int minNights) {
        TimeSlot slot = TimeSlot.of(checkIn, checkOut);
        if (slot.getNights() < minNights) {
            throw new BusinessException(
                    "Thời gian đặt phòng tối thiểu là " + minNights + " đêm",
                    ErrorCode.INVALID_DATE_RANGE);
        }
    }
    
    /**
     * Kiểm tra khoảng thời gian tối đa (maxNights).
     *
     * @throws BusinessException nếu số đêm vượt quá giới hạn
     */
    public static void validateMaxNights(LocalDate checkIn, LocalDate checkOut, int maxNights) {
        TimeSlot slot = TimeSlot.of(checkIn, checkOut);
        if (slot.getNights() > maxNights) {
            throw new BusinessException(
                    "Thời gian đặt phòng tối đa là " + maxNights + " đêm",
                    ErrorCode.INVALID_DATE_RANGE);
        }
    }
    
    // ------------------------------------------------------------------ private helpers
    
    private static void requireNotNull(LocalDate date, String message) {
        if (date == null) {
            throw new BusinessException(message, ErrorCode.MISSING_REQUIRED_FIELD);
        }
    }
    
    private static void requireCheckInBeforeCheckOut(LocalDate checkIn, LocalDate checkOut) {
        if (!checkIn.isBefore(checkOut)) {
            throw new BusinessException(
                    "checkInDate (" + checkIn + ") phải trước checkOutDate (" + checkOut + ")",
                    ErrorCode.INVALID_DATE_RANGE);
        }
    }
    
    private static void requireNotInPast(LocalDate checkIn) {
        if (checkIn.isBefore(LocalDate.now())) {
            throw new BusinessException(
                    "checkInDate (" + checkIn + ") không được là ngày trong quá khứ",
                    ErrorCode.INVALID_DATE_RANGE);
        }
    }
}
