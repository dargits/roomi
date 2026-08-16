package plant.stay.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.GuestRequest;
import plant.stay.dto.response.GuestResponse;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class GuestServiceTest {

    @Autowired
    private GuestService guestService;

    @Test
    @DisplayName("Tạo thông tin khách hàng mới thành công")
    void testCreateGuestSuccess() {
        GuestRequest request = new GuestRequest();
        request.setName("Phạm Hải Đăng");
        request.setPhone("0981122334");
        request.setIdNumber("001201009988");
        request.setEmail("dang.pham@example.com");

        GuestResponse response = guestService.create(request);

        assertNotNull(response);
        assertNotNull(response.getId());
        assertEquals("Phạm Hải Đăng", response.getName());
        assertEquals("0981122334", response.getPhone());
    }

    @Test
    @DisplayName("Tìm kiếm khách hàng theo từ khóa tên hoặc số điện thoại")
    void testSearchGuests() {
        GuestRequest req1 = new GuestRequest();
        req1.setName("Trần Minh Quân");
        req1.setPhone("0977889900");
        req1.setIdNumber("079201001122");
        guestService.create(req1);

        List<GuestResponse> resultsByName = guestService.getAll("Minh Quân");
        assertNotNull(resultsByName);
        assertFalse(resultsByName.isEmpty());
        assertTrue(resultsByName.stream().anyMatch(g -> g.getName().contains("Minh Quân")));

        List<GuestResponse> resultsByPhone = guestService.getAll("0977889900");
        assertNotNull(resultsByPhone);
        assertFalse(resultsByPhone.isEmpty());
    }

    @Test
    @DisplayName("Cập nhật thông tin khách hàng")
    void testUpdateGuestInfo() {
        GuestRequest createReq = new GuestRequest();
        createReq.setName("Lê Thị Thảo");
        createReq.setPhone("0944556677");
        createReq.setIdNumber("034201004455");
        GuestResponse created = guestService.create(createReq);

        GuestRequest updateReq = new GuestRequest();
        updateReq.setName("Lê Thị Thu Thảo");
        updateReq.setPhone("0944556677");
        updateReq.setIdNumber("034201004455");
        updateReq.setEmail("thuthao@gmail.com");

        GuestResponse updated = guestService.update(created.getId(), updateReq);

        assertEquals("Lê Thị Thu Thảo", updated.getName());
        assertEquals("thuthao@gmail.com", updated.getEmail());
    }
}
