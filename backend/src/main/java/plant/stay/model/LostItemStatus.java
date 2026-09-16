package plant.stay.model;

public enum LostItemStatus {
    HOLDING,     // Đang lưu giữ tại cơ sở (kho / tủ Lost & Found)
    CONTACTED,   // Đã liên hệ với khách hàng
    RETURNED,    // Đã trả lại cho khách
    DISPOSED     // Đã xử lý theo chính sách (quá thời hạn lưu giữ)
}
