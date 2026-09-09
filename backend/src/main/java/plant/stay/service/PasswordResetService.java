package plant.stay.service;

import plant.stay.dto.request.ForceChangePasswordRequest;
import plant.stay.dto.request.ForgotPasswordRequest;
import plant.stay.dto.response.AccountCheckResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.PasswordResetItemResponse;
import plant.stay.model.User;

import java.util.List;

public interface PasswordResetService {
    AccountCheckResponse checkAccount(String account);
    MessageResponse requestPasswordReset(ForgotPasswordRequest req);
    List<PasswordResetItemResponse> getAllRequests();
    long getPendingCount();
    PasswordResetItemResponse issueTempPassword(Long requestId, User adminActor);
    PasswordResetItemResponse rejectRequest(Long requestId, User adminActor);
    MessageResponse forceChangePassword(ForceChangePasswordRequest req);
}
