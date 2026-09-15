package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InHouseGuestResponse {
    private Long bookingId;
    private Long roomId;
    private String roomNumber;
    private String floor;
    private Long roomTypeId;
    private String roomTypeName;

    // Khách đứng tên & SĐT (Lưu ý: KHÔNG hiển thị CCCD/hộ chiếu theo yêu cầu bảo mật)
    private Long primaryGuestId;
    private String primaryGuestName;
    private String guestPhone;

    // Số người thực tế trong phòng & Sức chứa
    private Integer occupantCount;
    private Integer standardCapacity;
    private Integer maxCapacity;

    // Thời gian lưu trú
    private LocalDate checkInDate;
    private LocalDateTime checkedInAt;
    private LocalDate expectedCheckOutDate;
    private boolean checkingOutToday;

    // Tài chính & Công nợ
    private BigDecimal roomAmount;
    private BigDecimal serviceAmount;
    private BigDecimal incurredAmount; // Tổng phát sinh = tiền phòng + tiền dịch vụ
    private BigDecimal paidAmount;     // Đã thanh toán hoặc đặt cọc có hiệu lực
    private BigDecimal remainingAmount; // Còn nợ = incurredAmount - paidAmount (tối thiểu 0)
    private boolean hasDebt;           // true nếu remainingAmount > 0
    private String paymentStatus;      // PAID, PARTIALLY_PAID, UNPAID

    // Yêu cầu đặc biệt chưa xử lý / ghi chú
    private String specialRequests;
}
