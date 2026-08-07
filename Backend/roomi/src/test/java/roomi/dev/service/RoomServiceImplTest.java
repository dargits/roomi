package roomi.dev.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import roomi.dev.dto.request.RoomRequest;
import roomi.dev.model.Room;
import roomi.dev.model.RoomType;
import roomi.dev.repository.RoomRepository;
import roomi.dev.repository.RoomTypeRepository;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.CleaningNotificationRepository;
import roomi.dev.exception.BusinessException;
import roomi.dev.service.impl.RoomServiceImpl;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoomServiceImplTest {

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RoomTypeRepository roomTypeRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private CleaningNotificationRepository cleaningNotificationRepository;

    @InjectMocks
    private RoomServiceImpl roomService;

    @Test
    void createRoom_shouldSaveRoomWhenValid() {
        RoomType roomType = new RoomType();
        roomType.setId(1L);
        roomType.setName("Deluxe");
        roomType.setCapacity(2);
        roomType.setBasePrice(new BigDecimal("500000"));

        when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(roomType));
        when(roomRepository.existsByRoomNumber("101")).thenReturn(false);
        when(roomRepository.save(any(Room.class))).thenReturn(Room.builder().id(1L).roomNumber("101").roomType(roomType).build());

        RoomRequest request = new RoomRequest();
        request.setRoomTypeId(1L);
        request.setRoomNumber("101");
        request.setFloor("1");
        request.setStatus("AVAILABLE");
        request.setNote("Phòng view biển");

        Room result = roomService.createRoom(request);

        assertNotNull(result);
        verify(roomRepository).save(any(Room.class));
    }

    @Test
    void updateRoomStatus_shouldThrowException_whenSettingToOccupied() {
        Room room = Room.builder().id(1L).roomNumber("101").status(Room.Status.AVAILABLE).build();
        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));

        org.junit.jupiter.api.Assertions.assertThrows(
                BusinessException.class,
                () -> roomService.updateRoomStatus(1L, "OCCUPIED")
        );
    }

    @Test
    void updateRoomStatus_shouldThrowException_whenRoomIsOccupied() {
        Room room = Room.builder().id(1L).roomNumber("101").status(Room.Status.OCCUPIED).build();
        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));

        org.junit.jupiter.api.Assertions.assertThrows(
                BusinessException.class,
                () -> roomService.updateRoomStatus(1L, "MAINTENANCE")
        );
    }

    @Test
    void updateRoomStatus_shouldSaveStatus_whenValid() {
        Room room = Room.builder().id(1L).roomNumber("101").status(Room.Status.AVAILABLE).build();
        when(roomRepository.findById(1L)).thenReturn(Optional.of(room));
        when(roomRepository.save(any(Room.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Room result = roomService.updateRoomStatus(1L, "MAINTENANCE");

        org.junit.jupiter.api.Assertions.assertEquals(Room.Status.MAINTENANCE, result.getStatus());
        verify(roomRepository).save(room);
    }
}
