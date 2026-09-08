package plant.stay.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.ExtraServiceRequest;
import plant.stay.dto.response.ExtraServiceResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.ResourceNotFoundException;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class ExtraServiceTest {

    @Autowired
    private ExtraServiceService extraServiceService;

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
    @DisplayName("Xóa dịch vụ phụ thu thành công")
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
}
