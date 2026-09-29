package plant.stay.model;

/**
 * Trạng thái hóa đơn thanh toán trong hệ thống Stay Away.
 */
public enum InvoiceStatus {
    DRAFT,                       // Nháp – hóa đơn mới tạo, chưa chốt
    PENDING_PAYMENT,             // Chờ thanh toán
    PENDING_DISCOUNT_APPROVAL,   // Đang chờ Chủ cơ sở phê duyệt giảm giá – khóa thanh toán & check-out
    PAID,                        // Đã thanh toán (immutable, QTN-11)
    ADJUSTED,                    // Đã có hóa đơn điều chỉnh
    CANCELLED,                   // Đã bị hủy (kèm lý do hủy)
    PENDING;                     // Chờ thanh toán (hỗ trợ đồng thời dữ liệu cũ & mới)

    /**
     * Kiểm tra hóa đơn có đang ở trạng thái chờ thanh toán hay không.
     */
    public boolean isPendingPayment() {
        return this == PENDING || this == PENDING_PAYMENT;
    }

    /**
     * Kiểm tra hóa đơn chưa hoàn tất thanh toán (nháp, chờ duyệt hoặc chờ thanh toán).
     */
    public boolean isUnsettled() {
        return this == DRAFT || this == PENDING || this == PENDING_PAYMENT || this == PENDING_DISCOUNT_APPROVAL;
    }
}
