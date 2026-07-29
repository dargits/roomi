package roomi.dev.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.model.*;
import roomi.dev.repository.*;
import roomi.dev.util.PasswordHelper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;
    private final GuestRepository guestRepository;
    private final SeasonalRateRepository seasonalRateRepository;
    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final SurchargeServiceRepository surchargeServiceRepository;
    private final BookingSurchargeUsageRepository bookingSurchargeUsageRepository;
    private final PropertySettingsRepository propertySettingsRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("=== Database đã có dữ liệu, bỏ qua seeding ===");
            return;
        }
        log.info("=== Bắt đầu seed dữ liệu mẫu ===");
        seedPropertySettings();
        seedUsers();
        seedRoomTypes();
        seedRooms();
        seedSeasonalRates();
        seedSurchargeServices();
        seedGuests();
        seedBookings();
        log.info("=== Hoàn thành seed dữ liệu mẫu ===");
    }

    // ================================================================== PROPERTY SETTINGS
    private void seedPropertySettings() {
        log.info("Seed PropertySettings...");
        propertySettingsRepository.save(PropertySettings.builder()
                .id(1L)
                .propertyName("Roomi Hotel")
                .address("123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh")
                .phone("0281234567")
                .freeCancelHours(24)
                .cancelFeePercent(new BigDecimal("10.00"))
                .build());
        log.info("✓ PropertySettings");
    }

    // ================================================================== USERS
    private void seedUsers() {
        log.info("Seed Users...");
        userRepository.save(User.builder().fullName("Admin Hệ Thống").username("admin")
                .passwordHash(PasswordHelper.encode("123456")).role(User.Role.ADMIN)
                .phone("0900000000").active(true).build());
        userRepository.save(User.builder().fullName("Nguyễn Thị Lễ Tân").username("letana")
                .passwordHash(PasswordHelper.encode("123456")).role(User.Role.RECEPTIONIST)
                .phone("0900000001").active(true).build());
        userRepository.save(User.builder().fullName("Trần Văn Lễ Tân").username("letanb")
                .passwordHash(PasswordHelper.encode("123456")).role(User.Role.RECEPTIONIST)
                .phone("0900000002").active(true).build());
        userRepository.save(User.builder().fullName("Lê Thị Buồng Phòng").username("housekeepera")
                .passwordHash(PasswordHelper.encode("123456")).role(User.Role.HOUSEKEEPER)
                .phone("0900000003").active(true).build());
        userRepository.save(User.builder().fullName("Phạm Kế Toán").username("accountant")
                .passwordHash(PasswordHelper.encode("123456")).role(User.Role.ACCOUNTANT)
                .phone("0900000004").active(true).build());
        userRepository.save(User.builder().fullName("Chủ Khách Sạn").username("owner")
                .passwordHash(PasswordHelper.encode("123456")).role(User.Role.OWNER)
                .phone("0900000005").active(true).build());
        log.info("✓ 6 users");
    }

    // ================================================================== ROOM TYPES
    private void seedRoomTypes() {
        log.info("Seed RoomTypes...");
        roomTypeRepository.save(RoomType.builder().name("Phòng Standard").capacity(2)
                .amenities("1 giường đôi, TV 32\", Điều hòa, WiFi, Nước nóng, Tủ đầu giường")
                .basePrice(new BigDecimal("500000")).build());
        roomTypeRepository.save(RoomType.builder().name("Phòng Deluxe").capacity(3)
                .amenities("1 giường đôi + 1 giường đơn, TV 43\", Điều hòa, WiFi, Tủ lạnh, Ban công")
                .basePrice(new BigDecimal("800000")).build());
        roomTypeRepository.save(RoomType.builder().name("Phòng Suite").capacity(4)
                .amenities("2 giường đôi, TV 55\", Điều hòa, WiFi, Tủ lạnh, Bồn tắm, Phòng khách riêng, Minibar")
                .basePrice(new BigDecimal("1500000")).build());
        roomTypeRepository.save(RoomType.builder().name("Phòng Family").capacity(6)
                .amenities("2 giường đôi + 2 giường đơn, 2 TV, Điều hòa, WiFi, Tủ lạnh, Bếp nhỏ, 2 WC")
                .basePrice(new BigDecimal("2000000")).build());
        log.info("✓ 4 loại phòng");
    }

    // ================================================================== ROOMS
    private void seedRooms() {
        log.info("Seed Rooms...");
        RoomType std = roomTypeRepository.findAll().get(0);
        RoomType dlx = roomTypeRepository.findAll().get(1);
        RoomType ste = roomTypeRepository.findAll().get(2);
        RoomType fam = roomTypeRepository.findAll().get(3);

        // Tầng 1 — Standard (101-106)
        String[] stdNotes = {"Phòng góc, view đường phố", null, null, "Gần thang máy", null, null};
        Room.Status[] stdStatuses = {
            Room.Status.AVAILABLE, Room.Status.OCCUPIED,
            Room.Status.NEEDS_CLEANING, Room.Status.AVAILABLE,
            Room.Status.AVAILABLE, Room.Status.MAINTENANCE
        };
        for (int i = 1; i <= 6; i++) {
            roomRepository.save(Room.builder().roomType(std).roomNumber("10" + i).floor("1")
                    .status(stdStatuses[i - 1]).note(stdNotes[i - 1]).build());
        }
        // Tầng 2 — Deluxe (201-205)
        Room.Status[] dlxStatuses = {
            Room.Status.OCCUPIED, Room.Status.AVAILABLE,
            Room.Status.AVAILABLE, Room.Status.NEEDS_CLEANING, Room.Status.AVAILABLE
        };
        for (int i = 1; i <= 5; i++) {
            roomRepository.save(Room.builder().roomType(dlx).roomNumber("20" + i).floor("2")
                    .status(dlxStatuses[i - 1]).build());
        }
        // Tầng 3 — Suite (301-303) + Family (304-305)
        roomRepository.save(Room.builder().roomType(ste).roomNumber("301").floor("3")
                .status(Room.Status.AVAILABLE).note("Suite góc, view toàn thành phố").build());
        roomRepository.save(Room.builder().roomType(ste).roomNumber("302").floor("3")
                .status(Room.Status.AVAILABLE).build());
        roomRepository.save(Room.builder().roomType(ste).roomNumber("303").floor("3")
                .status(Room.Status.AVAILABLE).build());
        roomRepository.save(Room.builder().roomType(fam).roomNumber("304").floor("3")
                .status(Room.Status.AVAILABLE).note("Phòng gia đình, 2 phòng tắm").build());
        roomRepository.save(Room.builder().roomType(fam).roomNumber("305").floor("3")
                .status(Room.Status.OCCUPIED).build());
        log.info("✓ 16 phòng");
    }

    // ================================================================== SEASONAL RATES
    private void seedSeasonalRates() {
        log.info("Seed SeasonalRates...");
        List<RoomType> types = roomTypeRepository.findAll();
        RoomType std = types.get(0); RoomType dlx = types.get(1);
        RoomType ste = types.get(2); RoomType fam = types.get(3);

        // Hè 2026 (tháng 6-8) +50%
        seasonalRateRepository.save(SeasonalRate.builder().roomType(std)
                .startDate(LocalDate.of(2026,6,1)).endDate(LocalDate.of(2026,8,31))
                .price(new BigDecimal("750000")).build());
        seasonalRateRepository.save(SeasonalRate.builder().roomType(dlx)
                .startDate(LocalDate.of(2026,6,1)).endDate(LocalDate.of(2026,8,31))
                .price(new BigDecimal("1200000")).build());
        seasonalRateRepository.save(SeasonalRate.builder().roomType(ste)
                .startDate(LocalDate.of(2026,6,1)).endDate(LocalDate.of(2026,8,31))
                .price(new BigDecimal("2250000")).build());
        seasonalRateRepository.save(SeasonalRate.builder().roomType(fam)
                .startDate(LocalDate.of(2026,6,1)).endDate(LocalDate.of(2026,8,31))
                .price(new BigDecimal("3000000")).build());

        // Lễ 30/4-1/5/2026 +80%
        seasonalRateRepository.save(SeasonalRate.builder().roomType(std)
                .startDate(LocalDate.of(2026,4,28)).endDate(LocalDate.of(2026,5,3))
                .price(new BigDecimal("900000")).build());
        seasonalRateRepository.save(SeasonalRate.builder().roomType(dlx)
                .startDate(LocalDate.of(2026,4,28)).endDate(LocalDate.of(2026,5,3))
                .price(new BigDecimal("1440000")).build());
        seasonalRateRepository.save(SeasonalRate.builder().roomType(ste)
                .startDate(LocalDate.of(2026,4,28)).endDate(LocalDate.of(2026,5,3))
                .price(new BigDecimal("2700000")).build());
        seasonalRateRepository.save(SeasonalRate.builder().roomType(fam)
                .startDate(LocalDate.of(2026,4,28)).endDate(LocalDate.of(2026,5,3))
                .price(new BigDecimal("3600000")).build());

        // Tết 2027 (30/12-5/1) +100%
        seasonalRateRepository.save(SeasonalRate.builder().roomType(std)
                .startDate(LocalDate.of(2026,12,30)).endDate(LocalDate.of(2027,1,5))
                .price(new BigDecimal("1000000")).build());
        seasonalRateRepository.save(SeasonalRate.builder().roomType(dlx)
                .startDate(LocalDate.of(2026,12,30)).endDate(LocalDate.of(2027,1,5))
                .price(new BigDecimal("1600000")).build());
        seasonalRateRepository.save(SeasonalRate.builder().roomType(ste)
                .startDate(LocalDate.of(2026,12,30)).endDate(LocalDate.of(2027,1,5))
                .price(new BigDecimal("3000000")).build());
        seasonalRateRepository.save(SeasonalRate.builder().roomType(fam)
                .startDate(LocalDate.of(2026,12,30)).endDate(LocalDate.of(2027,1,5))
                .price(new BigDecimal("4000000")).build());
        log.info("✓ 12 mức giá theo mùa");
    }

    // ================================================================== SURCHARGE SERVICES
    private void seedSurchargeServices() {
        log.info("Seed SurchargeServices...");
        surchargeServiceRepository.save(SurchargeService.builder()
                .name("Giặt ủi").description("Giặt và ủi quần áo, tính theo kg")
                .unitPrice(new BigDecimal("50000")).active(true).build());
        surchargeServiceRepository.save(SurchargeService.builder()
                .name("Đưa đón sân bay").description("Đưa đón sân bay Tân Sơn Nhất, 1 chiều")
                .unitPrice(new BigDecimal("300000")).active(true).build());
        surchargeServiceRepository.save(SurchargeService.builder()
                .name("Thuê xe máy").description("Thuê xe máy theo ngày")
                .unitPrice(new BigDecimal("150000")).active(true).build());
        surchargeServiceRepository.save(SurchargeService.builder()
                .name("Bữa sáng bổ sung").description("Bữa sáng buffet tại nhà hàng, tính theo người")
                .unitPrice(new BigDecimal("120000")).active(true).build());
        surchargeServiceRepository.save(SurchargeService.builder()
                .name("Spa & Massage").description("Dịch vụ spa và massage thư giãn, tính theo giờ")
                .unitPrice(new BigDecimal("400000")).active(true).build());
        surchargeServiceRepository.save(SurchargeService.builder()
                .name("Phụ thu khách thêm").description("Phụ thu cho khách ở thêm ngoài sức chứa phòng")
                .unitPrice(new BigDecimal("200000")).active(true).build());
        surchargeServiceRepository.save(SurchargeService.builder()
                .name("Thuê xe đạp").description("Thuê xe đạp theo ngày")
                .unitPrice(new BigDecimal("50000")).active(false).build());
        log.info("✓ 7 dịch vụ phụ thu");
    }

    // ================================================================== GUESTS
    private void seedGuests() {
        log.info("Seed Guests...");
        guestRepository.save(Guest.builder().fullName("Nguyễn Văn An").phone("0901234567")
                .email("nguyenvanan@email.com").idNumber("001234567890").loyaltyPoints(250).build());
        guestRepository.save(Guest.builder().fullName("Trần Thị Bình").phone("0912345678")
                .email("tranthiminh@email.com").idNumber("001234567891").loyaltyPoints(120).build());
        guestRepository.save(Guest.builder().fullName("Lê Hoàng Cường").phone("0923456789")
                .idNumber("001234567892").loyaltyPoints(0).build());
        guestRepository.save(Guest.builder().fullName("Phạm Thị Dung").phone("0934567890")
                .email("phamthidung@email.com").idNumber("001234567893").loyaltyPoints(80).build());
        guestRepository.save(Guest.builder().fullName("Hoàng Minh Đức").phone("0945678901")
                .idNumber("001234567894").note("Khách VIP, ưu tiên phòng tầng cao").loyaltyPoints(750).build());
        guestRepository.save(Guest.builder().fullName("Vũ Thị Hoa").phone("0956789012")
                .email("vuthihoa@email.com").idNumber("001234567895").loyaltyPoints(30).build());
        guestRepository.save(Guest.builder().fullName("Đặng Quốc Hùng").phone("0967890123")
                .idNumber("001234567896").loyaltyPoints(0).build());
        guestRepository.save(Guest.builder().fullName("Bùi Thị Kim").phone("0978901234")
                .email("buithikim@email.com").idNumber("001234567897").loyaltyPoints(200).build());
        guestRepository.save(Guest.builder().fullName("Ngô Văn Long").phone("0989012345")
                .idNumber("001234567898").note("Dị ứng mùi nước hoa").loyaltyPoints(50).build());
        guestRepository.save(Guest.builder().fullName("Phan Thị Mai").phone("0990123456")
                .email("phanthimai@email.com").idNumber("001234567899").loyaltyPoints(400).build());
        log.info("✓ 10 khách hàng");
    }

    // ================================================================== BOOKINGS + INVOICES + PAYMENTS
    private void seedBookings() {
        log.info("Seed Bookings...");
        List<User> users = userRepository.findAll();
        List<Guest> guests = guestRepository.findAll();
        List<Room> rooms = roomRepository.findAll();
        List<RoomType> types = roomTypeRepository.findAll();
        List<SurchargeService> services = surchargeServiceRepository.findAll();

        User receptionist = users.stream()
                .filter(u -> u.getRole() == User.Role.RECEPTIONIST).findFirst().orElse(users.get(0));
        User accountant = users.stream()
                .filter(u -> u.getRole() == User.Role.ACCOUNTANT).findFirst().orElse(users.get(0));

        // Tìm phòng theo số phòng
        Room r101 = findRoom(rooms, "101"); Room r102 = findRoom(rooms, "102");
        Room r103 = findRoom(rooms, "103"); Room r201 = findRoom(rooms, "201");
        Room r202 = findRoom(rooms, "202"); Room r301 = findRoom(rooms, "301");
        Room r302 = findRoom(rooms, "302"); Room r304 = findRoom(rooms, "304");

        RoomType std = types.get(0); RoomType dlx = types.get(1);
        RoomType ste = types.get(2); RoomType fam = types.get(3);

        // --- Booking 1: CHECKED_OUT — đã thanh toán tiền mặt ---
        Booking b1 = bookingRepository.save(Booking.builder()
                .guest(guests.get(0)).roomType(std).room(r101)
                .checkInDate(LocalDate.now().minusDays(5)).checkOutDate(LocalDate.now().minusDays(2))
                .status(Booking.Status.CHECKED_OUT).source(Booking.Source.WALK_IN)
                .expectedPrice(new BigDecimal("1500000")).createdBy(receptionist).build());
        Invoice inv1 = invoiceRepository.save(Invoice.builder().booking(b1)
                .roomCharge(new BigDecimal("1500000")).serviceCharge(new BigDecimal("120000"))
                .discount(BigDecimal.ZERO).totalAmount(new BigDecimal("1620000"))
                .status(Invoice.Status.PAID).build());
        paymentRepository.save(Payment.builder().invoice(inv1)
                .amount(new BigDecimal("1620000")).method(Payment.Method.CASH)
                .receivedBy(accountant).build());

        // --- Booking 2: CHECKED_OUT — thanh toán chuyển khoản ---
        Booking b2 = bookingRepository.save(Booking.builder()
                .guest(guests.get(1)).roomType(dlx).room(r201)
                .checkInDate(LocalDate.now().minusDays(3)).checkOutDate(LocalDate.now().minusDays(1))
                .status(Booking.Status.CHECKED_OUT).source(Booking.Source.PHONE)
                .expectedPrice(new BigDecimal("1600000")).createdBy(receptionist).build());
        Invoice inv2 = invoiceRepository.save(Invoice.builder().booking(b2)
                .roomCharge(new BigDecimal("1600000")).serviceCharge(new BigDecimal("300000"))
                .discount(new BigDecimal("100000")).totalAmount(new BigDecimal("1800000"))
                .status(Invoice.Status.PAID).build());
        paymentRepository.save(Payment.builder().invoice(inv2)
                .amount(new BigDecimal("1800000")).method(Payment.Method.BANK_TRANSFER)
                .receivedBy(accountant).build());
        bookingSurchargeUsageRepository.save(BookingSurchargeUsage.builder()
                .booking(b2).surchargeService(services.get(0))
                .serviceName(services.get(0).getName()).unitPrice(services.get(0).getUnitPrice())
                .quantity(2).lineTotal(new BigDecimal("100000")).recordedBy(receptionist).build());
        bookingSurchargeUsageRepository.save(BookingSurchargeUsage.builder()
                .booking(b2).surchargeService(services.get(1))
                .serviceName(services.get(1).getName()).unitPrice(services.get(1).getUnitPrice())
                .quantity(1).lineTotal(new BigDecimal("300000")).recordedBy(receptionist).build());
        log.info("  Đã tạo 2 booking CHECKED_OUT");

        // --- Booking 3: CHECKED_IN hôm nay — invoice PENDING ---
        Booking b3 = bookingRepository.save(Booking.builder()
                .guest(guests.get(2)).roomType(std).room(r102)
                .checkInDate(LocalDate.now()).checkOutDate(LocalDate.now().plusDays(3))
                .status(Booking.Status.CHECKED_IN).source(Booking.Source.WALK_IN)
                .expectedPrice(new BigDecimal("1500000")).createdBy(receptionist).build());
        invoiceRepository.save(Invoice.builder().booking(b3)
                .roomCharge(new BigDecimal("1500000")).serviceCharge(BigDecimal.ZERO)
                .discount(BigDecimal.ZERO).totalAmount(new BigDecimal("1500000"))
                .status(Invoice.Status.PENDING).build());

        // --- Booking 4: CHECKED_IN — Suite, đang ở ---
        Booking b4 = bookingRepository.save(Booking.builder()
                .guest(guests.get(4)).roomType(ste).room(r302)
                .checkInDate(LocalDate.now().minusDays(1)).checkOutDate(LocalDate.now().plusDays(4))
                .status(Booking.Status.CHECKED_IN).source(Booking.Source.BOOKING_PORTAL)
                .expectedPrice(new BigDecimal("7500000")).createdBy(receptionist)
                .createdAt(LocalDateTime.now().minusDays(2)).build());
        invoiceRepository.save(Invoice.builder().booking(b4)
                .roomCharge(new BigDecimal("7500000")).serviceCharge(new BigDecimal("400000"))
                .discount(BigDecimal.ZERO).totalAmount(new BigDecimal("7900000"))
                .status(Invoice.Status.PENDING).build());
        bookingSurchargeUsageRepository.save(BookingSurchargeUsage.builder()
                .booking(b4).surchargeService(services.get(4))
                .serviceName(services.get(4).getName()).unitPrice(services.get(4).getUnitPrice())
                .quantity(1).lineTotal(new BigDecimal("400000")).note("Massage thư giãn").recordedBy(receptionist).build());
        log.info("  Đã tạo 2 booking CHECKED_IN");

        // --- Booking 5: CONFIRMED — sắp đến ---
        Booking b5 = bookingRepository.save(Booking.builder()
                .guest(guests.get(3)).roomType(dlx).room(r202)
                .checkInDate(LocalDate.now().plusDays(2)).checkOutDate(LocalDate.now().plusDays(5))
                .status(Booking.Status.CONFIRMED).source(Booking.Source.PHONE)
                .expectedPrice(new BigDecimal("2400000")).createdBy(receptionist).build());
        invoiceRepository.save(Invoice.builder().booking(b5)
                .roomCharge(new BigDecimal("2400000")).serviceCharge(BigDecimal.ZERO)
                .discount(BigDecimal.ZERO).totalAmount(new BigDecimal("2400000"))
                .status(Invoice.Status.PENDING).build());

        // --- Booking 6: CONFIRMED — Suite sắp tới ---
        Booking b6 = bookingRepository.save(Booking.builder()
                .guest(guests.get(7)).roomType(ste).room(r301)
                .checkInDate(LocalDate.now().plusDays(5)).checkOutDate(LocalDate.now().plusDays(10))
                .status(Booking.Status.CONFIRMED).source(Booking.Source.EXTERNAL_CHANNEL)
                .expectedPrice(new BigDecimal("7500000")).createdBy(receptionist).build());
        invoiceRepository.save(Invoice.builder().booking(b6)
                .roomCharge(new BigDecimal("7500000")).serviceCharge(BigDecimal.ZERO)
                .discount(new BigDecimal("500000")).totalAmount(new BigDecimal("7000000"))
                .status(Invoice.Status.PENDING).build());
        log.info("  Đã tạo 2 booking CONFIRMED");

        // --- Booking 7: NEW — chưa gán phòng ---
        bookingRepository.save(Booking.builder()
                .guest(guests.get(5)).roomType(std)
                .checkInDate(LocalDate.now().plusDays(7)).checkOutDate(LocalDate.now().plusDays(9))
                .status(Booking.Status.NEW).source(Booking.Source.BOOKING_PORTAL)
                .expectedPrice(new BigDecimal("1000000")).createdBy(receptionist).build());

        // --- Booking 8: NEW — Family, chưa gán phòng ---
        bookingRepository.save(Booking.builder()
                .guest(guests.get(6)).roomType(fam)
                .checkInDate(LocalDate.now().plusDays(3)).checkOutDate(LocalDate.now().plusDays(7))
                .status(Booking.Status.NEW).source(Booking.Source.PHONE)
                .expectedPrice(new BigDecimal("8000000")).createdBy(receptionist).build());
        log.info("  Đã tạo 2 booking NEW");

        // --- Booking 9: CANCELLED ---
        Booking b9 = bookingRepository.save(Booking.builder()
                .guest(guests.get(8)).roomType(dlx)
                .checkInDate(LocalDate.now().plusDays(1)).checkOutDate(LocalDate.now().plusDays(3))
                .status(Booking.Status.CANCELLED).source(Booking.Source.WALK_IN)
                .expectedPrice(new BigDecimal("1600000")).createdBy(receptionist).build());
        invoiceRepository.save(Invoice.builder().booking(b9)
                .roomCharge(new BigDecimal("1600000")).serviceCharge(BigDecimal.ZERO)
                .discount(BigDecimal.ZERO).totalAmount(new BigDecimal("1600000"))
                .status(Invoice.Status.PENDING).build());

        // --- Booking 10: NO_SHOW ---
        bookingRepository.save(Booking.builder()
                .guest(guests.get(9)).roomType(std).room(r103)
                .checkInDate(LocalDate.now().minusDays(2)).checkOutDate(LocalDate.now().plusDays(1))
                .status(Booking.Status.NO_SHOW).source(Booking.Source.EXTERNAL_CHANNEL)
                .expectedPrice(new BigDecimal("1500000")).createdBy(receptionist).build());

        // --- Booking 11: CONFIRMED Family — đặt qua web ---
        bookingRepository.save(Booking.builder()
                .guest(guests.get(0)).roomType(fam).room(r304)
                .checkInDate(LocalDate.now().plusDays(14)).checkOutDate(LocalDate.now().plusDays(18))
                .status(Booking.Status.CONFIRMED).source(Booking.Source.BOOKING_PORTAL)
                .expectedPrice(new BigDecimal("8000000")).createdBy(receptionist).build());

        log.info("✓ 11 bookings với đầy đủ trạng thái (CHECKED_OUT/CHECKED_IN/CONFIRMED/NEW/CANCELLED/NO_SHOW)");
    }

    // ================================================================== HELPER
    private Room findRoom(List<Room> rooms, String number) {
        return rooms.stream().filter(r -> r.getRoomNumber().equals(number)).findFirst().orElse(null);
    }
}
