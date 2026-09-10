package plant.stay.service;

import plant.stay.dto.request.DebtApprovalCreateRequest;
import plant.stay.dto.request.DebtApprovalRejectRequest;
import plant.stay.dto.response.DebtItemResponse;
import plant.stay.model.User;

import java.util.List;

public interface DebtApprovalService {
    DebtItemResponse requestDebtCheckout(DebtApprovalCreateRequest req, User actor);
    DebtItemResponse approveDebtCheckout(Long requestId, User actor);
    DebtItemResponse rejectDebtCheckout(Long requestId, DebtApprovalRejectRequest req, User actor);
    List<DebtItemResponse> getActiveDebts();
    List<DebtItemResponse> getPendingRequests();
    List<DebtItemResponse> getAllRequests();
    void sendDueTomorrowReminders();
}
