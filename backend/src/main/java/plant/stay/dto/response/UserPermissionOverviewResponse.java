package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import plant.stay.model.Role;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPermissionOverviewResponse {
    private Long userId;
    private String userName;
    private String account;
    private Role role;
    private List<String> roleDefaultPermissions; // Quyền mặc định đến từ Vai trò
    private List<UserExtraPermissionDto> extraPermissions; // Quyền xem bổ sung riêng
    private List<String> availableExtraPermissions; // Các quyền xem được phép cấp thêm
}
