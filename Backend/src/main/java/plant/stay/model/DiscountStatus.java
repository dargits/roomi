package plant.stay.model;

/**
 * Trạng thái của khoản giảm giá trên hóa đơn.
 */
public enum DiscountStatus {
    PENDING_APPROVAL, // Chờ Chủ cơ sở phê duyệt (discountValue >= threshold)
    APPLIED,          // Đã được áp dụng / tự động duyệt (discountValue < threshold)
    REJECTED          // Bị từ chối bởi Chủ cơ sở
}
