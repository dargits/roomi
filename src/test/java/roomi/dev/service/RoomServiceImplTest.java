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
}
