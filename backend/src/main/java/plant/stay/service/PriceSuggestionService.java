package plant.stay.service;

import plant.stay.dto.request.PriceSuggestionConfigRequest;
import plant.stay.dto.response.PriceSuggestionConfigResponse;
import plant.stay.dto.response.PriceSuggestionResponse;
import plant.stay.model.User;

import java.time.LocalDate;

public interface PriceSuggestionService {

    /**
     * Rà soát các ngày trong 30 ngày tới và đưa ra danh sách gợi ý điều chỉnh giá.
     *
     * @param days Số ngày rà soát tới (mặc định 30)
     * @param includeDismissed Có bao gồm các gợi ý đã bị bỏ qua hay không
     * @param actor Người thực hiện (Chủ cơ sở hoặc Quản trị viên)
     * @return PriceSuggestionResponse
     */
    PriceSuggestionResponse getPriceSuggestions(int days, boolean includeDismissed, User actor);

    /**
     * Lấy cấu hình ngưỡng lấp đầy hiện tại và trạng thái dữ liệu lịch sử.
     */
    PriceSuggestionConfigResponse getSuggestionConfig(User actor);

    /**
     * Cập nhật ngưỡng lấp đầy do Chủ cơ sở thiết lập.
     */
    PriceSuggestionConfigResponse updateSuggestionConfig(PriceSuggestionConfigRequest request, User actor);

    /**
     * Chủ cơ sở bỏ qua một gợi ý cho ngày chỉ định (không hiện lại nữa).
     */
    void dismissSuggestion(LocalDate targetDate, User actor);

    /**
     * Khôi phục gợi ý đã bị bỏ qua.
     */
    void restoreSuggestion(LocalDate targetDate, User actor);
}
