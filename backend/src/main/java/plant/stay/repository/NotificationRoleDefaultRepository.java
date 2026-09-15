package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.NotificationRoleDefault;
import plant.stay.model.Role;

import java.util.List;

public interface NotificationRoleDefaultRepository extends JpaRepository<NotificationRoleDefault, Long> {
    List<NotificationRoleDefault> findByRole(Role role);
    List<NotificationRoleDefault> findAll();
}
