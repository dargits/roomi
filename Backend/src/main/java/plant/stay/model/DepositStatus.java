package plant.stay.model;

/**
 * Trạng thái khoản đặt cọc — NCL-11 (QTN-18, QTN-19, QTN-20)
 */
public enum DepositStatus {
    PENDING,        // Chờ thu
    COLLECTED,      // Đã thu
    SHORT_PAID,     // Thu thiếu so với chính sách (có lý do)
    REFUNDED,       // Đã hoàn toàn bộ
    PARTIALLY_REFUNDED, // Hoàn một phần (phần còn lại là phí hủy)
    FORFEITED       // Tịch thu (no-show hoặc vi phạm)
}
