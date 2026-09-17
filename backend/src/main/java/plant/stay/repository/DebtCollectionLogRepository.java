package plant.stay.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import plant.stay.model.DebtCollectionLog;

import java.util.List;

@Repository
public interface DebtCollectionLogRepository extends JpaRepository<DebtCollectionLog, Long> {

    /** Lấy toàn bộ nhật ký đòi nợ của một khoản, mới nhất trước */
    List<DebtCollectionLog> findByDebtApprovalRequestIdOrderByContactDateDesc(Long debtApprovalRequestId);

    /** Đếm số lần đã liên hệ đòi nợ */
    long countByDebtApprovalRequestId(Long debtApprovalRequestId);
}
