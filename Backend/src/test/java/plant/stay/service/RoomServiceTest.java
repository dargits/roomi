package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.RoomRequest;
import plant.stay.dto.response.RoomResponse;
import plant.stay.exception.DuplicateResourceException;
import plant.stay.model.Role;
import plant.stay.model.RoomStatus;
import plant.stay.model.RoomType;
import plant.stay.model.User;
import plant.stay.repository.RoomRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.UserRepository;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class RoomServiceTest {

    @Autowired
    private RoomService roomService;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private UserRepository userRepository;

    private User testOwner;
    private RoomType testRoomType;

    @BeforeEach
    void setUp() {
        testOwner = userRepository.findByAccount("chusohuu")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Chủ Khách Sạn")
                        .account("chusohuu_test")
                        .password("pass123")
                        .role(Role.OWNER)
                        .phone("0912345678")
                        .build()));

        testRoomType = roomTypeRepository.findAll().stream()
                .findFirst()
                .orElseGet(() -> roomTypeRepository.save(RoomType.builder()
                        .name("Deluxe Test")
                        .basePrice(new BigDecimal("800000"))
                        .maxCapacity(4)
                        .build()));
    }

    @Test
    @DisplayName("Tạo phòng mới thành công với số phòng duy nhất")
    void testCreateRoomSuccess() {
        RoomRequest request = new RoomRequest();
        request.setRoomNumber("901");
        request.setRoomTypeId(testRoomType.getId());
        request.setFloor("9");
        request.setStatus(RoomStatus.AVAILABLE);
        request.setNotes("Phòng view biển");

        RoomResponse response = roomService.create(request, testOwner);

        assertNotNull(response);
        assertEquals("901", response.getRoomNumber());
        assertEquals(RoomStatus.AVAILABLE, response.getStatus());
    }

    @Test
    @DisplayName("Báo lỗi DuplicateResourceException khi tạo trùng số phòng")
    void testCreateDuplicateRoom() {
        RoomRequest request = new RoomRequest();
        request.setRoomNumber("902");
        request.setRoomTypeId(testRoomType.getId());
        request.setFloor("9");
        request.setStatus(RoomStatus.AVAILABLE);

        roomService.create(request, testOwner);

        // Try creating with the same room number again
        assertThrows(DuplicateResourceException.class, () -> {
            roomService.create(request, testOwner);
        });
    }

    @Test
    @DisplayName("Lấy danh sách tất cả các phòng")
    void testGetAllRooms() {
        List<RoomResponse> rooms = roomService.getAll();
        assertNotNull(rooms);
        assertFalse(rooms.isEmpty());
    }

    @Test
    @DisplayName("Dọn phòng: Chuyển trạng thái từ DIRTY sang AVAILABLE khi hoàn tất dọn dẹp")
    void testMarkRoomClean() {
        RoomRequest request = new RoomRequest();
        request.setRoomNumber("903");
        request.setRoomTypeId(testRoomType.getId());
        request.setFloor("9");
        request.setStatus(RoomStatus.DIRTY);

        RoomResponse created = roomService.create(request, testOwner);
        assertEquals(RoomStatus.DIRTY, created.getStatus());

        roomService.markClean(created.getId(), testOwner);

        RoomResponse updated = roomService.getById(created.getId());
        assertEquals(RoomStatus.AVAILABLE, updated.getStatus());
    }

    @Test
    @DisplayName("Bảo trì: Khóa phòng bảo trì chuyển trạng thái sang MAINTENANCE")
    void testMarkRoomMaintenance() {
        RoomRequest request = new RoomRequest();
        request.setRoomNumber("904");
        request.setRoomTypeId(testRoomType.getId());
        request.setFloor("9");
        request.setStatus(RoomStatus.AVAILABLE);

        RoomResponse created = roomService.create(request, testOwner);

        roomService.setMaintenance(created.getId(), testOwner);

        RoomResponse updated = roomService.getById(created.getId());
        assertEquals(RoomStatus.MAINTENANCE, updated.getStatus());
    }
}
