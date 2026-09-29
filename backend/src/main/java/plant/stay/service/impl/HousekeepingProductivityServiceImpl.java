package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.HousekeepingProductivityResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.CleaningRecordStatus;
import plant.stay.model.Role;
import plant.stay.model.RoomCleaningRecord;
import plant.stay.model.RoomType;
import plant.stay.model.User;
import plant.stay.repository.RoomCleaningRecordRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.UserRepository;
import plant.stay.service.HousekeepingProductivityService;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HousekeepingProductivityServiceImpl implements HousekeepingProductivityService {

    private final RoomCleaningRecordRepository cleaningRecordRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final UserRepository userRepository;

    @Override
    public HousekeepingProductivityResponse getProductivityReport(
            String period,
            LocalDate startDate,
            LocalDate endDate,
            Long housekeeperId,
            User currentUser
    ) {
        // 1. Phân quyền chặt chẽ: Chỉ Chủ cơ sở (OWNER/ADMIN) hoặc Nhân viên buồng phòng (HOUSEKEEPER)
        if (currentUser == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để xem báo cáo năng suất buồng phòng");
        }

        Role role = currentUser.getRole();
        if (role != Role.OWNER && role != Role.ADMIN && role != Role.HOUSEKEEPER) {
            throw new UnauthorizedException("Chỉ Chủ cơ sở hoặc Nhân viên buồng phòng mới có quyền xem báo cáo năng suất này");
        }

        // Nếu là nhân viên buồng phòng: Chỉ được xem số liệu của chính mình
        Long targetHousekeeperId = housekeeperId;
        if (role == Role.HOUSEKEEPER) {
            targetHousekeeperId = currentUser.getId();
        }

        // 2. Xác định khoảng thời gian
        LocalDate today = LocalDate.now();
        LocalDate start = startDate;
        LocalDate end = endDate;

        String selectedPeriod = (period != null && !period.isBlank()) ? period.toUpperCase() : "WEEK";
        switch (selectedPeriod) {
            case "TODAY" -> {
                start = today;
                end = today;
            }
            case "WEEK" -> {
                start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                end = today;
            }
            case "MONTH" -> {
                start = today.with(TemporalAdjusters.firstDayOfMonth());
                end = today;
            }
            case "CUSTOM" -> {
                if (start == null) start = today.minusDays(7);
                if (end == null) end = today;
                if (start.isAfter(end)) {
                    LocalDate temp = start;
                    start = end;
                    end = temp;
                }
            }
            default -> {
                start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                end = today;
                selectedPeriod = "WEEK";
            }
        }

        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(LocalTime.MAX);

        // 3. Truy vấn dữ liệu bản ghi dọn dẹp
        List<RoomCleaningRecord> records;
        if (targetHousekeeperId != null) {
            records = cleaningRecordRepository.findRecordsByHousekeeperBetween(targetHousekeeperId, startDateTime, endDateTime);
        } else {
            records = cleaningRecordRepository.findRecordsBetween(startDateTime, endDateTime);
        }

        // 4. Tính toán Summary (Tổng hợp)
        int totalCleaned = 0;
        int checkoutCleaned = 0;
        int periodicCleaned = 0;
        int totalRejections = 0;
        int totalIncidents = 0;
        int totalInterrupted = 0;

        List<Integer> validDurations = new ArrayList<>();
        List<Integer> standardDurations = new ArrayList<>();

        for (RoomCleaningRecord r : records) {
            boolean isCompleted = r.getCompletedAt() != null ||
                    r.getStatus() == CleaningRecordStatus.APPROVED ||
                    r.getStatus() == CleaningRecordStatus.SUBMITTED;

            if (isCompleted) {
                totalCleaned++;
                if ("PERIODIC".equalsIgnoreCase(r.getCleaningType())) {
                    periodicCleaned++;
                } else {
                    checkoutCleaned++;
                }
            }

            if (r.getRejectionCount() != null && r.getRejectionCount() > 0) {
                totalRejections += r.getRejectionCount();
            }
            if (r.getIncidentCount() != null && r.getIncidentCount() > 0) {
                totalIncidents += r.getIncidentCount();
            }
            if (Boolean.TRUE.equals(r.getIsInterrupted())) {
                totalInterrupted++;
            }

            // Quy tắc quan trọng: Phòng có sự cố hoặc bị gián đoạn loại trừ khỏi tính thời gian trung bình
            boolean hasIncident = Boolean.TRUE.equals(r.getHasIncident()) || (r.getIncidentCount() != null && r.getIncidentCount() > 0);
            boolean isInterrupted = Boolean.TRUE.equals(r.getIsInterrupted());

            if (!hasIncident && !isInterrupted && r.getActualDurationMinutes() != null && r.getActualDurationMinutes() > 0) {
                validDurations.add(r.getActualDurationMinutes());
            }

            if (r.getStandardDurationMinutes() != null && r.getStandardDurationMinutes() > 0) {
                standardDurations.add(r.getStandardDurationMinutes());
            }
        }

        Double avgDuration = validDurations.isEmpty() ? null :
                Math.round(validDurations.stream().mapToInt(Integer::intValue).average().orElse(0) * 10.0) / 10.0;

        Double avgStandard = standardDurations.isEmpty() ? null :
                Math.round(standardDurations.stream().mapToInt(Integer::intValue).average().orElse(0) * 10.0) / 10.0;

        HousekeepingProductivityResponse.SummaryDTO summary = HousekeepingProductivityResponse.SummaryDTO.builder()
                .totalCleanedRooms(totalCleaned)
                .checkoutCleanedRooms(checkoutCleaned)
                .periodicCleanedRooms(periodicCleaned)
                .avgDurationMinutes(avgDuration)
                .standardAvgDurationMinutes(avgStandard)
                .totalRejections(totalRejections)
                .totalIncidents(totalIncidents)
                .totalInterruptedRooms(totalInterrupted)
                .build();

        // 5. Thống kê theo nhân viên (Staff Stats)
        Map<Long, List<RoomCleaningRecord>> recordsByStaff = records.stream()
                .filter(r -> r.getHousekeeper() != null)
                .collect(Collectors.groupingBy(r -> r.getHousekeeper().getId()));

        List<HousekeepingProductivityResponse.StaffProductivityDTO> staffStats = new ArrayList<>();
        for (Map.Entry<Long, List<RoomCleaningRecord>> entry : recordsByStaff.entrySet()) {
            List<RoomCleaningRecord> staffRecords = entry.getValue();
            User staff = staffRecords.get(0).getHousekeeper();

            int staffCleaned = 0;
            int staffCheckout = 0;
            int staffPeriodic = 0;
            int staffRejections = 0;
            int staffIncidents = 0;
            int staffInterrupted = 0;
            List<Integer> staffValidDurations = new ArrayList<>();
            List<Integer> staffStandardDurations = new ArrayList<>();

            for (RoomCleaningRecord r : staffRecords) {
                boolean isCompleted = r.getCompletedAt() != null ||
                        r.getStatus() == CleaningRecordStatus.APPROVED ||
                        r.getStatus() == CleaningRecordStatus.SUBMITTED;

                if (isCompleted) {
                    staffCleaned++;
                    if ("PERIODIC".equalsIgnoreCase(r.getCleaningType())) {
                        staffPeriodic++;
                    } else {
                        staffCheckout++;
                    }
                }

                if (r.getRejectionCount() != null) staffRejections += r.getRejectionCount();
                if (r.getIncidentCount() != null) staffIncidents += r.getIncidentCount();
                if (Boolean.TRUE.equals(r.getIsInterrupted())) staffInterrupted++;

                boolean hasIncident = Boolean.TRUE.equals(r.getHasIncident()) || (r.getIncidentCount() != null && r.getIncidentCount() > 0);
                boolean isInterrupted = Boolean.TRUE.equals(r.getIsInterrupted());

                if (!hasIncident && !isInterrupted && r.getActualDurationMinutes() != null && r.getActualDurationMinutes() > 0) {
                    staffValidDurations.add(r.getActualDurationMinutes());
                }
                if (r.getStandardDurationMinutes() != null && r.getStandardDurationMinutes() > 0) {
                    staffStandardDurations.add(r.getStandardDurationMinutes());
                }
            }

            Double staffAvg = staffValidDurations.isEmpty() ? null :
                    Math.round(staffValidDurations.stream().mapToInt(Integer::intValue).average().orElse(0) * 10.0) / 10.0;
            Double staffStdAvg = staffStandardDurations.isEmpty() ? null :
                    Math.round(staffStandardDurations.stream().mapToInt(Integer::intValue).average().orElse(0) * 10.0) / 10.0;

            staffStats.add(HousekeepingProductivityResponse.StaffProductivityDTO.builder()
                    .housekeeperId(staff.getId())
                    .housekeeperName(staff.getName())
                    .housekeeperAccount(staff.getAccount())
                    .phone(staff.getPhone())
                    .totalCleanedRooms(staffCleaned)
                    .checkoutRooms(staffCheckout)
                    .periodicRooms(staffPeriodic)
                    .avgDurationMinutes(staffAvg)
                    .standardAvgMinutes(staffStdAvg)
                    .rejectionCount(staffRejections)
                    .incidentCount(staffIncidents)
                    .interruptedCount(staffInterrupted)
                    .build());
        }

        // Sắp xếp theo số phòng đã dọn giảm dần
        staffStats.sort((a, b) -> Integer.compare(b.getTotalCleanedRooms(), a.getTotalCleanedRooms()));

        // 6. Thống kê theo Loại phòng (Room Type Stats)
        List<RoomType> allRoomTypes = roomTypeRepository.findAll();
        Map<Long, List<RoomCleaningRecord>> recordsByRoomType = records.stream()
                .filter(r -> r.getRoomType() != null)
                .collect(Collectors.groupingBy(r -> r.getRoomType().getId()));

        List<HousekeepingProductivityResponse.RoomTypeProductivityDTO> roomTypeStats = new ArrayList<>();
        for (RoomType rt : allRoomTypes) {
            List<RoomCleaningRecord> rtRecords = recordsByRoomType.getOrDefault(rt.getId(), Collections.emptyList());

            int rtTotalCleaned = 0;
            List<Integer> checkoutDurations = new ArrayList<>();
            List<Integer> periodicDurations = new ArrayList<>();

            for (RoomCleaningRecord r : rtRecords) {
                boolean isCompleted = r.getCompletedAt() != null ||
                        r.getStatus() == CleaningRecordStatus.APPROVED ||
                        r.getStatus() == CleaningRecordStatus.SUBMITTED;
                if (isCompleted) {
                    rtTotalCleaned++;
                }

                boolean hasIncident = Boolean.TRUE.equals(r.getHasIncident()) || (r.getIncidentCount() != null && r.getIncidentCount() > 0);
                boolean isInterrupted = Boolean.TRUE.equals(r.getIsInterrupted());

                if (!hasIncident && !isInterrupted && r.getActualDurationMinutes() != null && r.getActualDurationMinutes() > 0) {
                    if ("PERIODIC".equalsIgnoreCase(r.getCleaningType())) {
                        periodicDurations.add(r.getActualDurationMinutes());
                    } else {
                        checkoutDurations.add(r.getActualDurationMinutes());
                    }
                }
            }

            Double avgCheckout = checkoutDurations.isEmpty() ? null :
                    Math.round(checkoutDurations.stream().mapToInt(Integer::intValue).average().orElse(0) * 10.0) / 10.0;
            Double avgPeriodic = periodicDurations.isEmpty() ? null :
                    Math.round(periodicDurations.stream().mapToInt(Integer::intValue).average().orElse(0) * 10.0) / 10.0;

            roomTypeStats.add(HousekeepingProductivityResponse.RoomTypeProductivityDTO.builder()
                    .roomTypeId(rt.getId())
                    .roomTypeName(rt.getName())
                    .standardCheckoutMinutes(rt.getStandardCheckoutCleaningMinutes() != null ? rt.getStandardCheckoutCleaningMinutes() : 45)
                    .standardPeriodicMinutes(rt.getStandardPeriodicCleaningMinutes() != null ? rt.getStandardPeriodicCleaningMinutes() : 20)
                    .totalCleanedRooms(rtTotalCleaned)
                    .avgCheckoutMinutes(avgCheckout)
                    .avgPeriodicMinutes(avgPeriodic)
                    .build());
        }

        // 7. Danh sách chi tiết các lần dọn gần đây (Tối đa 50 bản ghi)
        List<HousekeepingProductivityResponse.CleaningRecordItemDTO> recentRecords = records.stream()
                .limit(50)
                .map(r -> HousekeepingProductivityResponse.CleaningRecordItemDTO.builder()
                        .id(r.getId())
                        .roomNumber(r.getRoom() != null ? r.getRoom().getRoomNumber() : "—")
                        .roomTypeName(r.getRoomType() != null ? r.getRoomType().getName() : "—")
                        .housekeeperId(r.getHousekeeper() != null ? r.getHousekeeper().getId() : null)
                        .housekeeperName(r.getHousekeeper() != null ? r.getHousekeeper().getName() : "Chưa gán")
                        .cleaningType(r.getCleaningType())
                        .startedAt(r.getStartedAt())
                        .completedAt(r.getCompletedAt())
                        .actualDurationMinutes(r.getActualDurationMinutes())
                        .standardDurationMinutes(r.getStandardDurationMinutes())
                        .status(r.getStatus() != null ? r.getStatus().name() : "—")
                        .isInterrupted(r.getIsInterrupted())
                        .interruptionReason(r.getInterruptionReason())
                        .hasIncident(r.getHasIncident())
                        .incidentCount(r.getIncidentCount())
                        .rejectionCount(r.getRejectionCount())
                        .rejectionNote(r.getRejectionNote())
                        .inspectedByName(r.getInspectedBy() != null ? r.getInspectedBy().getName() : null)
                        .build())
                .collect(Collectors.toList());

        return HousekeepingProductivityResponse.builder()
                .period(selectedPeriod)
                .startDate(start.toString())
                .endDate(end.toString())
                .summary(summary)
                .staffStats(staffStats)
                .roomTypeStats(roomTypeStats)
                .recentRecords(recentRecords)
                .build();
    }
}
