package plant.stay.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.ExtraServiceInventoryItemDto;
import plant.stay.dto.request.ExtraServiceRequest;
import plant.stay.dto.response.ExtraServiceResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.InventoryItem;
import plant.stay.repository.InventoryItemRepository;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class ExtraServiceTest {

    @Autowired
    private ExtraServiceService extraServiceService;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private plant.stay.repository.ExtraServiceRepository extraServiceRepository;

    @Autowired
    private plant.stay.repository.BookingServiceUsageRepository bookingServiceUsageRepository;

    @Autowired
    private plant.stay.repository.BookingRepository bookingRepository;

    @Test
    @DisplayName("Tạo dịch vụ phụ thu mới thành công")
    void testCreateExtraService() {
        ExtraServiceRequest request = new ExtraServiceRequest();
        request.setName("Dịch vụ thuê xe máy");
        request.setUnitPrice(new BigDecimal("150000"));
        request.setUnit("Ngày");
        request.setDescription("Xe máy Honda Wave đời mới");
        request.setActive(true);

        ExtraServiceResponse response = extraServiceService.create(request);

        assertNotNull(response);
        assertNotNull(response.getId());
        assertEquals("Dịch vụ thuê xe máy", response.getName());
        assertEquals(0, new BigDecimal("150000").compareTo(response.getUnitPrice()));
        assertEquals("Ngày", response.getUnit());
    }

    @Test
    @DisplayName("Tạo dịch vụ phụ thu có liên kết đồ dùng kho")
    void testCreateExtraServiceWithInventoryItems() {
        InventoryItem item1 = inventoryItemRepository.save(InventoryItem.builder()
                .name("Khăn tắm lớn test")
                .unit("chiếc")
                .quantityOnHand(100)
                .lowStockThreshold(10)
                .build());

        InventoryItem item2 = inventoryItemRepository.save(InventoryItem.builder()
                .name("Nước suối test")
                .unit("chai")
                .quantityOnHand(200)
                .lowStockThreshold(20)
                .build());

        ExtraServiceRequest request = new ExtraServiceRequest();
        request.setName("Combo Tiện Nghi Test");
        request.setUnitPrice(new BigDecimal("80000"));
        request.setUnit("Gói");
        request.setActive(true);
        request.setInventoryItems(List.of(
                ExtraServiceInventoryItemDto.builder()
                        .inventoryItemId(item1.getId())
                        .quantity(2)
                        .build(),
                ExtraServiceInventoryItemDto.builder()
                        .inventoryItemId(item2.getId())
                        .quantity(3)
                        .build()
        ));

        ExtraServiceResponse response = extraServiceService.create(request);

        assertNotNull(response);
        assertNotNull(response.getInventoryItems());
        assertEquals(2, response.getInventoryItems().size());
        assertTrue(response.getInventoryItems().stream().anyMatch(i -> i.getInventoryItemId().equals(item1.getId()) && i.getQuantity() == 2));
        assertTrue(response.getInventoryItems().stream().anyMatch(i -> i.getInventoryItemId().equals(item2.getId()) && i.getQuantity() == 3));

        // Get by ID test
        ExtraServiceResponse fetched = extraServiceService.getById(response.getId());
        assertEquals(2, fetched.getInventoryItems().size());
    }

    @Test
    @DisplayName("Lấy danh sách dịch vụ phụ thu công khai")
    void testGetAllPublicServices() {
        List<ExtraServiceResponse> services = extraServiceService.getAllPublic();
        assertNotNull(services);
        assertFalse(services.isEmpty());
    }

    @Test
    @DisplayName("Cập nhật thông tin và giá dịch vụ phụ thu")
    void testUpdateExtraService() {
        ExtraServiceRequest createReq = new ExtraServiceRequest();
        createReq.setName("Nước tăng lực Redbull");
        createReq.setUnitPrice(new BigDecimal("20000"));
        createReq.setUnit("Lon");
        createReq.setActive(true);

        ExtraServiceResponse created = extraServiceService.create(createReq);

        ExtraServiceRequest updateReq = new ExtraServiceRequest();
        updateReq.setName("Nước tăng lực Redbull Thái");
        updateReq.setUnitPrice(new BigDecimal("25000"));
        updateReq.setUnit("Lon");
        updateReq.setActive(true);

        ExtraServiceResponse updated = extraServiceService.update(created.getId(), updateReq);

        assertEquals("Nước tăng lực Redbull Thái", updated.getName());
        assertEquals(0, new BigDecimal("25000").compareTo(updated.getUnitPrice()));
    }

    @Test
    @DisplayName("Xóa dịch vụ phụ thu thành công khi chưa phát sinh giao dịch")
    void testDeleteExtraService() {
        ExtraServiceRequest createReq = new ExtraServiceRequest();
        createReq.setName("Dịch vụ tạm thời");
        createReq.setUnitPrice(new BigDecimal("50000"));
        createReq.setUnit("Lần");
        createReq.setActive(true);

        ExtraServiceResponse created = extraServiceService.create(createReq);
        MessageResponse deleteRes = extraServiceService.delete(created.getId());

        assertNotNull(deleteRes);
        assertThrows(ResourceNotFoundException.class, () -> {
            extraServiceService.getById(created.getId());
        });
    }

    @Test
    @DisplayName("Xóa dịch vụ đã phát sinh giao dịch trong booking sẽ chuyển sang Ngừng hoạt động")
    void testDeleteExtraService_WithBookingUsage_DeactivatesService() {
        ExtraServiceRequest createReq = new ExtraServiceRequest();
        createReq.setName("Dịch vụ có khách dùng");
        createReq.setUnitPrice(new BigDecimal("60000"));
        createReq.setUnit("Lần");
        createReq.setActive(true);

        ExtraServiceResponse created = extraServiceService.create(createReq);
        plant.stay.model.ExtraService service = extraServiceRepository.findById(created.getId()).orElseThrow();

        plant.stay.model.Booking booking = bookingRepository.findAll().stream().findFirst().orElse(null);
        if (booking != null) {
            bookingServiceUsageRepository.save(plant.stay.model.BookingServiceUsage.builder()
                    .booking(booking)
                    .extraService(service)
                    .quantity(1)
                    .unitPriceSnapshot(new BigDecimal("60000"))
                    .build());

            MessageResponse deleteRes = extraServiceService.delete(created.getId());
            assertNotNull(deleteRes);
            assertTrue(deleteRes.getMessage().contains("Ngừng hoạt động"));

            ExtraServiceResponse updated = extraServiceService.getById(created.getId());
            assertFalse(updated.isActive());
            assertTrue(updated.isHasBookings());
            assertEquals(1L, updated.getUsageCount());
        }
    }
}
