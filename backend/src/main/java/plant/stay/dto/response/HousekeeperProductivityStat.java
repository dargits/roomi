package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HousekeeperProductivityStat {
    private Long housekeeperId;
    private String housekeeperName;
    private String housekeeperPhone;

    // Tổng số phòng đã dọn xong
    private Integer totalRoomsCleaned;

    // Số phòng hoàn thành bình thường (không bị gián đoạn hay sự cố)
    private Integer completedNormalRoomsCount;

    // Số phòng có báo sự cố hoặc bị gián đoạn (được đánh dấu để không làm sai lệch thời gian TB)
    private Integer interruptedOrIncidentRoomsCount;

    // Thời gian dọn thực tế trung bình (phút) - chỉ tính trên các phòng bình thường
    private Double averageDurationMinutes;

    // Thời gian định mức trung bình (phút) của các phòng nhân viên này đã dọn
    private Double targetStandardMinutesAverage;

    // Số lần bị trả lại do kiểm tra không đạt
    private Integer rejectedInspectionCount;

    // Số sự cố kỹ thuật/hư hỏng đã báo
    private Integer incidentReportedCount;

    // Phân loại số phòng
    private Integer checkoutRoomsCleaned;
    private Integer periodicRoomsCleaned;
}
