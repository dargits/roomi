package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import plant.stay.model.UserExtraPermission;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserExtraPermissionRepository extends JpaRepository<UserExtraPermission, Long> {
    List<UserExtraPermission> findByUserIdAndIsRevokedFalse(Long userId);
    List<UserExtraPermission> findByUserId(Long userId);

    @Query("SELECT p FROM UserExtraPermission p WHERE p.user.id = :userId " +
           "AND p.permission = :permission AND p.isRevoked = false " +
           "AND (p.expiresAt IS NULL OR p.expiresAt >= :today)")
    Optional<UserExtraPermission> findActivePermission(
            @Param("userId") Long userId,
            @Param("permission") String permission,
            @Param("today") LocalDate today);
}
