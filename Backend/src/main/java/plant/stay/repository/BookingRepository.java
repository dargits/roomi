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

    // Lấy booking check-in/check-out trong ngày hôm nay
    @Query("SELECT b FROM Booking b WHERE (b.checkInDate = :today OR b.checkOutDate = :today) " +
           "AND b.status NOT IN ('CANCELLED', 'NO_SHOW')")
    List<Booking> findTodayCheckinCheckout(@Param("today") LocalDate today);

    // Báo cáo doanh thu
    @Query("SELECT b FROM Booking b WHERE b.checkOutDate BETWEEN :from AND :to " +
           "AND b.status = 'CHECKED_OUT'")
    List<Booking> findCheckedOutBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
