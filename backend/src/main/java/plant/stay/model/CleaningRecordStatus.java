package plant.stay.model;

public enum CleaningRecordStatus {
    IN_PROGRESS,  // Đang dọn
    SUBMITTED,    // Đã dọn xong, chờ kiểm tra
    APPROVED,     // Đã kiểm tra & nghiệm thu sạch
    REJECTED      // Không đạt, yêu cầu dọn lại
}
