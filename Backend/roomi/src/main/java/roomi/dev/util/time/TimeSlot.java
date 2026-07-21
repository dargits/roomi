package roomi.dev.util.time;

import lombok.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Đại diện cho một khoảng thời gian (time slot) với ngày bắt đầu và kết thúc.
 * Sử dụng cho việc kiểm tra xung đột lịch đặt phòng.
 */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TimeSlot {
    
    private LocalDate startDate;
    private LocalDate endDate;
    
    /**
     * Kiểm tra xem khoảng thời gian này có hợp lệ không.
     * Hợp lệ khi: startDate < endDate
     */
    public boolean isValid() {
        return startDate != null 
            && endDate != null 
            && startDate.isBefore(endDate);
    }
    
    /**
     * Kiểm tra xem khoảng thời gian này có chồng lấn với khoảng thời gian khác không.
     * 
     * Hai khoảng thời gian [A1, A2) và [B1, B2) chồng lấn khi:
     * A1 < B2 AND A2 > B1
     * 
     * Ví dụ:
     * - [2026-01-01, 2026-01-05) và [2026-01-03, 2026-01-07) → chồng lấn
     * - [2026-01-01, 2026-01-03) và [2026-01-03, 2026-01-05) → KHÔNG chồng lấn (tiếp giáp)
     * - [2026-01-01, 2026-01-05) và [2026-01-06, 2026-01-10) → KHÔNG chồng lấn
     */
    public boolean overlapsWith(TimeSlot other) {
        if (other == null || !this.isValid() || !other.isValid()) {
            return false;
        }
        
        return this.startDate.isBefore(other.endDate) 
            && this.endDate.isAfter(other.startDate);
    }
    
    /**
     * Kiểm tra xem một ngày cụ thể có nằm trong khoảng thời gian này không.
     * Bao gồm cả startDate, loại trừ endDate (interval [startDate, endDate))
     */
    public boolean contains(LocalDate date) {
        if (date == null || !this.isValid()) {
            return false;
        }
        
        return !date.isBefore(startDate) && date.isBefore(endDate);
    }
    
    /**
     * Tính số đêm (nights) trong khoảng thời gian này.
     * Ví dụ: check-in 2026-01-01, check-out 2026-01-05 → 4 đêm
     */
    public long getNights() {
        if (!isValid()) {
            return 0;
        }
        return ChronoUnit.DAYS.between(startDate, endDate);
    }
    
    /**
     * Kiểm tra xem khoảng thời gian này có bắt đầu trong quá khứ không.
     */
    public boolean startsInPast() {
        return startDate != null && startDate.isBefore(LocalDate.now());
    }
    
    /**
     * Kiểm tra xem khoảng thời gian này có kết thúc trong quá khứ không.
     */
    public boolean endsInPast() {
        return endDate != null && endDate.isBefore(LocalDate.now());
    }
    
    /**
     * Tạo TimeSlot từ check-in và check-out date.
     */
    public static TimeSlot of(LocalDate checkIn, LocalDate checkOut) {
        return TimeSlot.builder()
                .startDate(checkIn)
                .endDate(checkOut)
                .build();
    }
    
    @Override
    public String toString() {
        return "[" + startDate + " → " + endDate + "]";
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TimeSlot timeSlot = (TimeSlot) o;
        return startDate.equals(timeSlot.startDate) && endDate.equals(timeSlot.endDate);
    }
    
    @Override
    public int hashCode() {
        int result = startDate.hashCode();
        result = 31 * result + endDate.hashCode();
        return result;
    }
}
