package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.BookingServiceUsage;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface BookingServiceUsageRepository extends JpaRepository<BookingServiceUsage, Long> {
    List<BookingServiceUsage> findByBookingId(Long bookingId);
    void deleteByBookingId(Long bookingId);

    long countByExtraServiceId(Long extraServiceId);
    boolean existsByExtraServiceId(Long extraServiceId);

    @Query("SELECT u.extraService.id, COUNT(u.id) FROM BookingServiceUsage u WHERE u.extraService.id IN :serviceIds GROUP BY u.extraService.id")
    List<Object[]> countUsagesByServiceIds(@Param("serviceIds") Collection<Long> serviceIds);

    @Query("SELECT u FROM BookingServiceUsage u " +
           "JOIN FETCH u.booking b " +
           "LEFT JOIN FETCH b.roomType rt " +
           "LEFT JOIN FETCH b.room r " +
           "LEFT JOIN FETCH u.extraService es " +
           "WHERE b.id IN :bookingIds")
    List<BookingServiceUsage> findByBookingIdInWithDetails(@Param("bookingIds") Collection<Long> bookingIds);
}
