package plant.stay.model;

/**
 * Loại giảm giá áp dụng cho hóa đơn.
 */
public enum DiscountType {
    PERCENTAGE,     // Giảm theo % trên tổng tiền (roomAmount + serviceAmount)
    FIXED_AMOUNT    // Giảm theo số tiền cố định
}
