package plant.stay.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response cho bước preview dời lịch đặt phòng.
 * Trả về đủ thông tin để FE hiển thị bảng so sánh mà KHÔNG lưu thay đổi.
 */
@Data
@Builder
public class RescheduleDatePreviewResponse {

    /** Phòng hiện tại có còn trống trọn khoảng ngày mới không (false nếu chưa gán phòng) */
    boolean available;

    /** Danh sách đêm bị xung đột (định dạng yyyy-MM-dd), rỗng nếu không conflict */
    List<String> conflictDates;

    /** ID booking khác đang chiếm phòng trong khoảng ngày mới */
    Long conflictBookingId;

    /** Danh sách phòng cùng loại còn trống trọn khoảng ngày mới — gợi ý để lễ tân đổi phòng trước */
    List<RoomSuggestion> alternativeRooms;

    // ---- Giá ----

    /** Tiền phòng theo khoảng ngày cũ */
    BigDecimal oldPrice;

    /** Tiền phòng theo khoảng ngày mới (tính theo bảng giá mùa) */
    BigDecimal newPrice;

    /** Chênh lệch tiền phòng: newPrice - oldPrice (dương = tăng, âm = giảm) */
    BigDecimal priceDiff;

    /** Chi tiết giá từng đêm trong khoảng ngày mới */
    List<NightPriceDto> nightPrices;

    // ---- Cọc ----

    /** Tổng tiền cọc đã thu hiệu lực (đã trừ hoàn/phạt) */
    BigDecimal collectedDeposit;

    /** Mức cọc yêu cầu mới theo chính sách × newPrice */
    BigDecimal newRequiredDeposit;

    /** Chênh lệch cọc: newRequiredDeposit - collectedDeposit (dương = còn thiếu, âm = dư) */
    BigDecimal depositDiff;

    // ---- Inner DTOs ----

    @Data
    @Builder
    public static class RoomSuggestion {
        private Long roomId;
        private String roomNumber;
        private String roomTypeName;
        private String status;
    }

    @Data
    @Builder
    public static class NightPriceDto {
        private String date;       // yyyy-MM-dd
        private BigDecimal price;  // Giá đêm đó (theo mùa hoặc giá cơ bản)
    }
}
