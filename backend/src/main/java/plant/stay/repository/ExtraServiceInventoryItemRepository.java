package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.ExtraServiceInventoryItem;

import java.util.List;

public interface ExtraServiceInventoryItemRepository extends JpaRepository<ExtraServiceInventoryItem, Long> {

    @Query("SELECT e FROM ExtraServiceInventoryItem e JOIN FETCH e.inventoryItem WHERE e.extraService.id = :extraServiceId")
    List<ExtraServiceInventoryItem> findByExtraServiceId(@Param("extraServiceId") Long extraServiceId);

    @Query("SELECT e FROM ExtraServiceInventoryItem e JOIN FETCH e.inventoryItem WHERE e.extraService.id IN :extraServiceIds")
    List<ExtraServiceInventoryItem> findByExtraServiceIdIn(@Param("extraServiceIds") List<Long> extraServiceIds);

    void deleteByExtraServiceId(Long extraServiceId);
}
