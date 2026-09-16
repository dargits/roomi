package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.LostItemLog;

import java.util.List;

public interface LostItemLogRepository extends JpaRepository<LostItemLog, Long> {

    @Query("SELECT l FROM LostItemLog l JOIN FETCH l.performedBy WHERE l.lostItem.id = :lostItemId ORDER BY l.createdAt ASC")
    List<LostItemLog> findByLostItemIdOrderByCreatedAtAsc(@Param("lostItemId") Long lostItemId);
}
