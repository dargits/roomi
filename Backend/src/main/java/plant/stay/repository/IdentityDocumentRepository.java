package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import plant.stay.model.IdentityDocument;
import plant.stay.model.IdentityDocumentType;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface IdentityDocumentRepository extends JpaRepository<IdentityDocument, Long> {
    List<IdentityDocument> findByGuestId(Long guestId);

    List<IdentityDocument> findByGuestIdIn(Collection<Long> guestIds);

    Optional<IdentityDocument> findByGuestIdAndDocumentType(Long guestId, IdentityDocumentType documentType);
}