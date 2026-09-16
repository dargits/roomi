package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import plant.stay.model.LostItemStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LostItemResponse {

    private Long id;

    // Thông tin phòng
    private Long roomId;
    private String roomNumber;
    private String roomTypeName;

    // Thông tin liên kết lượt lưu trú / Khách hàng
    private Long bookingId;
    private Long guestId;
    private String guestName;
    private String guestPhone;
    private String guestEmail;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private LocalDateTime checkedOutAt;

    // Thông tin món đồ
    private String itemName;
    private String foundLocation;
    private LocalDate foundDate;
    private LocalTime foundTime;
    private String storageLocation;
    private String imageUrl;
    private LostItemStatus status;
    private LocalDate retentionExpiryDate;
    private Boolean isExpired; // retentionExpiryDate < today && status == HOLDING

    // Thông tin trả đồ
    private String receiverName;
    private String receiverPhone;
    private String receiverNote;
    private LocalDateTime returnedAt;
    private Long returnedById;
    private String returnedByName;

    // Thông tin xử lý quá hạn
    private String disposalMethod;
    private String disposalNote;
    private LocalDateTime disposedAt;
    private Long disposedById;
    private String disposedByName;

    // Người tạo & Thời gian
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
