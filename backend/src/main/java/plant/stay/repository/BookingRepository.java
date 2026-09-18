package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.Booking;
import plant.stay.model.BookingStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByGuestId(Long guestId);
    List<Booking> findByStatus(BookingStatus status);
    List<Booking> findByRoomId(Long roomId);
    List<Booking> findByGroupBookingId(Long groupBookingId);
    Booking findTopByRoomIdAndStatusOrderByCheckOutDateDesc(Long roomId, BookingStatus status);

    @Query("SELECT b FROM Booking b JOIN FETCH b.roomType WHERE b.groupBooking.id = :groupBookingId " +
           "AND b.room IS NULL AND b.status IN ('NEW', 'CONFIRMED') ORDER BY b.id")
    List<Booking> findUnassignedAssignableByGroupBookingId(@Param("groupBookingId") Long groupBookingId);

       @Query("SELECT b FROM Booking b " +
           "JOIN FETCH b.guest g " +
           "LEFT JOIN FETCH b.room " +
           "LEFT JOIN FETCH b.stayDeclaration " +
           "WHERE b.status = 'CHECKED_IN' " +
           "AND b.checkedInAt >= :from " +
           "AND b.checkedInAt < :to " +
           "ORDER BY b.checkedInAt ASC")
    List<Booking> findCheckedInWithGuestDocumentsBetween(@Param("from") LocalDateTime from,
                                                         @Param("to") LocalDateTime to);

    @Query("SELECT b FROM Booking b " +
           "JOIN FETCH b.guest g " +
           "LEFT JOIN FETCH b.room " +
           "LEFT JOIN FETCH b.stayDeclaration " +
           "WHERE b.status IN ('CHECKED_IN', 'CHECKED_OUT') " +
           "AND b.checkInDate <= :to " +
           "AND b.checkOutDate >= :from " +
           "ORDER BY b.checkedInAt DESC, b.checkInDate DESC, b.id DESC")
    List<Booking> findStayHistoryBetween(@Param("from") LocalDate from,
                                         @Param("to") LocalDate to);

    // Lấy booking trong khoảng thời gian cho lịch phòng
    @Query("SELECT b FROM Booking b WHERE b.checkInDate <= :to AND b.checkOutDate >= :from " +
           "AND b.status NOT IN ('CANCELLED', 'NO_SHOW')")
    List<Booking> findForCalendar(@Param("from") LocalDate from, @Param("to") LocalDate to);

    // Kiểm tra phòng có bị đặt chồng không (QTN-01)
    @Query("SELECT b FROM Booking b WHERE b.room.id = :roomId " +
           "AND b.status IN ('CONFIRMED', 'CHECKED_IN') " +
           "AND b.id <> :excludeId " +
           "AND b.checkInDate < :checkOut AND b.checkOutDate > :checkIn")
    List<Booking> findConflictingBookings(@Param("roomId") Long roomId,
                                          @Param("checkIn") LocalDate checkIn,
                                          @Param("checkOut") LocalDate checkOut,
                                          @Param("excludeId") Long excludeId);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.roomType.id = :roomTypeId " +
           "AND b.status IN ('NEW', 'CONFIRMED', 'CHECKED_IN') " +
           "AND b.checkInDate < :checkOut AND b.checkOutDate > :checkIn")
    long countActiveOverlappingByRoomType(@Param("roomTypeId") Long roomTypeId,
                                          @Param("checkIn") LocalDate checkIn,
                                          @Param("checkOut") LocalDate checkOut);

    @Query("SELECT b FROM Booking b WHERE b.roomType.id = :roomTypeId " +
           "AND b.status IN ('NEW', 'CONFIRMED', 'CHECKED_IN') " +
           "AND b.checkInDate < :maxDate AND b.checkOutDate > :minDate")
    List<Booking> findActiveOverlappingByRoomTypeAndRange(@Param("roomTypeId") Long roomTypeId,
                                                          @Param("minDate") LocalDate minDate,
                                                          @Param("maxDate") LocalDate maxDate);

    // Lấy booking check-in/check-out trong ngày hôm nay
    @Query("SELECT b FROM Booking b WHERE (b.checkInDate = :today OR b.checkOutDate = :today) " +
           "AND b.status NOT IN ('CANCELLED', 'NO_SHOW')")
    List<Booking> findTodayCheckinCheckout(@Param("today") LocalDate today);

    // Báo cáo doanh thu
    @Query("SELECT DISTINCT b FROM Booking b " +
           "LEFT JOIN FETCH b.room r " +
           "LEFT JOIN FETCH b.roomType rt " +
           "LEFT JOIN FETCH b.guest g " +
           "WHERE b.checkOutDate BETWEEN :from AND :to " +
           "AND b.status = 'CHECKED_OUT'")
    List<Booking> findCheckedOutBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    // Báo cáo cơ cấu theo kênh: lấy tất cả booking liên quan đến khoảng thời gian (cả hoàn thành, hủy, no-show)
    @Query("SELECT DISTINCT b FROM Booking b " +
           "LEFT JOIN FETCH b.room r " +
           "LEFT JOIN FETCH b.roomType rt " +
           "LEFT JOIN FETCH b.guest g " +
           "WHERE (b.checkInDate <= :to AND b.checkOutDate >= :from) " +
           "OR (b.checkOutDate BETWEEN :from AND :to) " +
           "OR (b.checkInDate BETWEEN :from AND :to)")
    List<Booking> findBookingsForChannelReport(@Param("from") LocalDate from, @Param("to") LocalDate to);

    // NCL-06-CN-004: Tìm booking sắp tới của phòng để xác định độ ưu tiên dọn phòng
    @Query("SELECT b FROM Booking b JOIN FETCH b.guest WHERE b.room.id = :roomId " +
           "AND b.status = 'CONFIRMED' AND b.checkInDate >= :today " +
           "ORDER BY b.checkInDate ASC")
    List<Booking> findUpcomingConfirmedBookingsForRoom(@Param("roomId") Long roomId, @Param("today") LocalDate today);

    // NCL-06-CN-006: Tìm tất cả booking sắp tới hoặc đang tới của phòng bị ảnh hưởng bởi sự cố
    @Query("SELECT b FROM Booking b JOIN FETCH b.guest WHERE b.room.id = :roomId " +
           "AND b.status IN ('NEW', 'CONFIRMED') AND b.checkOutDate >= :today " +
           "ORDER BY b.checkInDate ASC")
    List<Booking> findUpcomingBookingsForRoom(@Param("roomId") Long roomId, @Param("today") LocalDate today);

    // Tự động nhắc nhở nhận phòng trước 1 ngày
    @Query("SELECT b FROM Booking b " +
           "JOIN FETCH b.guest g " +
           "JOIN FETCH b.roomType rt " +
           "LEFT JOIN FETCH b.room r " +
           "WHERE b.checkInDate = :checkInDate " +
           "AND b.status IN ('CONFIRMED', 'NEW') " +
           "AND b.reminderSentAt IS NULL " +
           "AND g.email IS NOT NULL AND TRIM(g.email) <> ''")
    List<Booking> findBookingsNeedingCheckInReminder(@Param("checkInDate") LocalDate checkInDate);

    // Truy vấn danh sách đặt phòng đang lưu trú (CHECKED_IN)
    @Query("SELECT DISTINCT b FROM Booking b " +
           "JOIN FETCH b.guest g " +
           "JOIN FETCH b.roomType rt " +
           "LEFT JOIN FETCH b.room r " +
           "WHERE b.status = 'CHECKED_IN' " +
           "ORDER BY r.roomNumber ASC, b.id ASC")
    List<Booking> findInHouseBookings();

    // Tìm lượt lưu trú vừa kết thúc gần nhất (hoặc đang lưu trú) của phòng để gắn đồ để quên
    @Query("SELECT b FROM Booking b JOIN FETCH b.guest g WHERE b.room.id = :roomId " +
           "AND b.status IN ('CHECKED_OUT', 'CHECKED_IN') " +
           "ORDER BY CASE WHEN b.checkedOutAt IS NOT NULL THEN b.checkedOutAt ELSE b.createdAt END DESC, b.checkOutDate DESC, b.id DESC")
    List<Booking> findRecentStaysForRoom(@Param("roomId") Long roomId, org.springframework.data.domain.Pageable pageable);
}
