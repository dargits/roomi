package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.GroupBookingRequest;
import plant.stay.dto.request.GroupBookingRoomRequest;
import plant.stay.dto.response.GroupBookingResponse;
import plant.stay.model.*;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class GroupBookingServiceTest {

    @Autowired
    private GroupBookingService groupBookingService;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    private RoomType roomType;
    private User receptionist;

    @BeforeEach
    void setUp() {
        receptionist = userRepository.findByAccount("group_receptionist")
                .orElseGet(() -> userRepository.save(User.builder()
                        .name("Lễ tân đoàn")
                        .account("group_receptionist")
                        .password("pass123")
                        .phone("0987000001")
                        .role(Role.RECEPTIONIST)
                        .build()));
        roomType = roomTypeRepository.save(RoomType.builder()
                .name("Group Test " + System.nanoTime())
                .maxCapacity(2)
                .basePrice(new BigDecimal("500000"))
                .active(true)
                .build());
        roomRepository.save(Room.builder()
                .roomNumber("GRP-" + System.nanoTime())
                .roomType(roomType)
                .floor("1")
                .status(RoomStatus.AVAILABLE)
                .build());
        roomRepository.save(Room.builder()
                .roomNumber("GRP-" + System.nanoTime())
                .roomType(roomType)
                .floor("1")
                .status(RoomStatus.AVAILABLE)
                .build());
    }

    @Test
    @DisplayName("Tạo đoàn sinh đúng số dòng phòng NEW chưa gán")
    void createsRequestedUnassignedRoomLines() {
        GroupBookingResponse response = groupBookingService.create(requestFor(2), receptionist);

        assertNotNull(response.getId());
        assertEquals("NEW", response.getStatus());
        assertEquals(2, response.getTotalRooms());
        assertEquals(0, response.getAssignedRooms());
        assertEquals(2, response.getBookings().size());
        assertTrue(response.getBookings().stream().allMatch(booking -> booking.getStatus() == BookingStatus.NEW));
        assertTrue(response.getBookings().stream().allMatch(booking -> booking.getRoomId() == null));
        assertEquals(2, bookingRepository.findByGroupBookingId(response.getId()).size());
        assertEquals(0, new BigDecimal("2000000").compareTo(response.getExpectedTotal()));
    }

    @Test
    @DisplayName("Từ chối toàn bộ đoàn khi số phòng yêu cầu vượt số còn lại")
    void rejectsGroupWhenCapacityIsInsufficient() {
        long bookingsBefore = bookingRepository.count();

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> groupBookingService.create(requestFor(3), receptionist));

        assertTrue(exception.getMessage().contains("chỉ còn 2 phòng trống"));
        assertEquals(bookingsBefore, bookingRepository.count());
    }

    private GroupBookingRequest requestFor(int quantity) {
        GroupBookingRoomRequest roomRequest = new GroupBookingRoomRequest();
        roomRequest.setRoomTypeId(roomType.getId());
        roomRequest.setQuantity(quantity);

        GroupBookingRequest request = new GroupBookingRequest();
        request.setRepresentativeName("Nguyễn Đại Diện");
        request.setRepresentativePhone("0977" + System.nanoTime());
        request.setCheckInDate(LocalDate.now().plusDays(5));
        request.setCheckOutDate(LocalDate.now().plusDays(7));
        request.setRooms(List.of(roomRequest));
        return request;
    }
}