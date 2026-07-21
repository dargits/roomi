package roomi.dev.util.time;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TimeSlot — kiểm tra khoảng thời gian")
class TimeSlotTest {

    // ====================================================== isValid
    @Nested
    @DisplayName("isValid()")
    class IsValid {

        @Test
        @DisplayName("hợp lệ khi startDate < endDate")
        void valid_whenStartBeforeEnd() {
            TimeSlot slot = TimeSlot.of(ld("2026-08-01"), ld("2026-08-05"));
            assertThat(slot.isValid()).isTrue();
        }

        @Test
        @DisplayName("không hợp lệ khi startDate == endDate")
        void invalid_whenStartEqualsEnd() {
            TimeSlot slot = TimeSlot.of(ld("2026-08-01"), ld("2026-08-01"));
            assertThat(slot.isValid()).isFalse();
        }

        @Test
        @DisplayName("không hợp lệ khi startDate > endDate")
        void invalid_whenStartAfterEnd() {
            TimeSlot slot = TimeSlot.of(ld("2026-08-10"), ld("2026-08-05"));
            assertThat(slot.isValid()).isFalse();
        }

        @Test
        @DisplayName("không hợp lệ khi startDate null")
        void invalid_whenStartNull() {
            TimeSlot slot = TimeSlot.of(null, ld("2026-08-05"));
            assertThat(slot.isValid()).isFalse();
        }

        @Test
        @DisplayName("không hợp lệ khi endDate null")
        void invalid_whenEndNull() {
            TimeSlot slot = TimeSlot.of(ld("2026-08-01"), null);
            assertThat(slot.isValid()).isFalse();
        }
    }

    // ====================================================== overlapsWith
    @Nested
    @DisplayName("overlapsWith() — kiểm tra chồng lấn")
    class OverlapsWith {

        // Slot cơ sở: [08-10, 08-15)
        private final TimeSlot base = TimeSlot.of(ld("2026-08-10"), ld("2026-08-15"));

        @Test
        @DisplayName("chồng lấn hoàn toàn bên trong: [08-11, 08-13)")
        void overlaps_whenOtherInsideBase() {
            assertThat(base.overlapsWith(TimeSlot.of(ld("2026-08-11"), ld("2026-08-13")))).isTrue();
        }

        @Test
        @DisplayName("chồng lấn từ trái: [08-08, 08-12)")
        void overlaps_whenOtherStartsBeforeBase() {
            assertThat(base.overlapsWith(TimeSlot.of(ld("2026-08-08"), ld("2026-08-12")))).isTrue();
        }

        @Test
        @DisplayName("chồng lấn từ phải: [08-13, 08-18)")
        void overlaps_whenOtherEndsAfterBase() {
            assertThat(base.overlapsWith(TimeSlot.of(ld("2026-08-13"), ld("2026-08-18")))).isTrue();
        }

        @Test
        @DisplayName("bao phủ hoàn toàn: [08-05, 08-20)")
        void overlaps_whenOtherCoversEntireBase() {
            assertThat(base.overlapsWith(TimeSlot.of(ld("2026-08-05"), ld("2026-08-20")))).isTrue();
        }

        @Test
        @DisplayName("KHÔNG chồng lấn — kết thúc đúng ngày bắt đầu của base: [08-05, 08-10)")
        void noOverlap_whenOtherEndsAtBaseStart() {
            assertThat(base.overlapsWith(TimeSlot.of(ld("2026-08-05"), ld("2026-08-10")))).isFalse();
        }

        @Test
        @DisplayName("KHÔNG chồng lấn — bắt đầu đúng ngày kết thúc của base: [08-15, 08-20)")
        void noOverlap_whenOtherStartsAtBaseEnd() {
            assertThat(base.overlapsWith(TimeSlot.of(ld("2026-08-15"), ld("2026-08-20")))).isFalse();
        }

        @Test
        @DisplayName("KHÔNG chồng lấn — hoàn toàn trước base: [08-01, 08-09)")
        void noOverlap_whenOtherBeforeBase() {
            assertThat(base.overlapsWith(TimeSlot.of(ld("2026-08-01"), ld("2026-08-09")))).isFalse();
        }

        @Test
        @DisplayName("KHÔNG chồng lấn — hoàn toàn sau base: [08-16, 08-20)")
        void noOverlap_whenOtherAfterBase() {
            assertThat(base.overlapsWith(TimeSlot.of(ld("2026-08-16"), ld("2026-08-20")))).isFalse();
        }

        @Test
        @DisplayName("trả về false khi other == null")
        void noOverlap_whenOtherNull() {
            assertThat(base.overlapsWith(null)).isFalse();
        }

        @Test
        @DisplayName("trả về false khi chính slot không hợp lệ")
        void noOverlap_whenSelfInvalid() {
            TimeSlot invalid = TimeSlot.of(ld("2026-08-15"), ld("2026-08-10")); // start > end
            assertThat(invalid.overlapsWith(base)).isFalse();
        }
    }

    // ====================================================== contains
    @Nested
    @DisplayName("contains() — ngày nằm trong slot")
    class Contains {

        private final TimeSlot slot = TimeSlot.of(ld("2026-08-10"), ld("2026-08-15"));

        @Test
        @DisplayName("chứa ngày bắt đầu (inclusive)")
        void contains_startDate() {
            assertThat(slot.contains(ld("2026-08-10"))).isTrue();
        }

        @Test
        @DisplayName("chứa ngày giữa")
        void contains_middleDate() {
            assertThat(slot.contains(ld("2026-08-12"))).isTrue();
        }

        @Test
        @DisplayName("KHÔNG chứa ngày kết thúc (exclusive)")
        void notContains_endDate() {
            assertThat(slot.contains(ld("2026-08-15"))).isFalse();
        }

        @Test
        @DisplayName("KHÔNG chứa ngày trước slot")
        void notContains_beforeSlot() {
            assertThat(slot.contains(ld("2026-08-09"))).isFalse();
        }

        @Test
        @DisplayName("KHÔNG chứa ngày sau slot")
        void notContains_afterSlot() {
            assertThat(slot.contains(ld("2026-08-16"))).isFalse();
        }

        @Test
        @DisplayName("trả về false khi date null")
        void notContains_nullDate() {
            assertThat(slot.contains(null)).isFalse();
        }
    }

    // ====================================================== getNights
    @Nested
    @DisplayName("getNights() — số đêm")
    class GetNights {

        @Test
        @DisplayName("4 đêm: 2026-08-01 → 2026-08-05")
        void fourNights() {
            TimeSlot slot = TimeSlot.of(ld("2026-08-01"), ld("2026-08-05"));
            assertThat(slot.getNights()).isEqualTo(4);
        }

        @Test
        @DisplayName("1 đêm: 2026-08-01 → 2026-08-02")
        void oneNight() {
            TimeSlot slot = TimeSlot.of(ld("2026-08-01"), ld("2026-08-02"));
            assertThat(slot.getNights()).isEqualTo(1);
        }

        @Test
        @DisplayName("0 đêm khi slot không hợp lệ (start == end)")
        void zeroNights_whenInvalid() {
            TimeSlot slot = TimeSlot.of(ld("2026-08-01"), ld("2026-08-01"));
            assertThat(slot.getNights()).isEqualTo(0);
        }
    }

    // ====================================================== factory + toString
    @Nested
    @DisplayName("of() + toString()")
    class FactoryAndToString {

        @Test
        @DisplayName("of() tạo đúng startDate và endDate")
        void of_setsFields() {
            LocalDate start = ld("2026-09-01");
            LocalDate end   = ld("2026-09-05");
            TimeSlot slot   = TimeSlot.of(start, end);
            assertThat(slot.getStartDate()).isEqualTo(start);
            assertThat(slot.getEndDate()).isEqualTo(end);
        }

        @Test
        @DisplayName("toString() có dạng [start → end]")
        void toString_format() {
            TimeSlot slot = TimeSlot.of(ld("2026-09-01"), ld("2026-09-05"));
            assertThat(slot.toString()).isEqualTo("[2026-09-01 → 2026-09-05]");
        }
    }

    // ====================================================== helper
    private static LocalDate ld(String date) {
        return LocalDate.parse(date);
    }
}
