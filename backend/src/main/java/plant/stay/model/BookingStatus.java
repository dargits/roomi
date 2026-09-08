package plant.stay.model;

public enum BookingStatus {
    NEW,          // Mới tạo, chưa xác nhận
    CONFIRMED,    // Đã xác nhận
    CHECKED_IN,   // Đã nhận phòng
    CHECKED_OUT,  // Đã trả phòng
    CANCELLED,    // Đã hủy
    NO_SHOW       // Khách không đến
}
