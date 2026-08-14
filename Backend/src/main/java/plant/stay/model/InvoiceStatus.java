package plant.stay.model;

public enum InvoiceStatus {
    PENDING,   // Chờ thanh toán
    PAID,      // Đã thanh toán (immutable)
    ADJUSTED   // Đã có hóa đơn điều chỉnh
}
