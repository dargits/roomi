package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HousekeepingProductivityReportResponse {
    private String period; // DAY, WEEK, MONTH, CUSTOM
    private LocalDate startDate;
    private LocalDate endDate;

    // Tổng quan toàn cơ sở
    private Integer totalRoomsCleaned;
    private Double facilityAverageDurationMinutes;
    private Double facilityStandardDurationAverage;
    private Integer totalInterruptedOrIncidentRooms;
    private Integer totalRejectedInspections;
    private Integer totalIncidentsReported;

    // Phân quyền hiển thị: true nếu là nhân viên chỉ xem số liệu của chính mình
    private Boolean isSingleStaffView;

    // Thống kê theo từng nhân viên
    private List<HousekeeperProductivityStat> housekeeperStats;

    // Danh sách chi tiết các phiên dọn
    private List<CleaningRecordDetailResponse> records;

    // Định mức thời gian hiện tại của các loại phòng
    private List<CleaningStandardResponse> standards;
}
