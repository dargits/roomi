package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Bản xác nhận đặt phòng (Booking Confirmation Document).
 * Chứa đầy đủ thông tin về cơ sở, khách, phòng, chi tiết giá từng đêm, tiền cọc và chính sách hủy.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingConfirmationData {
    private Long bookingId;
    private String bookingCode; // Ví dụ: #BKG-101 hoặc #101
    private String status;

    // Thông tin khách hàng & cảnh báo liên hệ
    private Long guestId;
    private String guestName;
    private String guestPhone;
    private String guestEmail;
    private boolean hasGuestPhone;
    private boolean hasGuestEmail;
    private boolean hasContactInfo;
    private String contactWarning; // Cảnh báo hiển thị cho Lễ tân nếu thiếu email/SĐT

    // Thời gian lưu trú
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private LocalTime standardCheckInTime;  // Ví dụ: 14:00
    private LocalTime standardCheckOutTime; // Ví dụ: 12:00
    private long totalNights;

    // Thông tin phòng
    private Long roomTypeId;
    private String roomTypeName;
    private Long roomId;
    private String roomNumber; // null nếu chưa gán phòng cụ thể
    private Integer standardCapacity;
    private Integer maxCapacity;
    private Integer guestCount;

    // Chi tiết giá từng đêm
    @Builder.Default
    private List<NightlyPriceDetailDto> nightlyDetails = new ArrayList<>();
    private BigDecimal totalRoomPrice;
    private BigDecimal extraPersonCharge;
    private BigDecimal grandTotalPrice; // Tổng tiền dự kiến

    // Tiền cọc quy định
    private BigDecimal depositPercent; // Tỷ lệ % cọc theo chính sách
    private BigDecimal requiredDepositAmount; // Số tiền cọc phải nộp
    private BigDecimal collectedDepositAmount; // Số tiền cọc đã thu (nếu có)
    private String depositStatus;

    // Tóm tắt chính sách hủy áp dụng
    private Integer freeCancelHours; // Số giờ trước check-in được hủy miễn phí
    private BigDecimal penaltyPercent; // % phạt nếu hủy muộn
    private String cancellationPolicySummary; // Câu tóm tắt dễ hiểu cho khách

    // Thông tin cơ sở lưu trú
    private String propertyName;
    private String hotelAddress;
    private String hotelPhone;
    private String hotelEmail;

    // Trạng thái cấu hình email & kênh gửi
    private boolean emailConfigured; // true nếu hệ thống đã cấu hình API Key gửi thư
    private String formattedMessage; // Nội dung văn bản định dạng chuẩn sẵn sàng gửi Zalo/SMS/Messenger

    // Lịch sử gửi xác nhận
    @Builder.Default
    private List<BookingConfirmationLogResponse> confirmationLogs = new ArrayList<>();
}
