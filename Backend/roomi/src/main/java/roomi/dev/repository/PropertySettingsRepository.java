package roomi.dev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import roomi.dev.model.PropertySettings;

public interface PropertySettingsRepository extends JpaRepository<PropertySettings, Long> {
}
