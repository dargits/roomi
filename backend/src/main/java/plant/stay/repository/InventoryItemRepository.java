package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.InventoryItem;

import java.util.List;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    @Query("SELECT i FROM InventoryItem i WHERE i.quantityOnHand <= i.lowStockThreshold")
    List<InventoryItem> findLowStock();

    boolean existsByName(String name);
}
