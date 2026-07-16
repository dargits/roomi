package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import roomi.dev.model.RoomType;

public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {
}
