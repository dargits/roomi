package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.CancellationPolicy;

import java.util.List;
import java.util.Optional;

public interface CancellationPolicyRepository extends JpaRepository<CancellationPolicy, Long> {
    List<CancellationPolicy> findByRoomTypeId(Long roomTypeId);
    Optional<CancellationPolicy> findByRoomTypeIsNull(); // Chính sách chung (áp dụng cho tất cả)
}
