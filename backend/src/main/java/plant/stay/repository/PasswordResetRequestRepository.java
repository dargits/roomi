package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import plant.stay.model.PasswordResetRequest;
import plant.stay.model.PasswordResetStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, Long> {
    List<PasswordResetRequest> findByStatusOrderByRequestedAtDesc(PasswordResetStatus status);
    List<PasswordResetRequest> findAllByOrderByRequestedAtDesc();
    Optional<PasswordResetRequest> findFirstByUserIdAndStatusOrderByRequestedAtDesc(Long userId, PasswordResetStatus status);
    boolean existsByUserIdAndStatus(Long userId, PasswordResetStatus status);
    long countByStatus(PasswordResetStatus status);
}
