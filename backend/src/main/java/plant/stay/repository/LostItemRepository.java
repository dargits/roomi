package plant.stay.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.LostItem;
import plant.stay.model.LostItemStatus;

import java.time.LocalDate;
import java.util.List;

public interface LostItemRepository extends JpaRepository<LostItem, Long>, JpaSpecificationExecutor<LostItem> {

    List<LostItem> findByRoomId(Long roomId);

    List<LostItem> findByStatus(LostItemStatus status);

    @Query("SELECT l FROM LostItem l " +
           "JOIN FETCH l.room r " +
           "LEFT JOIN FETCH l.booking b " +
           "LEFT JOIN FETCH b.guest g " +
           "LEFT JOIN FETCH l.createdBy " +
           "LEFT JOIN FETCH l.returnedBy " +
           "LEFT JOIN FETCH l.disposedBy " +
           "WHERE l.id = :id")
    LostItem findDetailById(@Param("id") Long id);

    long countByStatus(LostItemStatus status);

    @Query("SELECT COUNT(l) FROM LostItem l WHERE l.status = 'HOLDING' AND l.retentionExpiryDate < :today")
    long countExpiredHoldingItems(@Param("today") LocalDate today);

    @Query("SELECT COUNT(l) FROM LostItem l WHERE l.status = 'RETURNED' AND l.returnedAt >= :startOfMonth")
    long countReturnedSince(@Param("startOfMonth") java.time.LocalDateTime startOfMonth);
}
