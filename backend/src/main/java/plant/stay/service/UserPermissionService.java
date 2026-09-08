package plant.stay.service;

import plant.stay.dto.request.GrantExtraPermissionRequest;
import plant.stay.dto.request.RevokeExtraPermissionRequest;
import plant.stay.dto.response.UserExtraPermissionDto;
import plant.stay.dto.response.UserPermissionOverviewResponse;
import plant.stay.model.User;

import java.util.List;

public interface UserPermissionService {
    UserPermissionOverviewResponse getUserPermissions(Long userId);
    UserExtraPermissionDto grantPermission(Long userId, GrantExtraPermissionRequest req, User adminActor);
    void revokePermission(Long userId, Long permissionId, RevokeExtraPermissionRequest req, User adminActor);
    void revokeAllOnRoleChange(Long userId, User adminActor);
    boolean hasPermission(Long userId, String permission);
}
