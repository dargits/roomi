package plant.stay.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.RoomTypeRequest;
import plant.stay.dto.response.RoomTypeResponse;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class RoomTypeServiceTest {

    @Autowired
    private RoomTypeService roomTypeService;

    @Test
    @DisplayName("Cấu hình loại phòng hợp lệ với sức chứa tiêu chuẩn, tối đa và phụ thu")
    void testCreateRoomTypeWithCapacityAndSurcharge() {
        RoomTypeRequest request = RoomTypeRequest.builder()
                .name("Phòng Gia Đình Vip")
                .standardCapacity(2)
                .maxCapacity(4)
                .extraPersonChargePerNight(new BigDecimal("150000"))
                .maxChildAgeFree(6)
                .basePrice(new BigDecimal("1000000"))
                .amenitiesDescription("Đầy đủ tiện nghi")
                .active(true)
                .build();

        RoomTypeResponse response = roomTypeService.createRoomType(request);

        assertNotNull(response.getId());
        assertEquals("Phòng Gia Đình Vip", response.getName());
        assertEquals(2, response.getStandardCapacity());
        assertEquals(4, response.getMaxCapacity());
        assertEquals(0, new BigDecimal("150000").compareTo(response.getExtraPersonChargePerNight()));
        assertEquals(6, response.getMaxChildAgeFree());
    }

    @Test
    @DisplayName("Từ chối tạo loại phòng khi sức chứa tối đa nhỏ hơn sức chứa tiêu chuẩn")
    void testRejectWhenMaxCapacityLessThanStandard() {
        RoomTypeRequest request = RoomTypeRequest.builder()
                .name("Phòng Lỗi Sức Chứa")
                .standardCapacity(4)
                .maxCapacity(2) // Max < Standard -> Không hợp lệ
                .extraPersonChargePerNight(new BigDecimal("100000"))
                .basePrice(new BigDecimal("500000"))
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            roomTypeService.createRoomType(request);
        });

        assertTrue(ex.getMessage().contains("không được nhỏ hơn sức chứa tiêu chuẩn"));
    }

    @Test
    @DisplayName("Từ chối khi phụ thu thêm người là số âm")
    void testRejectNegativeExtraPersonCharge() {
        RoomTypeRequest request = RoomTypeRequest.builder()
                .name("Phòng Phụ Thu Âm")
                .standardCapacity(2)
                .maxCapacity(3)
                .extraPersonChargePerNight(new BigDecimal("-50000"))
                .basePrice(new BigDecimal("500000"))
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            roomTypeService.createRoomType(request);
        });

        assertTrue(ex.getMessage().contains("không được là số âm"));
    }

    @Test
    @DisplayName("Cập nhật sức chứa và phụ thu của loại phòng thành công")
    void testUpdateRoomTypeCapacityAndSurcharge() {
        RoomTypeRequest createReq = RoomTypeRequest.builder()
                .name("Phòng Đôi Thường")
                .standardCapacity(2)
                .maxCapacity(2)
                .extraPersonChargePerNight(BigDecimal.ZERO)
                .basePrice(new BigDecimal("600000"))
                .build();

        RoomTypeResponse created = roomTypeService.createRoomType(createReq);

        RoomTypeRequest updateReq = RoomTypeRequest.builder()
                .name("Phòng Đôi Nâng Cấp")
                .standardCapacity(2)
                .maxCapacity(3)
                .extraPersonChargePerNight(new BigDecimal("120000"))
                .maxChildAgeFree(8)
                .basePrice(new BigDecimal("700000"))
                .active(true)
                .build();

        RoomTypeResponse updated = roomTypeService.updateRoomType(created.getId(), updateReq);

        assertEquals(2, updated.getStandardCapacity());
        assertEquals(3, updated.getMaxCapacity());
        assertEquals(0, new BigDecimal("120000").compareTo(updated.getExtraPersonChargePerNight()));
        assertEquals(8, updated.getMaxChildAgeFree());
    }
}
