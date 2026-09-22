package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.CleaningStandardUpdateRequest;
import plant.stay.dto.response.CleaningRecordDetailResponse;
import plant.stay.dto.response.CleaningStandardResponse;
import plant.stay.dto.response.HousekeeperProductivityStat;
import plant.stay.dto.response.HousekeepingProductivityReportResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.*;
import plant.stay.repository.RoomCleaningRecordRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.UserRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.HousekeepingProductivityService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HousekeepingProductivityServiceImpl implements HousekeepingProductivityService {

    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomCleaningRecordRepository roomCleaningRecordRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public List<CleaningStandardResponse> getCleaningStandards() {
        List<RoomType> roomTypes = roomTypeRepository.findAll();
        return roomTypes.stream().map(rt -> {
            int roomCount = roomRepository.findByRoomTypeId(rt.getId()).size();
            return CleaningStandardResponse.builder()
                    .roomTypeId(rt.getId())
                    .roomTypeName(rt.getName())
                    .standardCheckoutCleaningMinutes(rt.getStandardCheckoutCleaningMinutes() != null ? rt.getStandardCheckoutCleaningMinutes() : 45)
                    .standardPeriodicCleaningMinutes(rt.getStandardPeriodicCleaningMinutes() != null ? rt.getStandardPeriodicCleaningMinutes() : 20)
                    .totalRooms(roomCount)
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<CleaningStandardResponse> updateCleaningStandards(CleaningStandardUpdateRequest request, User actor) {
        if (actor.getRole() != Role.OWNER && actor.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Chỉ Chủ cơ sở hoặc Quản trị viên mới có quyền cập nhật định mức thời gian dọn!");
        }

        if (request.getStandards() == null || request.getStandards().isEmpty()) {
            throw new IllegalArgumentException("Danh sách định mức không được để trống");
        }

        for (CleaningStandardUpdateRequest.StandardItem item : request.getStandards()) {
            RoomType rt = roomTypeRepository.findById(item.getRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng #" + item.getRoomTypeId()));
            rt.setStandardCheckoutCleaningMinutes(item.getStandardCheckoutCleaningMinutes());
            rt.setStandardPeriodicCleaningMinutes(item.getStandardPeriodicCleaningMinutes());
            roomTypeRepository.save(rt);

            auditLogService.log("RoomType", rt.getId(), "UPDATE_CLEANING_STANDARD", actor,
                    "Cập nhật định mức dọn cho " + rt.getName() + ": Trả phòng="
                            + item.getStandardCheckoutCleaningMinutes() + "p, Định kỳ="
                            + item.getStandardPeriodicCleaningMinutes() + "p");
        }

        return getCleaningStandards();
    }

    @Override
    @Transactional(readOnly = true)
    public HousekeepingProductivityReportResponse getProductivityReport(
            String period,
            LocalDate date,
            LocalDate startDate,
            LocalDate endDate,
            User actor
    ) {
        // Kiểm tra quyền truy cập
        boolean isOwnerOrAdmin = actor.getRole() == Role.OWNER || actor.getRole() == Role.ADMIN;
        boolean isHousekeeper = actor.getRole() == Role.HOUSEKEEPER;
        boolean isReceptionist = actor.getRole() == Role.RECEPTIONIST;

        if (!isOwnerOrAdmin && !isHousekeeper && !isReceptionist) {
            throw new UnauthorizedException("Bạn không có quyền xem báo cáo năng suất buồng phòng.");
        }

        // Tính toán khoảng thời gian
        String resolvedPeriod = (period != null && !period.isBlank()) ? period.toUpperCase() : "DAY";
        LocalDate start;
        LocalDate end;
        LocalDate refDate = (date != null) ? date : LocalDate.now();

        switch (resolvedPeriod) {
            case "WEEK" -> {
                start = refDate.with(DayOfWeek.MONDAY);
                end = refDate.with(DayOfWeek.SUNDAY);
            }
            case "MONTH" -> {
                start = refDate.withDayOfMonth(1);
                end = refDate.withDayOfMonth(refDate.lengthOfMonth());
            }
            case "CUSTOM" -> {
                start = (startDate != null) ? startDate : LocalDate.now().minusDays(7);
                end = (endDate != null) ? endDate : LocalDate.now();
                if (end.isBefore(start)) {
                    LocalDate tmp = start;
                    start = end;
                    end = tmp;
                }
            }
            default -> { // DAY
                resolvedPeriod = "DAY";
                start = refDate;
                end = refDate;
            }
        }

        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(LocalTime.MAX);

        // Truy vấn danh sách các lượt dọn dẹp
        List<RoomCleaningRecord> records;
        boolean isSingleStaffView = isHousekeeper && !isOwnerOrAdmin;

        if (isSingleStaffView) {
            records = roomCleaningRecordRepository.findCompletedByHousekeeperBetween(actor.getId(), startDateTime, endDateTime);
        } else {
            records = roomCleaningRecordRepository.findCompletedBetween(startDateTime, endDateTime);
        }

        // Lấy danh sách nhân viên buồng phòng để thống kê
        List<User> targetHousekeepers;
        if (isSingleStaffView) {
            targetHousekeepers = List.of(actor);
        } else {
            targetHousekeepers = userRepository.findByRole(Role.HOUSEKEEPER);
            // Bổ sung nhân viên khác nếu có ghi nhận dọn dẹp nhưng đổi vai trò
            Set<Long> hkIds = targetHousekeepers.stream().map(User::getId).collect(Collectors.toSet());
            for (RoomCleaningRecord r : records) {
                if (r.getHousekeeper() != null && !hkIds.contains(r.getHousekeeper().getId())) {
                    targetHousekeepers.add(r.getHousekeeper());
                    hkIds.add(r.getHousekeeper().getId());
                }
            }
        }

        // Map chi tiết danh sách records
        List<CleaningRecordDetailResponse> recordDetails = records.stream().map(r -> {
            boolean isExcluded = Boolean.TRUE.equals(r.getIsInterrupted()) || Boolean.TRUE.equals(r.getHasIncident());
            return CleaningRecordDetailResponse.builder()
                    .id(r.getId())
                    .roomId(r.getRoom() != null ? r.getRoom().getId() : null)
                    .roomNumber(r.getRoom() != null ? r.getRoom().getRoomNumber() : null)
                    .roomTypeId(r.getRoomType() != null ? r.getRoomType().getId() : null)
                    .roomTypeName(r.getRoomType() != null ? r.getRoomType().getName() : null)
                    .housekeeperId(r.getHousekeeper() != null ? r.getHousekeeper().getId() : null)
                    .housekeeperName(r.getHousekeeper() != null ? r.getHousekeeper().getName() : "Chưa xác định")
                    .cleaningType(r.getCleaningType())
                    .startedAt(r.getStartedAt())
                    .completedAt(r.getCompletedAt())
                    .actualDurationMinutes(r.getActualDurationMinutes())
                    .standardDurationMinutes(r.getStandardDurationMinutes())
                    .status(r.getStatus())
                    .isInterrupted(Boolean.TRUE.equals(r.getIsInterrupted()))
                    .interruptionReason(r.getInterruptionReason())
                    .hasIncident(Boolean.TRUE.equals(r.getHasIncident()))
                    .incidentCount(r.getIncidentCount() != null ? r.getIncidentCount() : 0)
                    .rejectionCount(r.getRejectionCount() != null ? r.getRejectionCount() : 0)
                    .rejectionNote(r.getRejectionNote())
                    .inspectedByName(r.getInspectedBy() != null ? r.getInspectedBy().getName() : null)
                    .inspectedAt(r.getInspectedAt())
                    .isExcludedFromAverage(isExcluded)
                    .build();
        }).collect(Collectors.toList());

        // Tính toán thống kê theo từng nhân viên
        List<HousekeeperProductivityStat> housekeeperStats = new ArrayList<>();
        List<RoomCleaningRecord> allNormalRecords = new ArrayList<>();

        int totalRejected = 0;
        int totalIncidents = 0;
        int totalInterruptedOrIncident = 0;

        for (User hk : targetHousekeepers) {
            List<RoomCleaningRecord> hkRecords = records.stream()
                    .filter(r -> r.getHousekeeper() != null && r.getHousekeeper().getId().equals(hk.getId()))
                    .toList();

            int totalCleaned = hkRecords.size();
            int checkoutCount = (int) hkRecords.stream().filter(r -> "CHECKOUT".equalsIgnoreCase(r.getCleaningType())).count();
            int periodicCount = (int) hkRecords.stream().filter(r -> "PERIODIC".equalsIgnoreCase(r.getCleaningType())).count();

            // Lọc ra các phòng bình thường (không bị gián đoạn, không có sự cố, có thời gian thực tế > 0)
            List<RoomCleaningRecord> normalRecords = hkRecords.stream()
                    .filter(r -> !Boolean.TRUE.equals(r.getIsInterrupted()) && !Boolean.TRUE.equals(r.getHasIncident()))
                    .filter(r -> r.getActualDurationMinutes() != null && r.getActualDurationMinutes() > 0)
                    .toList();

            allNormalRecords.addAll(normalRecords);

            int interruptedOrIncidentCount = totalCleaned - normalRecords.size();
            totalInterruptedOrIncident += interruptedOrIncidentCount;

            double avgDuration = 0.0;
            if (!normalRecords.isEmpty()) {
                double rawAvg = normalRecords.stream().mapToInt(RoomCleaningRecord::getActualDurationMinutes).average().orElse(0.0);
                avgDuration = round(rawAvg, 1);
            }

            double avgStandard = 0.0;
            if (!normalRecords.isEmpty()) {
                double rawStd = normalRecords.stream().mapToInt(r -> r.getStandardDurationMinutes() != null ? r.getStandardDurationMinutes() : 45).average().orElse(0.0);
                avgStandard = round(rawStd, 1);
            }

            int hkRejectedCount = hkRecords.stream().mapToInt(r -> r.getRejectionCount() != null ? r.getRejectionCount() : 0).sum();
            int hkIncidentCount = hkRecords.stream().mapToInt(r -> r.getIncidentCount() != null ? r.getIncidentCount() : 0).sum();

            totalRejected += hkRejectedCount;
            totalIncidents += hkIncidentCount;

            // Nếu là chế độ xem tất cả, chỉ hiển thị nhân viên nếu họ có dọn phòng hoặc còn đang hoạt động
            if (isSingleStaffView || totalCleaned > 0 || hk.isActive()) {
                housekeeperStats.add(HousekeeperProductivityStat.builder()
                        .housekeeperId(hk.getId())
                        .housekeeperName(hk.getName())
                        .housekeeperPhone(hk.getPhone())
                        .totalRoomsCleaned(totalCleaned)
                        .completedNormalRoomsCount(normalRecords.size())
                        .interruptedOrIncidentRoomsCount(interruptedOrIncidentCount)
                        .averageDurationMinutes(avgDuration)
                        .targetStandardMinutesAverage(avgStandard)
                        .rejectedInspectionCount(hkRejectedCount)
                        .incidentReportedCount(hkIncidentCount)
                        .checkoutRoomsCleaned(checkoutCount)
                        .periodicRoomsCleaned(periodicCount)
                        .build());
            }
        }

        // Sắp xếp danh sách nhân viên theo số phòng đã dọn giảm dần
        housekeeperStats.sort((a, b) -> Integer.compare(b.getTotalRoomsCleaned(), a.getTotalRoomsCleaned()));

        // Tính chỉ số trung bình toàn cơ sở (chỉ tính trên các phòng bình thường không bị gián đoạn/sự cố)
        double facilityAverageDuration = 0.0;
        double facilityStandardAverage = 0.0;
        if (!allNormalRecords.isEmpty()) {
            facilityAverageDuration = round(allNormalRecords.stream().mapToInt(RoomCleaningRecord::getActualDurationMinutes).average().orElse(0.0), 1);
            facilityStandardAverage = round(allNormalRecords.stream().mapToInt(r -> r.getStandardDurationMinutes() != null ? r.getStandardDurationMinutes() : 45).average().orElse(0.0), 1);
        }

        return HousekeepingProductivityReportResponse.builder()
                .period(resolvedPeriod)
                .startDate(start)
                .endDate(end)
                .totalRoomsCleaned(records.size())
                .facilityAverageDurationMinutes(facilityAverageDuration)
                .facilityStandardDurationAverage(facilityStandardAverage)
                .totalInterruptedOrIncidentRooms(totalInterruptedOrIncident)
                .totalRejectedInspections(totalRejected)
                .totalIncidentsReported(totalIncidents)
                .isSingleStaffView(isSingleStaffView)
                .housekeeperStats(housekeeperStats)
                .records(recordDetails)
                .standards(getCleaningStandards())
                .build();
    }

    private double round(double value, int places) {
        if (places < 0) throw new IllegalArgumentException();
        BigDecimal bd = BigDecimal.valueOf(value);
        bd = bd.setScale(places, RoundingMode.HALF_UP);
        return bd.doubleValue();
    }
}
