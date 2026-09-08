package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import plant.stay.model.DepositPolicy;

import java.util.List;
import java.util.Optional;

public interface DepositPolicyRepository extends JpaRepository<DepositPolicy, Long> {

    // Tìm chính sách theo loại phòng cụ thể
    Optional<DepositPolicy> findFirstByRoomTypeIdAndActiveTrue(Long roomTypeId);

    // Tìm chính sách mặc định (áp dụng tất cả loại phòng)
    Optional<DepositPolicy> findFirstByRoomTypeIsNullAndActiveTrue();

    // Lấy tất cả chính sách đang active
    List<DepositPolicy> findByActiveTrueOrderByRoomTypeIdAsc();
}
