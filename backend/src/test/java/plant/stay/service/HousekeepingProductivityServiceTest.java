package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.CleaningStandardUpdateRequest;
import plant.stay.dto.response.CleaningStandardResponse;
import plant.stay.dto.response.HousekeepingProductivityReportResponse;
import plant.stay.model.*;
import plant.stay.repository.RoomCleaningRecordRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class HousekeepingProductivityServiceTest {

    @Autowired
    private HousekeepingProductivityService productivityService;

    @Autowired
    private RoomCleaningRecordRepository cleaningRecordRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private UserRepository userRepository;

    private User owner;
    private User housekeeperA;
    private User housekeeperB;
    private RoomType roomTypeDeluxe;
    private Room room101;
    private Room room102;
    private Room room103;

    @BeforeEach
    void setUp() {
        cleaningRecordRepository.deleteAll();

        owner = userRepository.save(User.builder()
                .account("owner_test_" + System.currentTimeMillis())
                .name("Chủ Cơ Sở")
                .password("123456")
                .role(Role.OWNER)
                .active(true)
                .build());

        housekeeperA = userRepository.save(User.builder()
                .account("hk_a_" + System.currentTimeMillis())
                .name("Nguyễn Thị Lan")
                .phone("0901112233")
                .password("123456")
                .role(Role.HOUSEKEEPER)
                .active(true)
                .build());

        housekeeperB = userRepository.save(User.builder()
                .account("hk_b_" + System.currentTimeMillis())
                .name("Trần Văn Nam")
                .phone("0904445566")
                .password("123456")
                .role(Role.HOUSEKEEPER)
                .active(true)
                .build());

        roomTypeDeluxe = roomTypeRepository.save(RoomType.builder()
                .name("Phòng Deluxe Test " + System.currentTimeMillis())
                .basePrice(BigDecimal.valueOf(1000000))
                .standardCapacity(2)
                .maxCapacity(4)
                .standardCheckoutCleaningMinutes(40)
                .standardPeriodicCleaningMinutes(20)
                .active(true)
                .build());

        room101 = roomRepository.save(Room.builder()
                .roomNumber("P101_" + System.currentTimeMillis())
                .roomType(roomTypeDeluxe)
                .status(RoomStatus.AVAILABLE)
                .build());

        room102 = roomRepository.save(Room.builder()
                .roomNumber("P102_" + System.currentTimeMillis())
                .roomType(roomTypeDeluxe)
                .status(RoomStatus.AVAILABLE)
                .build());

        room103 = roomRepository.save(Room.builder()
                .roomNumber("P103_" + System.currentTimeMillis())
                .roomType(roomTypeDeluxe)
                .status(RoomStatus.AVAILABLE)
                .build());
    }

    @Test
    @DisplayName("Loại trừ phòng gián đoạn và sự cố khỏi thời gian dọn trung bình")
    void testCalculateProductivity_ExcludesInterruptedAndIncidentFromAverage() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Phòng dọn bình thường 30 phút
        cleaningRecordRepository.save(RoomCleaningRecord.builder()
                .room(room101)
                .roomType(roomTypeDeluxe)
                .housekeeper(housekeeperA)
                .cleaningType("CHECKOUT")
                .startedAt(now.minusMinutes(30))
                .completedAt(now)
                .actualDurationMinutes(30)
                .standardDurationMinutes(40)
                .status(CleaningRecordStatus.APPROVED)
                .isInterrupted(false)
                .hasIncident(false)
                .rejectionCount(0)
                .build());

        // 2. Phòng dọn bình thường 50 phút
        cleaningRecordRepository.save(RoomCleaningRecord.builder()
                .room(room102)
                .roomType(roomTypeDeluxe)
                .housekeeper(housekeeperA)
                .cleaningType("CHECKOUT")
                .startedAt(now.minusMinutes(50))
                .completedAt(now)
                .actualDurationMinutes(50)
                .standardDurationMinutes(40)
                .status(CleaningRecordStatus.APPROVED)
                .isInterrupted(false)
                .hasIncident(false)
                .rejectionCount(0)
                .build());

        // 3. Phòng bị gián đoạn (mất 120 phút do thiếu đồ vải)
        cleaningRecordRepository.save(RoomCleaningRecord.builder()
                .room(room103)
                .roomType(roomTypeDeluxe)
                .housekeeper(housekeeperA)
                .cleaningType("CHECKOUT")
                .startedAt(now.minusMinutes(120))
                .completedAt(now)
                .actualDurationMinutes(120)
                .standardDurationMinutes(40)
                .status(CleaningRecordStatus.APPROVED)
                .isInterrupted(true)
                .interruptionReason("Thiếu ga giường")
                .hasIncident(false)
                .rejectionCount(1)
                .build());

        // 4. Phòng có báo sự cố hỏng vòi nước (mất 90 phút)
        cleaningRecordRepository.save(RoomCleaningRecord.builder()
                .room(room101)
                .roomType(roomTypeDeluxe)
                .housekeeper(housekeeperA)
                .cleaningType("CHECKOUT")
                .startedAt(now.minusMinutes(90))
                .completedAt(now)
                .actualDurationMinutes(90)
                .standardDurationMinutes(40)
                .status(CleaningRecordStatus.APPROVED)
                .isInterrupted(false)
                .hasIncident(true)
                .incidentCount(1)
                .rejectionCount(0)
                .build());

        HousekeepingProductivityReportResponse report = productivityService.getProductivityReport(
                "DAY", LocalDate.now(), null, null, owner
        );

        assertNotNull(report);
        assertEquals(4, report.getTotalRoomsCleaned());
        // Thời gian trung bình chỉ tính (30 + 50) / 2 = 40.0 phút, loại trừ 120p và 90p!
        assertEquals(40.0, report.getFacilityAverageDurationMinutes());
        assertEquals(2, report.getTotalInterruptedOrIncidentRooms());

        var statA = report.getHousekeeperStats().stream()
                .filter(s -> s.getHousekeeperId().equals(housekeeperA.getId()))
                .findFirst().orElseThrow();

        assertEquals(4, statA.getTotalRoomsCleaned());
        assertEquals(2, statA.getCompletedNormalRoomsCount());
        assertEquals(2, statA.getInterruptedOrIncidentRoomsCount());
        assertEquals(40.0, statA.getAverageDurationMinutes());
        assertEquals(1, statA.getRejectedInspectionCount());
        assertEquals(1, statA.getIncidentReportedCount());
    }

    @Test
    @DisplayName("Nhân viên buồng phòng chỉ xem được số liệu của chính mình")
    void testPermissions_HousekeeperSeesOnlySelf() {
        LocalDateTime now = LocalDateTime.now();

        // Task của nhân viên A
        cleaningRecordRepository.save(RoomCleaningRecord.builder()
                .room(room101)
                .roomType(roomTypeDeluxe)
                .housekeeper(housekeeperA)
                .cleaningType("CHECKOUT")
                .startedAt(now.minusMinutes(35))
                .completedAt(now)
                .actualDurationMinutes(35)
                .standardDurationMinutes(40)
                .status(CleaningRecordStatus.APPROVED)
                .build());

        // Task của nhân viên B
        cleaningRecordRepository.save(RoomCleaningRecord.builder()
                .room(room102)
                .roomType(roomTypeDeluxe)
                .housekeeper(housekeeperB)
                .cleaningType("PERIODIC")
                .startedAt(now.minusMinutes(20))
                .completedAt(now)
                .actualDurationMinutes(20)
                .standardDurationMinutes(20)
                .status(CleaningRecordStatus.APPROVED)
                .build());

        // Nhân viên A gọi xem báo cáo
        HousekeepingProductivityReportResponse reportA = productivityService.getProductivityReport(
                "DAY", LocalDate.now(), null, null, housekeeperA
        );

        assertTrue(reportA.getIsSingleStaffView());
        assertEquals(1, reportA.getTotalRoomsCleaned());
        assertEquals(1, reportA.getHousekeeperStats().size());
        assertEquals(housekeeperA.getId(), reportA.getHousekeeperStats().get(0).getHousekeeperId());
        assertEquals(1, reportA.getRecords().size());
        assertEquals(room101.getRoomNumber(), reportA.getRecords().get(0).getRoomNumber());

        // Chủ cơ sở gọi xem báo cáo -> Thấy tất cả
        HousekeepingProductivityReportResponse reportOwner = productivityService.getProductivityReport(
                "DAY", LocalDate.now(), null, null, owner
        );

        assertFalse(reportOwner.getIsSingleStaffView());
        assertEquals(2, reportOwner.getTotalRoomsCleaned());
        assertEquals(2, reportOwner.getRecords().size());
    }

    @Test
    @DisplayName("Cập nhật định mức thời gian dọn của loại phòng")
    void testUpdateCleaningStandards() {
        CleaningStandardUpdateRequest req = CleaningStandardUpdateRequest.builder()
                .standards(List.of(
                        CleaningStandardUpdateRequest.StandardItem.builder()
                                .roomTypeId(roomTypeDeluxe.getId())
                                .standardCheckoutCleaningMinutes(55)
                                .standardPeriodicCleaningMinutes(25)
                                .build()
                ))
                .build();

        List<CleaningStandardResponse> updated = productivityService.updateCleaningStandards(req, owner);
        assertNotNull(updated);

        var deluxeStd = updated.stream()
                .filter(s -> s.getRoomTypeId().equals(roomTypeDeluxe.getId()))
                .findFirst().orElseThrow();

        assertEquals(55, deluxeStd.getStandardCheckoutCleaningMinutes());
        assertEquals(25, deluxeStd.getStandardPeriodicCleaningMinutes());
    }
}
