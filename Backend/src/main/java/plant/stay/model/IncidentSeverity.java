package plant.stay.model;

public enum IncidentSeverity {
    LIGHT,          // Nhẹ (phòng vẫn sẵn sàng nhưng gắn cờ cảnh báo chờ xử lý)
    HEAVY,          // Nặng (chuyển sang chờ bảo trì/MAINTENANCE, cảnh báo booking ảnh hưởng)
    OUT_OF_SERVICE  // Không thể phục vụ (khóa phòng bảo trì lập tức)
}
