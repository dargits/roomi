package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceEmailData {

    // Thông tin khách sạn
    private String hotelName;
    private String hotelAddress;
    private String hotelPhone;
    private String hotelEmail;

    // Thông tin khách hàng
    private String customerName;
    private String customerPhone;
    private String customerEmail;

    // Thông tin đặt phòng & lưu trú
    private Long bookingId;
    private String roomName;
    private String roomTypeName;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private long numberOfNights;

    // Chi tiết hóa đơn
    private Long invoiceId;
    private String invoiceNumber;
    private String invoiceStatus;
    private LocalDateTime invoiceCreatedAt;
    private String createdByName;

    // Các khoản mục thanh toán
    private BigDecimal roomAmount;
    private BigDecimal serviceAmount;
    private BigDecimal discountAmount;
    private BigDecimal depositAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private String paymentMethods; // vd: Tiền mặt, Chuyển khoản

    // Danh sách phụ thu dịch vụ (nếu có)
    private List<ServiceItem> services;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ServiceItem {
        private String serviceName;
        private int quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalAmount;
    }
}
