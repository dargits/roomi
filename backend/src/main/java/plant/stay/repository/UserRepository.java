package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import plant.stay.model.Role;
import plant.stay.model.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByAccount(String account);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    boolean existsByEmailAndIdNot(String email, Long id);
    boolean existsByPhoneAndIdNot(String phone, Long id);

    Optional<User> findByAccount(String account);

    /** Lấy danh sách nhân viên đang hoạt động theo vai trò (dùng cho phân công buồng phòng) */
    List<User> findByRoleAndActiveTrue(Role role);
}
