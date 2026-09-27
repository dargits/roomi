package plant.stay.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.model.BookingStatus;
import plant.stay.repository.BookingRepository;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class PendingBookingExpiryScheduler {

    private final BookingRepository bookingRepository;

    /**
     * Tự động kiểm tra và hủy các đặt phòng mới (NEW) quá hạn giữ chỗ (mặc định sau 2 giờ chưa xác nhận)
     * Chạy định kỳ mỗi 15 phút (900,000 ms)
     */
    @Scheduled(fixedRate = 900_000)
    @Transactional
    public void expirePendingBookings() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(2);
        int count = bookingRepository.expireOldPendingBookings(
                BookingStatus.NEW,
                BookingStatus.CANCELLED,
                threshold
        );
        if (count > 0) {
            log.info("Auto-expired {} pending (NEW) bookings created before {}", count, threshold);
        }
    }
}
