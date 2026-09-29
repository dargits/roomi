package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HousekeepingProductivityResponse {

    private String period; // TODAY, WEEK, MONTH, CUSTOM
    private String startDate;
    private String endDate;

    private SummaryDTO summary;
    private List<StaffProductivityDTO> staffStats;
    private List<RoomTypeProductivityDTO> roomTypeStats;
    private List<CleaningRecordItemDTO> recentRecords;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryDTO {
        private int totalCleanedRooms;
        private int checkoutCleanedRooms;
        private int periodicCleanedRooms;
        private Double avgDurationMinutes;
        private Double standardAvgDurationMinutes;
        private int totalRejections;
        private int totalIncidents;
        private int totalInterruptedRooms;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffProductivityDTO {
        private Long housekeeperId;
        private String housekeeperName;
        private String housekeeperAccount;
        private String phone;
        private int totalCleanedRooms;
        private int checkoutRooms;
        private int periodicRooms;
        private Double avgDurationMinutes;
        private Double standardAvgMinutes;
        private int rejectionCount;
        private int incidentCount;
        private int interruptedCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomTypeProductivityDTO {
        private Long roomTypeId;
        private String roomTypeName;
        private Integer standardCheckoutMinutes;
        private Integer standardPeriodicMinutes;
        private int totalCleanedRooms;
        private Double avgCheckoutMinutes;
        private Double avgPeriodicMinutes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CleaningRecordItemDTO {
        private Long id;
        private String roomNumber;
        private String roomTypeName;
        private Long housekeeperId;
        private String housekeeperName;
        private String cleaningType; // CHECKOUT, PERIODIC, MANUAL
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private Integer actualDurationMinutes;
        private Integer standardDurationMinutes;
        private String status; // IN_PROGRESS, SUBMITTED, APPROVED, REJECTED
        private Boolean isInterrupted;
        private String interruptionReason;
        private Boolean hasIncident;
        private Integer incidentCount;
        private Integer rejectionCount;
        private String rejectionNote;
        private String inspectedByName;
    }
}
