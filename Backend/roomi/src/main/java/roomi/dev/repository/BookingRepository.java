package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import roomi.dev.model.Booking;

import java.time.LocalDate;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByGuestId(Long guestId);

    List<Booking> findByRoomId(Long roomId);

    List<Booking> findByStatus(Booking.Status status);

    @Query("SELECT COUNT(b) > 0 FROM Booking b " +
           "WHERE b.room.id = :roomId " +
           "AND b.status NOT IN (roomi.dev.model.Booking.Status.CANCELLED, roomi.dev.model.Booking.Status.NO_SHOW, roomi.dev.model.Booking.Status.CHECKED_OUT) " +
           "AND b.checkInDate <= :date " +
           "AND b.checkOutDate > :date")
    boolean isRoomOccupiedOnDate(@Param("roomId") Long roomId, @Param("date") LocalDate date);

    /**
     * Sửa lỗi: Đổi Booking$Status thành Booking.Status
     */
    @Query("SELECT COUNT(b) > 0 FROM Booking b " +
           "WHERE b.room.id = :roomId " +
           "AND b.id <> :excludeId " +
           "AND b.status NOT IN (roomi.dev.model.Booking.Status.CANCELLED, roomi.dev.model.Booking.Status.NO_SHOW, roomi.dev.model.Booking.Status.CHECKED_OUT) " +
           "AND b.checkInDate < :checkOut " +
           "AND b.checkOutDate > :checkIn")
    boolean existsRoomConflict(@Param("roomId") Long roomId,
                               @Param("checkIn") LocalDate checkIn,
                               @Param("checkOut") LocalDate checkOut,
                               @Param("excludeId") Long excludeId);

    @Query("SELECT b FROM Booking b " +
           "WHERE b.room.id = :roomId " +
           "AND b.status NOT IN (roomi.dev.model.Booking.Status.CANCELLED, roomi.dev.model.Booking.Status.NO_SHOW) " +
           "AND b.checkInDate < :checkOut " +
           "AND b.checkOutDate > :checkIn " +
           "ORDER BY b.checkInDate")
    List<Booking> findActiveBookingsByRoomAndDateRange(@Param("roomId") Long roomId,
                                                       @Param("checkIn") LocalDate checkIn,
                                                       @Param("checkOut") LocalDate checkOut);

    @Query("SELECT b FROM Booking b " +
           "WHERE b.roomType.id = :roomTypeId " +
           "AND b.status NOT IN (roomi.dev.model.Booking.Status.CANCELLED, roomi.dev.model.Booking.Status.NO_SHOW) " +
           "AND b.checkInDate < :checkOut " +
           "AND b.checkOutDate > :checkIn " +
           "ORDER BY b.checkInDate")
    List<Booking> findActiveBookingsByRoomTypeAndDateRange(@Param("roomTypeId") Long roomTypeId,
                                                           @Param("checkIn") LocalDate checkIn,
                                                           @Param("checkOut") LocalDate checkOut);

    @Query("SELECT b FROM Booking b " +
           "WHERE b.status NOT IN (roomi.dev.model.Booking.Status.CANCELLED, roomi.dev.model.Booking.Status.NO_SHOW) " +
           "AND b.checkInDate < :checkOut " +
           "AND b.checkOutDate > :checkIn " +
           "ORDER BY b.checkInDate")
    List<Booking> findAllActiveBookingsInDateRange(@Param("checkIn") LocalDate checkIn,
                                                   @Param("checkOut") LocalDate checkOut);

    @Query("SELECT COUNT(b) FROM Booking b " +
           "WHERE b.room.id = :roomId " +
           "AND b.status NOT IN (roomi.dev.model.Booking.Status.CANCELLED, roomi.dev.model.Booking.Status.NO_SHOW) " +
           "AND b.checkInDate < :checkOut " +
           "AND b.checkOutDate > :checkIn")
    long countActiveBookingsByRoomAndDateRange(@Param("roomId") Long roomId,
                                              @Param("checkIn") LocalDate checkIn,
                                              @Param("checkOut") LocalDate checkOut);

    /**
     * Bổ sung Query Search phục vụ API Search từ Frontend
     */
    @Query("SELECT b FROM Booking b " +
           "LEFT JOIN b.guest g " +
           "LEFT JOIN b.roomType rt " +
           "WHERE (:guestName IS NULL OR (g.fullName IS NOT NULL AND LOWER(g.fullName) LIKE LOWER(CONCAT('%', :guestName, '%')))) " +
           "AND (:phone IS NULL OR (g.phone IS NOT NULL AND g.phone LIKE CONCAT('%', :phone, '%'))) " +
           "AND (:idNumber IS NULL OR (g.idNumber IS NOT NULL AND g.idNumber LIKE CONCAT('%', :idNumber, '%'))) " +
           "AND (:roomTypeId IS NULL OR rt.id = :roomTypeId) " +
           "AND (:fromDate IS NULL OR b.checkInDate >= :fromDate) " +
           "AND (:toDate IS NULL OR b.checkOutDate <= :toDate) " +
           "ORDER BY b.createdAt DESC")
    List<Booking> searchBookings(@Param("guestName") String guestName,
                                 @Param("phone") String phone,
                                 @Param("idNumber") String idNumber,
                                 @Param("roomTypeId") Long roomTypeId,
                                 @Param("fromDate") LocalDate fromDate,
                                 @Param("toDate") LocalDate toDate);
}