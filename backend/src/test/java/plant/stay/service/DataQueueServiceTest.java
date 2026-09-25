package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import plant.stay.dto.response.DataTaskDto;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.*;
import plant.stay.service.impl.DataQueueServiceImpl;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class DataQueueServiceTest {

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private GuestRepository guestRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private RoomTypeRepository roomTypeRepository;
    @Mock
    private ExtraServiceRepository extraServiceRepository;
    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private InventoryItemRepository inventoryItemRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AuditLogService auditLogService;

    private DataQueueServiceImpl dataQueueService;
    private User testAdmin;

    @BeforeEach
    void setUp() {
        dataQueueService = new DataQueueServiceImpl(
                bookingRepository,
                guestRepository,
                roomRepository,
                roomTypeRepository,
                extraServiceRepository,
                invoiceRepository,
                inventoryItemRepository,
                userRepository,
                auditLogService
        );

        testAdmin = User.builder()
                .id(1L)
                .account("admin")
                .name("Admin User")
                .role(Role.ADMIN)
                .build();
    }

    @Test
    @DisplayName("submitImportTask: Tạo mã taskId và đưa vào hàng đợi thành công")
    void testSubmitImportTask() {
        String csvContent = "Số phòng,Loại phòng,Tầng\n101,Phòng Đơn,1\n102,Phòng Đôi,1";
        byte[] fileBytes = csvContent.getBytes(StandardCharsets.UTF_8);

        DataTaskDto task = dataQueueService.submitImportTask("rooms", fileBytes, "test_rooms.csv", testAdmin);

        assertNotNull(task);
        assertNotNull(task.getTaskId());
        assertEquals("IMPORT", task.getTaskType());
        assertEquals("rooms", task.getDataType());
        assertNotNull(task.getStatus());
        assertNotNull(task.getStatusMessage());
    }

    @Test
    @DisplayName("submitExportTask: Đưa yêu cầu trích xuất vào hàng đợi thành công")
    void testSubmitExportTask() {
        when(roomRepository.findAll()).thenReturn(new ArrayList<>());

        DataTaskDto task = dataQueueService.submitExportTask("rooms", testAdmin);

        assertNotNull(task);
        assertNotNull(task.getTaskId());
        assertEquals("EXPORT", task.getTaskType());
        assertEquals("rooms", task.getDataType());

        // Kiểm tra tra cứu trạng thái tác vụ qua taskId
        DataTaskDto retrieved = dataQueueService.getTaskStatus(task.getTaskId());
        assertNotNull(retrieved);
        assertEquals(task.getTaskId(), retrieved.getTaskId());
    }

    @Test
    @DisplayName("getTaskStatus: Trả về trạng thái FAILED với taskId không tồn tại")
    void testGetTaskStatusNotFound() {
        DataTaskDto notFound = dataQueueService.getTaskStatus("invalid-uuid-123");
        assertNotNull(notFound);
        assertEquals("FAILED", notFound.getStatus());
        assertTrue(notFound.getStatusMessage().contains("Không tìm thấy tác vụ"));
    }
}
