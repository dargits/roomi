package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.CorporateClientRequest;
import plant.stay.dto.request.NegotiatedPriceAgreementRequest;
import plant.stay.dto.response.CorporateClientResponse;
import plant.stay.dto.response.NegotiatedPriceAgreementResponse;
import plant.stay.dto.response.NegotiatedPricePreviewResponse;
import plant.stay.dto.response.NightlyPriceBreakdownResponse;
import plant.stay.model.*;
import plant.stay.repository.GroupBookingRepository;
import plant.stay.repository.GuestRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class NegotiatedPriceServiceTest {

    @Autowired
    private NegotiatedPriceService negotiatedPriceService;

    @Autowired
    private CorporateClientService corporateClientService;

    @Autowired
    private PricingService pricingService;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private GuestRepository guestRepository;

    @Autowired
    private GroupBookingRepository groupBookingRepository;

    @Autowired
    private UserRepository userRepository;

    private User adminUser;
    private RoomType roomType;
    private Guest guest;
    private GroupBooking groupBooking;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.save(User.builder()
                .account("test_admin_" + System.currentTimeMillis())
                .name("Admin Test")
                .password("secret")
                .role(Role.ADMIN)
                .build());

        roomType = roomTypeRepository.save(RoomType.builder()
                .name("Deluxe VIP Test")
                .basePrice(new BigDecimal("1200000"))
                .standardCapacity(2)
                .maxCapacity(3)
                .extraPersonChargePerNight(new BigDecimal("200000"))
                .active(true)
                .build());

        guest = guestRepository.save(Guest.builder()
                .name("Nguyễn Văn Đại Diện")
                .phone("0988776655")
                .build());

        groupBooking = groupBookingRepository.save(GroupBooking.builder()
                .representativeGuest(guest)
                .checkInDate(LocalDate.now().plusDays(5))
                .checkOutDate(LocalDate.now().plusDays(8))
                .createdBy(adminUser)
                .build());
    }

    @Test
    @DisplayName("Tạo hồ sơ khách công ty thành công")
    void testCreateCorporateClient() {
        CorporateClientRequest req = new CorporateClientRequest();
        req.setCompanyName("Tập đoàn FPT Software");
        req.setTaxCode("0101234567");
        req.setContactPerson("Trần Thị Hằng");
        req.setContactPhone("0912345678");
        req.setContactEmail("hangtt@fpt.com");
        req.setAddress("Duy Tân, Cầu Giấy, Hà Nội");

        CorporateClientResponse res = corporateClientService.create(req, adminUser);
        assertNotNull(res);
        assertNotNull(res.getId());
        assertEquals("Tập đoàn FPT Software", res.getCompanyName());
        assertTrue(res.getActive());
    }

    @Test
    @DisplayName("Tạo thỏa thuận giá cho khách công ty và preview tính đúng mức giá thỏa thuận")
    void testNegotiatedPriceForCorporateClient() {
        CorporateClientRequest cReq = new CorporateClientRequest();
        cReq.setCompanyName("Công ty Viettel");
        CorporateClientResponse corp = corporateClientService.create(cReq, adminUser);

        LocalDate startDate = LocalDate.now().minusDays(1);
        LocalDate endDate = LocalDate.now().plusMonths(3);

        NegotiatedPriceAgreementRequest aReq = new NegotiatedPriceAgreementRequest();
        aReq.setName("Hợp đồng khung Viettel 2026");
        aReq.setCorporateClientId(corp.getId());
        aReq.setPricePerNight(new BigDecimal("800000")); // Thỏa thuận 800k (so với gốc 1.2M)
        aReq.setStartDate(startDate);
        aReq.setEndDate(endDate);

        NegotiatedPriceAgreementResponse agreement = negotiatedPriceService.create(aReq, adminUser);
        assertNotNull(agreement.getId());
        assertEquals(new BigDecimal("800000"), agreement.getPricePerNight());

        // Test preview: lưu trú 2 đêm
        LocalDate checkIn = LocalDate.now().plusDays(2);
        LocalDate checkOut = checkIn.plusDays(2);

        NegotiatedPricePreviewResponse preview = negotiatedPriceService.preview(
                corp.getId(), null, roomType.getId(), checkIn, checkOut, 2, 0
        );

        assertTrue(preview.isApplied());
        assertEquals("CORPORATE", preview.getAgreementType());
        assertEquals(0, new BigDecimal("800000").compareTo(preview.getPricePerNight()));
        assertEquals(2, preview.getTotalNights());
        // 2 đêm * 800k = 1.6M
        assertEquals(0, new BigDecimal("1600000").compareTo(preview.getTotalPrice()));
        // Giá chuẩn: 2 đêm * 1.2M = 2.4M
        assertEquals(0, new BigDecimal("2400000").compareTo(preview.getStandardPrice()));
    }

    @Test
    @DisplayName("Ưu tiên thỏa thuận đoàn cao hơn thỏa thuận khách công ty")
    void testPriorityGroupOverCorporate() {
        // Tạo thỏa thuận công ty: 900.000 đ
        CorporateClientRequest cReq = new CorporateClientRequest();
        cReq.setCompanyName("Tập đoàn Vingroup");
        CorporateClientResponse corp = corporateClientService.create(cReq, adminUser);

        NegotiatedPriceAgreementRequest corpAgreementReq = new NegotiatedPriceAgreementRequest();
        corpAgreementReq.setName("Khung Vingroup");
        corpAgreementReq.setCorporateClientId(corp.getId());
        corpAgreementReq.setPricePerNight(new BigDecimal("900000"));
        corpAgreementReq.setStartDate(LocalDate.now().minusDays(5));
        corpAgreementReq.setEndDate(LocalDate.now().plusMonths(1));
        negotiatedPriceService.create(corpAgreementReq, adminUser);

        // Tạo thỏa thuận riêng cho đoàn: 750.000 đ
        NegotiatedPriceAgreementRequest groupAgreementReq = new NegotiatedPriceAgreementRequest();
        groupAgreementReq.setName("Đoàn Vingroup hội nghị");
        groupAgreementReq.setGroupBookingId(groupBooking.getId());
        groupAgreementReq.setPricePerNight(new BigDecimal("750000"));
        groupAgreementReq.setStartDate(LocalDate.now().minusDays(5));
        groupAgreementReq.setEndDate(LocalDate.now().plusMonths(1));
        negotiatedPriceService.create(groupAgreementReq, adminUser);

        // Resolve khi có cả groupBookingId và corporateClientId
        NegotiatedPriceAgreement resolved = negotiatedPriceService.resolveAgreement(
                groupBooking.getId(), corp.getId(), LocalDate.now().plusDays(6)
        );

        assertNotNull(resolved);
        // Phải ưu tiên thỏa thuận của đoàn (750.000 đ)
        assertEquals(0, new BigDecimal("750000").compareTo(resolved.getPricePerNight()));
        assertNotNull(resolved.getGroupBooking());
        assertEquals(groupBooking.getId(), resolved.getGroupBooking().getId());
    }

    @Test
    @DisplayName("Không áp dụng giá thỏa thuận nếu đã hết hạn hiệu lực")
    void testExpiredAgreementNotApplied() {
        CorporateClientRequest cReq = new CorporateClientRequest();
        cReq.setCompanyName("Hết hạn JSC");
        CorporateClientResponse corp = corporateClientService.create(cReq, adminUser);

        NegotiatedPriceAgreementRequest aReq = new NegotiatedPriceAgreementRequest();
        aReq.setName("Hợp đồng cũ");
        aReq.setCorporateClientId(corp.getId());
        aReq.setPricePerNight(new BigDecimal("600000"));
        aReq.setStartDate(LocalDate.now().minusMonths(2));
        aReq.setEndDate(LocalDate.now().minusDays(1)); // Đã hết hạn hôm qua
        negotiatedPriceService.create(aReq, adminUser);

        LocalDate checkIn = LocalDate.now().plusDays(1);
        LocalDate checkOut = checkIn.plusDays(2);

        NegotiatedPricePreviewResponse preview = negotiatedPriceService.preview(
                corp.getId(), null, roomType.getId(), checkIn, checkOut, 2, 0
        );

        assertFalse(preview.isApplied());
        assertEquals(0, preview.getTotalPrice().compareTo(preview.getStandardPrice()));
    }
}
