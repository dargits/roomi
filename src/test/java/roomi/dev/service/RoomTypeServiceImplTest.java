package roomi.dev.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import roomi.dev.dto.request.RoomTypeRequest;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.RoomType;
import roomi.dev.repository.RoomTypeRepository;
import roomi.dev.service.impl.RoomTypeServiceImpl;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomTypeServiceImplTest {

    @Mock
    private RoomTypeRepository roomTypeRepository;

    @InjectMocks
    private RoomTypeServiceImpl roomTypeService;

    // ------------------------------------------------------------------ helpers

    private RoomTypeRequest buildRequest(String name, int capacity, String amenities, BigDecimal basePrice) {
        RoomTypeRequest req = new RoomTypeRequest();
        req.setName(name);
        req.setCapacity(capacity);
        req.setAmenities(amenities);
        req.setBasePrice(basePrice);
        return req;
    }

    private RoomType buildRoomType(Long id, String name) {
        return RoomType.builder()
                .id(id)
                .name(name)
                .capacity(2)
                .amenities("WiFi, TV")
                .basePrice(new BigDecimal("500000"))
                .build();
    }

    // ================================================================== CREATE
    @Nested
    @DisplayName("createRoomType")
    class CreateRoomType {

        @Test
        @DisplayName("Thêm loại phòng thành công khi tên chưa tồn tại")
        void createRoomType_success() {
            RoomTypeRequest request = buildRequest("Deluxe", 2, "WiFi, TV", new BigDecimal("500000"));
            RoomType saved = buildRoomType(1L, "Deluxe");

            when(roomTypeRepository.existsByName("Deluxe")).thenReturn(false);
            when(roomTypeRepository.save(any(RoomType.class))).thenReturn(saved);

            RoomType result = roomTypeService.createRoomType(request);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getName()).isEqualTo("Deluxe");
            assertThat(result.getBasePrice()).isEqualByComparingTo("500000");

            verify(roomTypeRepository).existsByName("Deluxe");
            verify(roomTypeRepository).save(any(RoomType.class));
        }

        @Test
        @DisplayName("Thêm loại phòng thất bại khi tên đã tồn tại")
        void createRoomType_duplicateName_throwsBusinessException() {
            RoomTypeRequest request = buildRequest("Deluxe", 2, "WiFi", new BigDecimal("500000"));

            when(roomTypeRepository.existsByName("Deluxe")).thenReturn(true);

            assertThatThrownBy(() -> roomTypeService.createRoomType(request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessage("Loại phòng đã tồn tại");

            verify(roomTypeRepository).existsByName("Deluxe");
            verify(roomTypeRepository, never()).save(any());
        }

        @Test
        @DisplayName("Thêm loại phòng lưu đúng dữ liệu (amenities có thể null)")
        void createRoomType_withNullAmenities_success() {
            RoomTypeRequest request = buildRequest("Standard", 1, null, new BigDecimal("300000"));
            RoomType saved = RoomType.builder()
                    .id(2L).name("Standard").capacity(1).amenities(null)
                    .basePrice(new BigDecimal("300000")).build();

            when(roomTypeRepository.existsByName("Standard")).thenReturn(false);
            when(roomTypeRepository.save(any(RoomType.class))).thenReturn(saved);

            RoomType result = roomTypeService.createRoomType(request);

            assertThat(result.getName()).isEqualTo("Standard");
            assertThat(result.getAmenities()).isNull();
            verify(roomTypeRepository).save(any(RoomType.class));
        }
    }

    // ================================================================== UPDATE
    @Nested
    @DisplayName("updateRoomType")
    class UpdateRoomType {

        @Test
        @DisplayName("Sửa loại phòng thành công khi id tồn tại và tên không bị trùng")
        void updateRoomType_success() {
            RoomType existing = buildRoomType(1L, "Deluxe");
            RoomTypeRequest request = buildRequest("Superior", 3, "WiFi, Pool", new BigDecimal("800000"));

            when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(roomTypeRepository.existsByName("Superior")).thenReturn(false);
            when(roomTypeRepository.save(any(RoomType.class))).thenAnswer(inv -> inv.getArgument(0));

            RoomType result = roomTypeService.updateRoomType(1L, request);

            assertThat(result.getName()).isEqualTo("Superior");
            assertThat(result.getCapacity()).isEqualTo(3);
            assertThat(result.getAmenities()).isEqualTo("WiFi, Pool");
            assertThat(result.getBasePrice()).isEqualByComparingTo("800000");

            verify(roomTypeRepository).findById(1L);
            verify(roomTypeRepository).save(existing);
        }

        @Test
        @DisplayName("Sửa loại phòng thành công khi giữ nguyên tên (case-insensitive)")
        void updateRoomType_sameNameCaseInsensitive_success() {
            RoomType existing = buildRoomType(1L, "Deluxe");
            // Gửi lên "DELUXE" — cùng tên nhưng khác case: không được báo duplicate
            RoomTypeRequest request = buildRequest("DELUXE", 4, "WiFi", new BigDecimal("600000"));

            when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(roomTypeRepository.save(any(RoomType.class))).thenAnswer(inv -> inv.getArgument(0));

            RoomType result = roomTypeService.updateRoomType(1L, request);

            assertThat(result.getName()).isEqualTo("DELUXE");
            verify(roomTypeRepository, never()).existsByName("DELUXE");
        }

        @Test
        @DisplayName("Sửa loại phòng thất bại khi id không tồn tại")
        void updateRoomType_notFound_throwsBusinessException() {
            when(roomTypeRepository.findById(99L)).thenReturn(Optional.empty());

            RoomTypeRequest request = buildRequest("Superior", 2, "WiFi", new BigDecimal("500000"));

            assertThatThrownBy(() -> roomTypeService.updateRoomType(99L, request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessage("Không tìm thấy loại phòng");

            verify(roomTypeRepository).findById(99L);
            verify(roomTypeRepository, never()).save(any());
        }

        @Test
        @DisplayName("Sửa loại phòng thất bại khi tên mới đã tồn tại ở bản ghi khác")
        void updateRoomType_duplicateNewName_throwsBusinessException() {
            RoomType existing = buildRoomType(1L, "Deluxe");
            RoomTypeRequest request = buildRequest("Superior", 2, "WiFi", new BigDecimal("500000"));

            when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(roomTypeRepository.existsByName("Superior")).thenReturn(true);

            assertThatThrownBy(() -> roomTypeService.updateRoomType(1L, request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessage("Loại phòng đã tồn tại");

            verify(roomTypeRepository, never()).save(any());
        }
    }

    // ================================================================== DELETE
    @Nested
    @DisplayName("deleteRoomType")
    class DeleteRoomType {

        @Test
        @DisplayName("Xóa loại phòng thành công khi id tồn tại")
        void deleteRoomType_success() {
            RoomType existing = buildRoomType(1L, "Deluxe");

            when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(existing));

            assertThatCode(() -> roomTypeService.deleteRoomType(1L))
                    .doesNotThrowAnyException();

            verify(roomTypeRepository).findById(1L);
            verify(roomTypeRepository).delete(existing);
        }

        @Test
        @DisplayName("Xóa loại phòng thất bại khi id không tồn tại")
        void deleteRoomType_notFound_throwsBusinessException() {
            when(roomTypeRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> roomTypeService.deleteRoomType(99L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessage("Không tìm thấy loại phòng");

            verify(roomTypeRepository).findById(99L);
            verify(roomTypeRepository, never()).delete(any());
        }
    }
}
