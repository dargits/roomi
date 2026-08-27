package plant.stay.model;

public enum InvoiceStatus {
    DRAFT,                       // Nháp – hóa đơn mới tạo, chưa chốt
    PENDING_PAYMENT,             // Chờ thanh toán (alias PENDING cũ)
    PENDING_DISCOUNT_APPROVAL,   // Đang chờ Chủ cơ sở phê duyệt giảm giá – khóa thanh toán & check-out
    PAID,                        // Đã thanh toán (immutable, QTN-11)
    ADJUSTED,                    // Đã có hóa đơn điều chỉnh
    /**
     * @deprecated Dùng PENDING_PAYMENT thay thế. Giữ lại để tương thích ngược.
     */
    @Deprecated
    PENDING                      // Chờ thanh toán (legacy)
}
