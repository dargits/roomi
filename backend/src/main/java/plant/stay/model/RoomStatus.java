package plant.stay.model;

public enum RoomStatus {
    AVAILABLE,    // Phòng sẵn sàng
    OCCUPIED,     // Khách đang ở
    DIRTY,        // Cần dọn dẹp
    INSPECTING,   // Đã dọn xong, chờ kiểm tra & duyệt sạch
    MAINTENANCE   // Đang bảo trì
}
