package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import plant.stay.dto.request.GroupBookingRequest;
import plant.stay.dto.request.GroupBookingRoomRequest;
import plant.stay.dto.request.GroupRoomAssignmentItemRequest;
import plant.stay.dto.request.GroupRoomAssignmentRequest;
import plant.stay.dto.response.GroupBookingResponse;
import plant.stay.dto.response.GroupRoomAssignmentSuggestionResponse;
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

        @Test
        @DisplayName("Gợi ý và gán đồng loạt tất cả phòng còn thiếu cho đoàn")
        void suggestsAndAssignsAllRemainingRooms() {
        GroupBookingResponse group = groupBookingService.create(requestFor(2), receptionist);

        GroupRoomAssignmentSuggestionResponse suggestion = groupBookingService.getAssignmentSuggestion(group.getId());

        assertEquals(2, suggestion.getAssignments().size());
        assertEquals(2, suggestion.getAssignments().get(0).getAvailableRooms().size());
        GroupRoomAssignmentRequest assignmentRequest = assignmentRequest(
            assignment(suggestion.getAssignments().get(0).getBookingId(), suggestion.getAssignments().get(0).getAvailableRooms().get(0).getId()),
            assignment(suggestion.getAssignments().get(1).getBookingId(), suggestion.getAssignments().get(1).getAvailableRooms().get(1).getId()));

        GroupBookingResponse assigned = groupBookingService.assignRooms(group.getId(), assignmentRequest, receptionist);

        assertEquals("CONFIRMED", assigned.getStatus());
        assertEquals(2, assigned.getAssignedRooms());
        assertTrue(assigned.getBookings().stream().allMatch(booking -> booking.getRoomId() != null));
        assertTrue(assigned.getBookings().stream().allMatch(booking -> booking.getStatus() == BookingStatus.CONFIRMED));
        }

        @Test
        @DisplayName("Từ chối toàn bộ gán đoàn khi một phòng được chọn hai lần")
        void rejectsDuplicateRoomsWithoutAssigningAnyBooking() {
        GroupBookingResponse group = groupBookingService.create(requestFor(2), receptionist);
        GroupRoomAssignmentSuggestionResponse suggestion = groupBookingService.getAssignmentSuggestion(group.getId());
        Long duplicateRoomId = suggestion.getAssignments().get(0).getAvailableRooms().get(0).getId();
        GroupRoomAssignmentRequest assignmentRequest = assignmentRequest(
            assignment(suggestion.getAssignments().get(0).getBookingId(), duplicateRoomId),
            assignment(suggestion.getAssignments().get(1).getBookingId(), duplicateRoomId));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
            () -> groupBookingService.assignRooms(group.getId(), assignmentRequest, receptionist));

        assertTrue(exception.getMessage().contains("Một phòng không thể"));
        assertTrue(bookingRepository.findByGroupBookingId(group.getId()).stream()
            .allMatch(booking -> booking.getRoom() == null && booking.getStatus() == BookingStatus.NEW));
        }

        @Test
        @DisplayName("Từ chối gán phòng khác loại và không đổi các booking của đoàn")
        void rejectsRoomOfDifferentTypeWithoutAssigningAnyBooking() {
        GroupBookingResponse group = groupBookingService.create(requestFor(2), receptionist);
        RoomType otherRoomType = roomTypeRepository.save(RoomType.builder()
            .name("Other Group Type " + System.nanoTime())
            .maxCapacity(2)
            .basePrice(new BigDecimal("600000"))
            .active(true)
            .build());
        Room otherRoom = roomRepository.save(Room.builder()
            .roomNumber("OTHER-" + System.nanoTime())
            .roomType(otherRoomType)
            .floor("2")
            .status(RoomStatus.AVAILABLE)
            .build());
        GroupRoomAssignmentSuggestionResponse suggestion = groupBookingService.getAssignmentSuggestion(group.getId());
        GroupRoomAssignmentRequest assignmentRequest = assignmentRequest(
            assignment(suggestion.getAssignments().get(0).getBookingId(), suggestion.getAssignments().get(0).getAvailableRooms().get(0).getId()),
            assignment(suggestion.getAssignments().get(1).getBookingId(), otherRoom.getId()));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
            () -> groupBookingService.assignRooms(group.getId(), assignmentRequest, receptionist));

        assertTrue(exception.getMessage().contains("không đúng loại phòng"));
        assertTrue(bookingRepository.findByGroupBookingId(group.getId()).stream()
            .allMatch(booking -> booking.getRoom() == null && booking.getStatus() == BookingStatus.NEW));
    }

    @Test
    @DisplayName("NCL-13-CN-004: Hủy một phần số phòng trong đoàn thành công")
    void cancelsPartialRoomsSuccessfully() {
        GroupBookingResponse group = groupBookingService.create(requestFor(2), receptionist);
        Long bookingIdToCancel = group.getBookings().get(0).getId();

        GroupBookingResponse updated = groupBookingService.cancelPartialRooms(
                group.getId(), List.of(bookingIdToCancel), receptionist);

        assertNotNull(updated);
        assertEquals(2, updated.getTotalRooms());
        Booking cancelled = bookingRepository.findById(bookingIdToCancel).orElseThrow();
        assertEquals(BookingStatus.CANCELLED, cancelled.getStatus());
    }

    @Test
    @DisplayName("NCL-13-CN-004: Từ chối khi chọn hủy toàn bộ số phòng qua luồng hủy một phần")
    void rejectsCancelingAllRoomsViaPartialFlow() {
        GroupBookingResponse group = groupBookingService.create(requestFor(2), receptionist);
        List<Long> allBookingIds = group.getBookings().stream().map(b -> b.getId()).toList();

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> groupBookingService.cancelPartialRooms(group.getId(), allBookingIds, receptionist));

        assertTrue(exception.getMessage().contains("toàn bộ"));
    }

        private GroupRoomAssignmentRequest assignmentRequest(GroupRoomAssignmentItemRequest... assignments) {
        GroupRoomAssignmentRequest request = new GroupRoomAssignmentRequest();
        request.setAssignments(List.of(assignments));
        return request;
        }

        private GroupRoomAssignmentItemRequest assignment(Long bookingId, Long roomId) {
        GroupRoomAssignmentItemRequest item = new GroupRoomAssignmentItemRequest();
        item.setBookingId(bookingId);
        item.setRoomId(roomId);
        return item;
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