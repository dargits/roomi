package roomi.dev.util.time;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("TimeRangeValidator — validate khoảng thời gian booking")
class TimeRangeValidatorTest {

    // ====================================================== validate() — full check
    @Nested
    @DisplayName("validate() — kiểm tra đầy đủ (thứ tự + không trong quá khứ)")
    class Validate {

        @Test
        @DisplayName("hợp lệ — checkIn hôm nay, checkOut ngày mai")
        void valid_todayToTomorrow() {
            LocalDate today = LocalDate.now();
            LocalDate tomorrow = today.plusDays(1);
            // không ném exception = pass
            TimeRangeValidator.validate(today, tomorrow);
        }

        @Test
        @DisplayName("hợp lệ — checkIn tương lai")
        void valid_futureDate() {
            LocalDate future = LocalDate.now().plusDays(10);
            TimeRangeValidator.validate(future, future.plusDays(3));
        }

        @Test
        @DisplayName("ném BusinessException khi checkIn null")
        void throwsException_whenCheckInNull() {
            assertThatThrownBy(() ->
                    TimeRangeValidator.validate(null, LocalDate.now().plusDays(1))
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("checkInDate không được để trống")
            .extracting("errorCode").isEqualTo(ErrorCode.MISSING_REQUIRED_FIELD);
        }

        @Test
        @DisplayName("ném BusinessException khi checkOut null")
        void throwsException_whenCheckOutNull() {
            assertThatThrownBy(() ->
                    TimeRangeValidator.validate(LocalDate.now(), null)
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("checkOutDate không được để trống")
            .extracting("errorCode").isEqualTo(ErrorCode.MISSING_REQUIRED_FIELD);
        }

        @Test
        @DisplayName("ném BusinessException khi checkIn >= checkOut")
        void throwsException_whenCheckInNotBeforeCheckOut() {
            LocalDate date = LocalDate.now();
            assertThatThrownBy(() ->
                    TimeRangeValidator.validate(date, date)  // same day
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("checkInDate")
            .hasMessageContaining("phải trước checkOutDate")
            .extracting("errorCode").isEqualTo(ErrorCode.INVALID_DATE_RANGE);
        }

        @Test
        @DisplayName("ném BusinessException khi checkIn trong quá khứ")
        void throwsException_whenCheckInInPast() {
            LocalDate yesterday = LocalDate.now().minusDays(1);
            LocalDate today     = LocalDate.now();

            assertThatThrownBy(() ->
                    TimeRangeValidator.validate(yesterday, today)
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("checkInDate")
            .hasMessageContaining("không được là ngày trong quá khứ")
            .extracting("errorCode").isEqualTo(ErrorCode.INVALID_DATE_RANGE);
        }
    }

    // ====================================================== validateDateOrder() — chỉ check thứ tự
    @Nested
    @DisplayName("validateDateOrder() — chỉ kiểm tra checkIn < checkOut (cho phép quá khứ)")
    class ValidateDateOrder {

        @Test
        @DisplayName("hợp lệ — checkIn trong quá khứ nhưng < checkOut")
        void valid_pastDateAllowed() {
            LocalDate past = LocalDate.now().minusDays(5);
            LocalDate today = LocalDate.now();
            // không ném exception = pass
            TimeRangeValidator.validateDateOrder(past, today);
        }

        @Test
        @DisplayName("ném BusinessException khi checkIn null")
        void throwsException_whenCheckInNull() {
            assertThatThrownBy(() ->
                    TimeRangeValidator.validateDateOrder(null, LocalDate.now())
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("checkInDate không được để trống");
        }

        @Test
        @DisplayName("ném BusinessException khi checkOut null")
        void throwsException_whenCheckOutNull() {
            assertThatThrownBy(() ->
                    TimeRangeValidator.validateDateOrder(LocalDate.now(), null)
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("checkOutDate không được để trống");
        }

        @Test
        @DisplayName("ném BusinessException khi checkIn == checkOut")
        void throwsException_whenSameDay() {
            LocalDate date = LocalDate.now();
            assertThatThrownBy(() ->
                    TimeRangeValidator.validateDateOrder(date, date)
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("phải trước checkOutDate");
        }

        @Test
        @DisplayName("ném BusinessException khi checkIn > checkOut")
        void throwsException_whenCheckInAfterCheckOut() {
            LocalDate checkIn = LocalDate.now().plusDays(5);
            LocalDate checkOut = LocalDate.now().plusDays(3);
            assertThatThrownBy(() ->
                    TimeRangeValidator.validateDateOrder(checkIn, checkOut)
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("phải trước checkOutDate");
        }
    }

    // ====================================================== validateMinNights
    @Nested
    @DisplayName("validateMinNights() — kiểm tra số đêm tối thiểu")
    class ValidateMinNights {

        @Test
        @DisplayName("hợp lệ khi số đêm == min")
        void valid_whenNightsEqualsMin() {
            LocalDate checkIn = LocalDate.now();
            LocalDate checkOut = checkIn.plusDays(2);  // 2 đêm
            TimeRangeValidator.validateMinNights(checkIn, checkOut, 2);
        }

        @Test
        @DisplayName("hợp lệ khi số đêm > min")
        void valid_whenNightsMoreThanMin() {
            LocalDate checkIn = LocalDate.now();
            LocalDate checkOut = checkIn.plusDays(5);  // 5 đêm
            TimeRangeValidator.validateMinNights(checkIn, checkOut, 3);
        }

        @Test
        @DisplayName("ném BusinessException khi số đêm < min")
        void throwsException_whenNightsLessThanMin() {
            LocalDate checkIn = LocalDate.now();
            LocalDate checkOut = checkIn.plusDays(1);  // 1 đêm

            assertThatThrownBy(() ->
                    TimeRangeValidator.validateMinNights(checkIn, checkOut, 2)
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Thời gian đặt phòng tối thiểu là 2 đêm")
            .extracting("errorCode").isEqualTo(ErrorCode.INVALID_DATE_RANGE);
        }
    }

    // ====================================================== validateMaxNights
    @Nested
    @DisplayName("validateMaxNights() — kiểm tra số đêm tối đa")
    class ValidateMaxNights {

        @Test
        @DisplayName("hợp lệ khi số đêm == max")
        void valid_whenNightsEqualsMax() {
            LocalDate checkIn = LocalDate.now();
            LocalDate checkOut = checkIn.plusDays(7);  // 7 đêm
            TimeRangeValidator.validateMaxNights(checkIn, checkOut, 7);
        }

        @Test
        @DisplayName("hợp lệ khi số đêm < max")
        void valid_whenNightsLessThanMax() {
            LocalDate checkIn = LocalDate.now();
            LocalDate checkOut = checkIn.plusDays(3);  // 3 đêm
            TimeRangeValidator.validateMaxNights(checkIn, checkOut, 10);
        }

        @Test
        @DisplayName("ném BusinessException khi số đêm > max")
        void throwsException_whenNightsMoreThanMax() {
            LocalDate checkIn = LocalDate.now();
            LocalDate checkOut = checkIn.plusDays(15);  // 15 đêm

            assertThatThrownBy(() ->
                    TimeRangeValidator.validateMaxNights(checkIn, checkOut, 10)
            )
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("Thời gian đặt phòng tối đa là 10 đêm")
            .extracting("errorCode").isEqualTo(ErrorCode.INVALID_DATE_RANGE);
        }
    }
}
