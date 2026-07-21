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

    /**
     * Kiểm tra một phòng cụ thể đã bị đặt chồng lấn trong khoảng [checkIn, checkOut] chưa.
     * Loại trừ booking đang cập nhật (excludeId = -1 khi tạo mới).
     * Chỉ tính các booking chưa huỷ / no-show.
     */
    @Query("SELECT COUNT(b) > 0 FROM Booking b " +
           "WHERE b.room.id = :roomId " +
           "AND b.id <> :excludeId " +
           "AND b.status NOT IN (roomi.dev.model.Booking$Status.CANCELLED, roomi.dev.model.Booking$Status.NO_SHOW) " +
           "AND b.checkInDate  < :checkOut " +
           "AND b.checkOutDate > :checkIn")
    boolean existsRoomConflict(@Param("roomId")    Long roomId,
                               @Param("checkIn")   LocalDate checkIn,
                               @Param("checkOut")  LocalDate checkOut,
                               @Param("excludeId") Long excludeId);

    /**
     * Lấy danh sách booking của một phòng trong khoảng thời gian (để hiển thị lịch).
     */
    @Query("SELECT b FROM Booking b " +
           "WHERE b.room.id = :roomId " +
           "AND b.status NOT IN (roomi.dev.model.Booking$Status.CANCELLED, roomi.dev.model.Booking$Status.NO_SHOW) " +
           "AND b.checkInDate  < :checkOut " +
           "AND b.checkOutDate > :checkIn " +
           "ORDER BY b.checkInDate")
    List<Booking> findActiveBookingsByRoomAndDateRange(@Param("roomId")   Long roomId,
                                                       @Param("checkIn")  LocalDate checkIn,
                                                       @Param("checkOut") LocalDate checkOut);

    /**
     * Lấy danh sách booking theo roomType trong khoảng thời gian.
     * Dùng cho việc tìm phòng available hoặc calendar view theo loại phòng.
     */
    @Query("SELECT b FROM Booking b " +
           "WHERE b.roomType.id = :roomTypeId " +
           "AND b.status NOT IN (roomi.dev.model.Booking$Status.CANCELLED, roomi.dev.model.Booking$Status.NO_SHOW) " +
           "AND b.checkInDate < :checkOut " +
           "AND b.checkOutDate > :checkIn " +
           "ORDER BY b.checkInDate")
    List<Booking> findActiveBookingsByRoomTypeAndDateRange(@Param("roomTypeId") Long roomTypeId,
                                                           @Param("checkIn")    LocalDate checkIn,
                                                           @Param("checkOut")   LocalDate checkOut);

    /**
     * Lấy tất cả booking đang active (không cancelled/no-show) trong khoảng thời gian.
     * Dùng cho calendar overview toàn khách sạn.
     */
    @Query("SELECT b FROM Booking b " +
           "WHERE b.status NOT IN (roomi.dev.model.Booking$Status.CANCELLED, roomi.dev.model.Booking$Status.NO_SHOW) " +
           "AND b.checkInDate < :checkOut " +
           "AND b.checkOutDate > :checkIn " +
           "ORDER BY b.checkInDate")
    List<Booking> findAllActiveBookingsInDateRange(@Param("checkIn")  LocalDate checkIn,
                                                   @Param("checkOut") LocalDate checkOut);

    /**
     * Đếm số booking active của một phòng trong khoảng thời gian.
     * Dùng để nhanh chóng check available.
     */
    @Query("SELECT COUNT(b) FROM Booking b " +
           "WHERE b.room.id = :roomId " +
           "AND b.status NOT IN (roomi.dev.model.Booking$Status.CANCELLED, roomi.dev.model.Booking$Status.NO_SHOW) " +
           "AND b.checkInDate < :checkOut " +
           "AND b.checkOutDate > :checkIn")
    long countActiveBookingsByRoomAndDateRange(@Param("roomId")   Long roomId,
                                              @Param("checkIn")  LocalDate checkIn,
                                              @Param("checkOut") LocalDate checkOut);
}
