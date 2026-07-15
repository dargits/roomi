package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import roomi.dev.model.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByPhone(String phone);
}