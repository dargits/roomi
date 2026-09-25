package plant.stay.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để lưu danh sách Google API Key dùng cho tính năng AI.
 * Mỗi key nằm trên một dòng (phân cách bằng ký tự xuống dòng '\n').
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleApiKeysRequest {
    /**
     * Chuỗi chứa các Google API Key, mỗi key trên một dòng.
     * Có thể null hoặc rỗng để xóa toàn bộ key.
     */
    private String googleApiKeys;
}
