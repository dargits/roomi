package plant.stay.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.BackupService;
import plant.stay.util.HashUtil;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;
    private final ExtraServiceRepository extraServiceRepository;
    private final HotelSettingRepository hotelSettingRepository;
    private final DepositPolicyRepository depositPolicyRepository;
    private final CancellationPolicyRepository cancellationPolicyRepository;
    private final WeekendPriceConfigRepository weekendPriceConfigRepository;
    private final HolidayPriceRepository holidayPriceRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final LoyaltyTierRepository loyaltyTierRepository;
    private final NotificationRoleDefaultRepository notificationRoleDefaultRepository;
    private final CorporateClientRepository corporateClientRepository;
    private final NegotiatedPriceAgreementRepository negotiatedPriceAgreementRepository;
    private final ChannelRepository channelRepository;
    private final ChannelRoomMappingRepository channelRoomMappingRepository;
    private final GuestRepository guestRepository;
    private final BookingRepository bookingRepository;
    private final BookingServiceUsageRepository bookingServiceUsageRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final DepositRepository depositRepository;
    private final DailyLedgerRepository dailyLedgerRepository;
    private final CashierShiftRepository cashierShiftRepository;
    private final RoomCleaningRecordRepository roomCleaningRecordRepository;
    private final RoomIncidentRepository roomIncidentRepository;
    private final LostItemRepository lostItemRepository;
    private final StayDeclarationRepository stayDeclarationRepository;
    private final NotificationRepository notificationRepository;
    private final SystemBackupRepository systemBackupRepository;
    private final BackupService backupService;
    private final Environment environment;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        boolean seedEnabled = false;
        if (environment != null) {
            seedEnabled = Boolean.parseBoolean(environment.getProperty("app.seed.enabled", "false"));
        }
        if (!seedEnabled) {
            log.info("========== DATA SEEDER: Tự động khởi tạo dữ liệu mẫu đã bị VÔ HIỆU HÓA (app.seed.enabled=false). Bỏ qua quá trình thêm dữ liệu khi khởi động lại backend. ==========");
            return;
        }

        log.info("========== BẮT ĐẦU KIỂM TRA VÀ KHỞI TẠO DỮ LIỆU HỆ THỐNG STAY AWAY ==========");

        // 1. Seed Users
        List<User> seededUsers = seedUsers();
        User adminUser = seededUsers.stream().filter(u -> u.getRole() == Role.ADMIN).findFirst().orElse(null);
        User ownerUser = seededUsers.stream().filter(u -> u.getRole() == Role.OWNER).findFirst().orElse(null);
        User receptionistUser = seededUsers.stream().filter(u -> "letan".equals(u.getAccount())).findFirst().orElse(null);
        User receptionistUser2 = seededUsers.stream().filter(u -> "letan2".equals(u.getAccount())).findFirst().orElse(receptionistUser);
        User housekeeperUser = seededUsers.stream().filter(u -> "buongphong".equals(u.getAccount())).findFirst().orElse(null);
        User housekeeperUser2 = seededUsers.stream().filter(u -> "buongphong2".equals(u.getAccount())).findFirst().orElse(housekeeperUser);
        User accountantUser = seededUsers.stream().filter(u -> u.getRole() == Role.ACCOUNTANT).findFirst().orElse(null);

        // 2. Seed HotelSetting
        seedHotelSetting();

        // 3. Seed RoomTypes & Rooms
        Map<String, RoomType> roomTypeMap = seedRoomTypes();
        List<Room> allRooms = seedRooms(roomTypeMap);

        // 4. Seed ExtraServices
        List<ExtraService> extraServices = seedExtraServices();

        // 5. Seed InventoryItems
        seedInventoryItems();

        // 6. Seed LoyaltyTiers
        Map<String, LoyaltyTier> tierMap = seedLoyaltyTiers();

        // 7. Seed Policies & Pricing Configurations
        seedPolicies(roomTypeMap, ownerUser);

        // 8. Seed NotificationRoleDefaults
        seedNotificationRoleDefaults();

        // 9. Seed CorporateClients & NegotiatedPriceAgreements
        List<CorporateClient> corporateClients = seedCorporateClients(ownerUser);
        List<NegotiatedPriceAgreement> agreements = seedNegotiatedAgreements(corporateClients, ownerUser);

        // 10. Seed Channels & ChannelRoomMappings
        seedChannelsAndMappings(roomTypeMap, ownerUser);

        boolean isTest = false;
        if (environment != null) {
            String appName = environment.getProperty("spring.application.name");
            List<String> activeProfiles = Arrays.asList(environment.getActiveProfiles());
            if ("stay-test".equalsIgnoreCase(appName) || activeProfiles.contains("test")) {
                isTest = true;
            }
        }

        // 11. Seed Full Operational Data (Bookings, Usages, Invoices, Payments, Shifts, Ledgers, Cleanings, etc.)
        if (!isTest && bookingRepository.count() <= 3) {
            log.info("Phát hiện hệ thống chưa có dữ liệu vận hành đầy đủ. Bắt đầu khởi tạo dữ liệu hoạt động toàn diện (01/01/2026 - nay)...");
            
            // 11.1 Seed Guests
            List<Guest> seededGuests = seedGuests(tierMap);

            // 11.2 Seed Bookings, Invoices, Payments, Usages, Shifts, Cleanings, Incidents, Ledgers
            seedOperationalData(
                    seededUsers,
                    allRooms,
                    extraServices,
                    seededGuests,
                    agreements,
                    adminUser,
                    ownerUser,
                    receptionistUser,
                    receptionistUser2,
                    housekeeperUser,
                    housekeeperUser2
            );

            // 11.3 Tự động kích hoạt sao lưu ban đầu nếu chưa có bản backup nào
            try {
                if (systemBackupRepository.count() == 0 && adminUser != null) {
                    backupService.createBackup(adminUser, "DATABASE_SQL");
                    log.info("Đã tự động khởi tạo bản sao lưu hệ thống toàn diện ban đầu (.SQL).");
                }
            } catch (Exception e) {
                log.warn("Bỏ qua tự động tạo bản backup khởi đầu: {}", e.getMessage());
            }
        } else {
            log.info("Dữ liệu vận hành hệ thống đã sẵn sàng ({}/{} lượt đặt phòng). Bỏ qua bước nạp dữ liệu hoạt động.",
                    bookingRepository.count(), guestRepository.count());
        }

        log.info("========== HOÀN TẤT KHỞI TẠO DỮ LIỆU HỆ THỐNG STAY AWAY ==========");
    }

    private List<User> seedUsers() {
        String defaultPassword = HashUtil.hashPassword("pass@123");
        List<User> usersToSave = new ArrayList<>();

        if (userRepository.findByAccount("admin").isEmpty()) {
            usersToSave.add(User.builder()
                    .account("admin")
                    .name("Bàn Hữu Sự")
                    .password(defaultPassword)
                    .email("huusu@stayaway.vn")
                    .phone("0981111111")
                    .role(Role.ADMIN)
                    .active(true)
                    .build());
        }
        if (userRepository.findByAccount("chusohuu").isEmpty()) {
            usersToSave.add(User.builder()
                    .account("chusohuu")
                    .name("Trần Thị Mai")
                    .password(defaultPassword)
                    .email("mai.tran@stayaway.vn")
                    .phone("0982222222")
                    .role(Role.OWNER)
                    .active(true)
                    .build());
        }
        if (userRepository.findByAccount("letan").isEmpty()) {
            usersToSave.add(User.builder()
                    .account("letan")
                    .name("Lê Ngọc Hân")
                    .password(defaultPassword)
                    .email("han.le@stayaway.vn")
                    .phone("0983333333")
                    .role(Role.RECEPTIONIST)
                    .active(true)
                    .build());
        }
        if (userRepository.findByAccount("letan2").isEmpty()) {
            usersToSave.add(User.builder()
                    .account("letan2")
                    .name("Trần Hải Đăng")
                    .password(defaultPassword)
                    .email("dang.tran@stayaway.vn")
                    .phone("0987777777")
                    .role(Role.RECEPTIONIST)
                    .active(true)
                    .build());
        }
        if (userRepository.findByAccount("buongphong").isEmpty()) {
            usersToSave.add(User.builder()
                    .account("buongphong")
                    .name("Phạm Thị Yến")
                    .password(defaultPassword)
                    .email("yen.pham@stayaway.vn")
                    .phone("0984444444")
                    .role(Role.HOUSEKEEPER)
                    .active(true)
                    .build());
        }
        if (userRepository.findByAccount("buongphong2").isEmpty()) {
            usersToSave.add(User.builder()
                    .account("buongphong2")
                    .name("Nguyễn Văn Nam")
                    .password(defaultPassword)
                    .email("nam.nguyen@stayaway.vn")
                    .phone("0986666666")
                    .role(Role.HOUSEKEEPER)
                    .active(true)
                    .build());
        }
        if (userRepository.findByAccount("ketoan").isEmpty()) {
            usersToSave.add(User.builder()
                    .account("ketoan")
                    .name("Hoàng Minh Trí")
                    .password(defaultPassword)
                    .email("tri.hoang@stayaway.vn")
                    .phone("0985555555")
                    .role(Role.ACCOUNTANT)
                    .active(true)
                    .build());
        }

        if (!usersToSave.isEmpty()) {
            userRepository.saveAll(usersToSave);
            log.info("Đã tạo mới {} tài khoản người dùng mẫu.", usersToSave.size());
        }
        return userRepository.findAll();
    }

    private void seedHotelSetting() {
        if (hotelSettingRepository.count() == 0) {
            HotelSetting hotelSetting = HotelSetting.builder()
                    .propertyName("Stay Away Hotel & Resort")
                    .address("Z115, Phan Đình Phùng, Tp. Thái Nguyên, Tỉnh Thái Nguyên")
                    .phone("0365224245")
                    .email("lienhe@stayaway.vn")
                    .defaultCheckinTime(LocalTime.of(14, 0))
                    .defaultCheckoutTime(LocalTime.of(12, 0))
                    .homeImage("https://i.ibb.co/TxVT7pQz/images-11-jpg.jpg")
                    .reminderEmailEnabled(true)
                    .reminderMorningTime(LocalTime.of(10, 30))
                    .build();
            hotelSettingRepository.save(hotelSetting);
            log.info("Đã khởi tạo thông tin cơ sở khách sạn (HotelSetting).");
        }
    }

    private Map<String, RoomType> seedRoomTypes() {
        if (roomTypeRepository.count() == 0) {
            RoomType standard = RoomType.builder()
                    .name("Phòng Tiêu Chuẩn")
                    .maxCapacity(2)
                    .basePrice(new BigDecimal("500000"))
                    .amenitiesDescription("Tivi truyền hình cáp, Điều hòa 2 chiều, Bình nóng lạnh, Wifi tốc độ cao miễn phí, Bàn làm việc tiện lợi, Máy sấy tóc, Nước suối chào đón")
                    .active(true)
                    .imageUrls(List.of(
                            "https://i.ibb.co/1fxxj3ZK/images-3-jpg.jpg",
                            "https://i.ibb.co/s90VKFMW/images-2-jpg.jpg",
                            "https://i.ibb.co/YBZHpwFQ/images-1-jpg.jpg"
                    ))
                    .build();

            RoomType superior = RoomType.builder()
                    .name("Phòng Cao Cấp")
                    .maxCapacity(2)
                    .basePrice(new BigDecimal("700000"))
                    .amenitiesDescription("Tivi Smart 43 inch, Điều hòa Inverter, Nóng lạnh, Wifi miễn phí, Cửa sổ lớn đón ánh sáng tự nhiên, Tủ lạnh minibar, Trà & Cà phê miễn phí")
                    .active(true)
                    .imageUrls(List.of(
                            "https://i.ibb.co/jPHrYZ3x/images-6-jpg.jpg",
                            "https://i.ibb.co/1JtdT9mC/images-5-jpg.jpg",
                            "https://i.ibb.co/HDVrpwFY/images-4-jpg.jpg"
                    ))
                    .build();

            RoomType deluxe = RoomType.builder()
                    .name("Phòng Sang Trọng")
                    .maxCapacity(3)
                    .basePrice(new BigDecimal("1000000"))
                    .amenitiesDescription("Tivi 4K 55 inch, Điều hòa cao cấp, Nóng lạnh, Ban công riêng view thoáng mát, Tủ lạnh minibar, Bồn tắm nằm sang trọng, Sofa thư giãn")
                    .active(true)
                    .imageUrls(List.of(
                            "https://i.ibb.co/KjD3yg66/images-9-jpg.jpg",
                            "https://i.ibb.co/gMGYHYtQ/images-8-jpg.jpg",
                            "https://i.ibb.co/Zz4bVzmH/images-7-jpg.jpg"
                    ))
                    .build();

            RoomType suite = RoomType.builder()
                    .name("Phòng Tổng Thống")
                    .maxCapacity(4)
                    .basePrice(new BigDecimal("2000000"))
                    .amenitiesDescription("Phòng khách riêng biệt rộng rãi, Tivi 65 inch siêu nét, Điều hòa âm trần, Ban công panorama ngắm toàn cảnh, Tủ lạnh side-by-side, Bồn tắm massage thủy lực, Bộ bàn trà cao cấp")
                    .active(true)
                    .imageUrls(List.of(
                            "https://i.ibb.co/TxVT7pQz/images-11-jpg.jpg",
                            "https://i.ibb.co/gFZ7Fnv0/images-10-jpg.jpg",
                            "https://i.ibb.co/hR4wpr5f/phong-suite-la-gi-webp.webp"
                    ))
                    .build();

            roomTypeRepository.saveAll(List.of(standard, superior, deluxe, suite));
            log.info("Đã khởi tạo 4 Loại phòng tiêu chuẩn.");
        }

        Map<String, RoomType> map = new HashMap<>();
        for (RoomType rt : roomTypeRepository.findAll()) {
            map.put(rt.getName(), rt);
        }
        return map;
    }

    private List<Room> seedRooms(Map<String, RoomType> roomTypeMap) {
        if (roomRepository.count() == 0) {
            RoomType standard = roomTypeMap.get("Phòng Tiêu Chuẩn");
            RoomType superior = roomTypeMap.get("Phòng Cao Cấp");
            RoomType deluxe = roomTypeMap.get("Phòng Sang Trọng");
            RoomType suite = roomTypeMap.get("Phòng Tổng Thống");

            List<Room> rooms = new ArrayList<>();
            // Tầng 1: 5 phòng Tiêu chuẩn
            for (int i = 1; i <= 5; i++) {
                rooms.add(Room.builder().roomNumber("10" + i).floor("1").roomType(standard).status(RoomStatus.AVAILABLE).build());
            }
            // Tầng 2: 5 phòng Cao cấp
            for (int i = 1; i <= 5; i++) {
                rooms.add(Room.builder().roomNumber("20" + i).floor("2").roomType(superior).status(RoomStatus.AVAILABLE).build());
            }
            // Tầng 3: 3 phòng Sang trọng
            for (int i = 1; i <= 3; i++) {
                rooms.add(Room.builder().roomNumber("30" + i).floor("3").roomType(deluxe).status(RoomStatus.AVAILABLE).build());
            }
            // Tầng 4: 2 phòng Tổng thống
            for (int i = 1; i <= 2; i++) {
                rooms.add(Room.builder().roomNumber("40" + i).floor("4").roomType(suite).status(RoomStatus.AVAILABLE).build());
            }
            roomRepository.saveAll(rooms);
            log.info("Đã khởi tạo 15 phòng trải khắp 4 tầng.");
        }
        return roomRepository.findAll();
    }

    private List<ExtraService> seedExtraServices() {
        if (extraServiceRepository.count() < 15) {
            List<ExtraService> current = extraServiceRepository.findAll();
            Set<String> existingNames = new HashSet<>();
            for (ExtraService s : current) {
                existingNames.add(s.getName());
            }

            List<ExtraService> newServices = new ArrayList<>();
            Object[][] serviceDefs = {
                    {"Ăn sáng buffet", "Buffet sáng đa dạng ẩm thực truyền thống Việt Nam và Á - Âu", "150000", "lượt"},
                    {"Đưa đón sân bay Nội Bài", "Xe ô tô 4 chỗ hoặc 7 chỗ đời mới đưa đón tận nơi chu đáo", "300000", "chuyến"},
                    {"Giặt là tiêu chuẩn", "Giặt sấy, là ủi quần áo nhanh chóng và thơm tho trong ngày", "50000", "kg"},
                    {"Giặt hấp cao cấp", "Giặt hấp chuyên dụng cho comple, áo vest, đầm dạ hội cao cấp", "120000", "bộ"},
                    {"Kê thêm giường phụ", "Kê thêm giường đơn êm ái kèm trọn bộ chăn ga gối đệm cao cấp", "200000", "giường/đêm"},
                    {"Thuê xe máy tay ga", "Xe Honda AirBlade / Vision đời mới kèm 2 mũ bảo hiểm đạt chuẩn", "150000", "ngày"},
                    {"Thuê xe máy số", "Xe Honda Wave Alpha tiết kiệm xăng, phụ tùng bảo dưỡng định kỳ", "120000", "ngày"},
                    {"Dịch vụ Spa thảo dược thư giãn", "Liệu trình massage body thảo dược toàn thân 60 phút", "350000", "suất"},
                    {"Massage chân bấm huyệt", "Ngâm chân thảo dược thuốc Bắc và bấm huyệt lưu thông khí huyết 45 phút", "200000", "suất"},
                    {"Set trà chiều thượng hạng", "Bánh ngọt kiểu Pháp, mứt hoa quả và ấm trà Earl Grey / hoa cúc", "180000", "set"},
                    {"Rượu vang đỏ Đà Lạt nguyên chai", "Vang đỏ thượng hạng hảo hạng ướp lạnh sẵn sàng phục vụ tại phòng", "350000", "chai"},
                    {"Đĩa hoa quả tươi chào mừng", "Các loại trái cây nhiệt đới tươi ngon theo mùa cắt tỉa nghệ thuật", "100000", "đĩa"},
                    {"Nước suối khoáng thêm", "Nước khoáng thiên nhiên đóng chai Lavie 500ml", "20000", "chai"},
                    {"Nước ngọt lon các loại", "Coca-Cola, Pepsi, 7Up, Red Bull ướp lạnh trong minibar", "25000", "lon"},
                    {"Thuê phòng họp hội nghị mini", "Phòng họp sức chứa 15 người trang bị máy chiếu, bảng viết và âm thanh", "1500000", "buổi"}
            };

            for (Object[] def : serviceDefs) {
                String name = (String) def[0];
                if (!existingNames.contains(name)) {
                    newServices.add(ExtraService.builder()
                            .name(name)
                            .description((String) def[1])
                            .unitPrice(new BigDecimal((String) def[2]))
                            .unit((String) def[3])
                            .active(true)
                            .build());
                }
            }

            if (!newServices.isEmpty()) {
                extraServiceRepository.saveAll(newServices);
                log.info("Đã bổ sung {} dịch vụ phụ thu phong phú mới.", newServices.size());
            }
        }
        return extraServiceRepository.findAll();
    }

    private void seedInventoryItems() {
        if (inventoryItemRepository.count() == 0) {
            List<InventoryItem> items = List.of(
                    InventoryItem.builder().name("Khăn tắm lớn 70x140cm").unit("chiếc").quantityOnHand(120).lowStockThreshold(30).build(),
                    InventoryItem.builder().name("Khăn mặt cotton 34x70cm").unit("chiếc").quantityOnHand(150).lowStockThreshold(40).build(),
                    InventoryItem.builder().name("Bộ bàn chải & kem đánh răng").unit("bộ").quantityOnHand(300).lowStockThreshold(50).build(),
                    InventoryItem.builder().name("Dầu gội & Sữa tắm mini 40ml").unit("chai").quantityOnHand(400).lowStockThreshold(80).build(),
                    InventoryItem.builder().name("Nước suối miễn phí 350ml").unit("chai").quantityOnHand(500).lowStockThreshold(100).build(),
                    InventoryItem.builder().name("Dép đi trong phòng ngủ").unit("đôi").quantityOnHand(200).lowStockThreshold(40).build(),
                    InventoryItem.builder().name("Trà túi lọc & Cà phê hòa tan").unit("gói").quantityOnHand(600).lowStockThreshold(120).build(),
                    InventoryItem.builder().name("Bọc nệm & Ga trải giường cao cấp").unit("bộ").quantityOnHand(80).lowStockThreshold(20).build()
            );
            inventoryItemRepository.saveAll(items);
            log.info("Đã tạo kho hàng đồ dùng buồng phòng (InventoryItem).");
        }
    }

    private Map<String, LoyaltyTier> seedLoyaltyTiers() {
        if (loyaltyTierRepository.count() == 0) {
            List<LoyaltyTier> tiers = List.of(
                    LoyaltyTier.builder()
                            .name("Thành viên Đồng")
                            .minPoints(0)
                            .benefitDescription("Tích lũy điểm thưởng theo mỗi đêm nghỉ, nhận bản tin ưu đãi sớm.")
                            .build(),
                    LoyaltyTier.builder()
                            .name("Hội viên Bạc")
                            .minPoints(500)
                            .benefitDescription("Giảm 5% trên giá phòng tiêu chuẩn, ưu tiên hỗ trợ nhận phòng sớm nếu có sẵn phòng.")
                            .build(),
                    LoyaltyTier.builder()
                            .name("Hội viên Vàng")
                            .minPoints(1500)
                            .benefitDescription("Giảm 10% giá phòng, miễn phí 1 dịch vụ giặt là hoặc 1 lượt ăn sáng buffet cho mỗi lần lưu trú.")
                            .build(),
                    LoyaltyTier.builder()
                            .name("Hội viên Kim Cương")
                            .minPoints(3500)
                            .benefitDescription("Giảm 15% giá phòng, miễn phí nâng hạng phòng (khi có phòng trống), nhận phòng sớm từ 10:00 & trả phòng trễ đến 14:00.")
                            .build()
            );
            loyaltyTierRepository.saveAll(tiers);
            log.info("Đã khởi tạo 4 Hạng hội viên thân thiết (LoyaltyTier).");
        }
        Map<String, LoyaltyTier> tierMap = new HashMap<>();
        for (LoyaltyTier lt : loyaltyTierRepository.findAll()) {
            tierMap.put(lt.getName(), lt);
        }
        return tierMap;
    }

    private void seedPolicies(Map<String, RoomType> roomTypeMap, User ownerUser) {
        if (depositPolicyRepository.count() == 0) {
            DepositPolicy defaultPolicy = DepositPolicy.builder()
                    .roomType(null)
                    .depositPercent(new BigDecimal("30.00"))
                    .active(true)
                    .updatedBy(ownerUser)
                    .build();
            depositPolicyRepository.save(defaultPolicy);
            log.info("Đã thiết lập Chính sách đặt cọc mặc định (30%).");
        }

        if (cancellationPolicyRepository.count() == 0) {
            CancellationPolicy defaultCancel = CancellationPolicy.builder()
                    .roomType(null)
                    .freeCancelHours(24)
                    .penaltyPercent(new BigDecimal("50.00"))
                    .build();
            cancellationPolicyRepository.save(defaultCancel);
            log.info("Đã thiết lập Chính sách hủy phòng mặc định (hủy trước 24h miễn phí, sau đó phạt 50%).");
        }

        if (weekendPriceConfigRepository.count() == 0) {
            RoomType superior = roomTypeMap.get("Phòng Cao Cấp");
            RoomType deluxe = roomTypeMap.get("Phòng Sang Trọng");
            RoomType suite = roomTypeMap.get("Phòng Tổng Thống");

            List<WeekendPriceConfig> weekendConfigs = new ArrayList<>();
            if (superior != null) {
                weekendConfigs.add(WeekendPriceConfig.builder()
                        .roomType(superior)
                        .weekendDays("FRIDAY,SATURDAY,SUNDAY")
                        .pricePerNight(new BigDecimal("750000"))
                        .active(true)
                        .build());
            }
            if (deluxe != null) {
                weekendConfigs.add(WeekendPriceConfig.builder()
                        .roomType(deluxe)
                        .weekendDays("FRIDAY,SATURDAY,SUNDAY")
                        .pricePerNight(new BigDecimal("1150000"))
                        .active(true)
                        .build());
            }
            if (suite != null) {
                weekendConfigs.add(WeekendPriceConfig.builder()
                        .roomType(suite)
                        .weekendDays("FRIDAY,SATURDAY,SUNDAY")
                        .pricePerNight(new BigDecimal("2300000"))
                        .active(true)
                        .build());
            }
            weekendPriceConfigRepository.saveAll(weekendConfigs);
            log.info("Đã thiết lập Bảng giá cuối tuần (WeekendPriceConfig).");
        }

        if (holidayPriceRepository.count() == 0) {
            RoomType standard = roomTypeMap.get("Phòng Tiêu Chuẩn");
            RoomType superior = roomTypeMap.get("Phòng Cao Cấp");
            RoomType deluxe = roomTypeMap.get("Phòng Sang Trọng");
            RoomType suite = roomTypeMap.get("Phòng Tổng Thống");

            List<HolidayPrice> holidayPrices = new ArrayList<>();
            Object[][] holidays = {
                    {"Tết Dương Lịch 2026", LocalDate.of(2026, 1, 1)},
                    {"Ngày Giải phóng miền Nam 30/4", LocalDate.of(2026, 4, 30)},
                    {"Quốc tế Lao động 1/5", LocalDate.of(2026, 5, 1)},
                    {"Quốc khánh Việt Nam 2/9", LocalDate.of(2026, 9, 2)}
            };

            for (Object[] h : holidays) {
                String name = (String) h[0];
                LocalDate date = (LocalDate) h[1];
                if (standard != null) holidayPrices.add(HolidayPrice.builder().holidayName(name).holidayDate(date).roomType(standard).pricePerNight(new BigDecimal("600000")).active(true).build());
                if (superior != null) holidayPrices.add(HolidayPrice.builder().holidayName(name).holidayDate(date).roomType(superior).pricePerNight(new BigDecimal("850000")).active(true).build());
                if (deluxe != null) holidayPrices.add(HolidayPrice.builder().holidayName(name).holidayDate(date).roomType(deluxe).pricePerNight(new BigDecimal("1250000")).active(true).build());
                if (suite != null) holidayPrices.add(HolidayPrice.builder().holidayName(name).holidayDate(date).roomType(suite).pricePerNight(new BigDecimal("2500000")).active(true).build());
            }
            holidayPriceRepository.saveAll(holidayPrices);
            log.info("Đã khởi tạo Bảng giá các ngày lễ lớn trong năm 2026.");
        }
    }

    private void seedNotificationRoleDefaults() {
        List<NotificationRoleDefault> newRoleDefaults = new ArrayList<>();
        for (NotificationType type : NotificationType.values()) {
            for (Role role : type.getDefaultRoles()) {
                if (!notificationRoleDefaultRepository.existsByTypeAndRole(type, role)) {
                    newRoleDefaults.add(NotificationRoleDefault.builder()
                            .type(type)
                            .role(role)
                            .isMandatory(type.isMandatory())
                            .build());
                }
            }
        }
        if (!newRoleDefaults.isEmpty()) {
            notificationRoleDefaultRepository.saveAll(newRoleDefaults);
            log.info("Đã cập nhật {} quy tắc thông báo mặc định theo vai trò.", newRoleDefaults.size());
        }
    }

    private List<CorporateClient> seedCorporateClients(User ownerUser) {
        if (corporateClientRepository.count() == 0) {
            List<CorporateClient> clients = List.of(
                    CorporateClient.builder()
                            .companyName("Công ty Cổ phần Công nghệ FPT")
                            .taxCode("0101248141")
                            .contactPerson("Nguyễn Văn Hùng")
                            .contactPhone("02473007300")
                            .contactEmail("contact@fpt.com.vn")
                            .address("Tòa nhà FPT, Phố Duy Tân, Cầu Giấy, Hà Nội")
                            .note("Đối tác doanh nghiệp chiến lược mảng công nghệ và phần mềm")
                            .active(true)
                            .createdBy(ownerUser)
                            .build(),
                    CorporateClient.builder()
                            .companyName("Tập đoàn Viễn thông Quân đội Viettel")
                            .taxCode("0100109106")
                            .contactPerson("Trần Anh Tuấn")
                            .contactPhone("02462556789")
                            .contactEmail("contact@viettel.com.vn")
                            .address("Lô D26 Khu đô thị mới Cầu Giấy, Hà Nội")
                            .note("Hợp đồng đoàn công tác thường xuyên tại Thái Nguyên")
                            .active(true)
                            .createdBy(ownerUser)
                            .build(),
                    CorporateClient.builder()
                            .companyName("Công ty TNHH Samsung Electronics VN Thái Nguyên")
                            .taxCode("4601116670")
                            .contactPerson("Lê Minh Trí")
                            .contactPhone("02083567890")
                            .contactEmail("sevt@samsung.com")
                            .address("KCN Yên Bình, Phổ Yên, Thái Nguyên")
                            .note("Khách chuyên gia và đoàn cán bộ quản lý cấp cao")
                            .active(true)
                            .createdBy(ownerUser)
                            .build(),
                    CorporateClient.builder()
                            .companyName("Công ty CP Dịch vụ Du lịch Saigontourist")
                            .taxCode("0300625210")
                            .contactPerson("Võ Hoàng Yến")
                            .contactPhone("02838279279")
                            .contactEmail("info@saigontourist.com.vn")
                            .address("45 Lê Thánh Tôn, Quận 1, TP. Hồ Chí Minh")
                            .note("Đơn vị đối tác lữ hành và tour nội địa miền Bắc")
                            .active(true)
                            .createdBy(ownerUser)
                            .build(),
                    CorporateClient.builder()
                            .companyName("Tập đoàn Vingroup")
                            .taxCode("0101245486")
                            .contactPerson("Phạm Hải Long")
                            .contactPhone("02439749999")
                            .contactEmail("contact@vingroup.net")
                            .address("Số 7 Đường Bằng Lăng 1, KĐT Vinhomes Riverside, Long Biên, Hà Nội")
                            .note("Hợp tác nghỉ dưỡng và sự kiện doanh nghiệp")
                            .active(true)
                            .createdBy(ownerUser)
                            .build(),
                    CorporateClient.builder()
                            .companyName("Ngân hàng TMCP Ngoại thương Việt Nam - Vietcombank")
                            .taxCode("0100112437")
                            .contactPerson("Đỗ Thị Quỳnh")
                            .contactPhone("02439343137")
                            .contactEmail("contact@vietcombank.com.vn")
                            .address("198 Trần Quang Khải, Hoàn Kiếm, Hà Nội")
                            .note("Khách đoàn chi nhánh Vietcombank Thái Nguyên & Hội sở")
                            .active(true)
                            .createdBy(ownerUser)
                            .build(),
                    CorporateClient.builder()
                            .companyName("Ngân hàng TMCP Đầu tư và Phát triển VN - BIDV")
                            .taxCode("0100150619")
                            .contactPerson("Bùi Thanh Sơn")
                            .contactPhone("02422200588")
                            .contactEmail("bidv@bidv.com.vn")
                            .address("Tháp BIDV, 194 Trần Quang Khải, Hoàn Kiếm, Hà Nội")
                            .note("Đối tác tài chính và dịch vụ thanh toán liên kết")
                            .active(true)
                            .createdBy(ownerUser)
                            .build()
            );
            corporateClientRepository.saveAll(clients);
            log.info("Đã khởi tạo 7 Khách hàng Doanh nghiệp (CorporateClient).");
        }
        return corporateClientRepository.findAll();
    }

    private List<NegotiatedPriceAgreement> seedNegotiatedAgreements(List<CorporateClient> clients, User ownerUser) {
        if (negotiatedPriceAgreementRepository.count() == 0 && !clients.isEmpty()) {
            List<NegotiatedPriceAgreement> agreements = new ArrayList<>();
            LocalDate startDate = LocalDate.of(2026, 1, 1);
            LocalDate endDate = LocalDate.of(2026, 12, 31);

            for (CorporateClient client : clients) {
                BigDecimal price = new BigDecimal("600000");
                if (client.getCompanyName().contains("Viettel")) {
                    price = new BigDecimal("450000");
                } else if (client.getCompanyName().contains("Vingroup")) {
                    price = new BigDecimal("800000");
                } else if (client.getCompanyName().contains("Saigontourist")) {
                    price = new BigDecimal("550000");
                }

                agreements.add(NegotiatedPriceAgreement.builder()
                        .name("Thỏa thuận giá ưu đãi 2026 - " + client.getCompanyName())
                        .corporateClient(client)
                        .pricePerNight(price)
                        .startDate(startDate)
                        .endDate(endDate)
                        .active(true)
                        .note("Áp dụng đồng giá cho cán bộ nhân viên và đoàn công tác có giấy giới thiệu")
                        .createdBy(ownerUser)
                        .build());
            }
            negotiatedPriceAgreementRepository.saveAll(agreements);
            log.info("Đã tạo 7 Hợp đồng giá thỏa thuận doanh nghiệp (NegotiatedPriceAgreement).");
        }
        return negotiatedPriceAgreementRepository.findAll();
    }

    private void seedChannelsAndMappings(Map<String, RoomType> roomTypeMap, User ownerUser) {
        if (channelRepository.count() == 0) {
            Channel bookingCom = Channel.builder()
                    .name("Booking.com Channel")
                    .channelCode("BOOKING_COM")
                    .feedToken("f7a8b9c0d1e2-bkg")
                    .externalCalendarUrl("https://admin.booking.com/ical/stayaway-calendar.ics")
                    .allocatedRooms(4)
                    .syncIntervalMinutes(15)
                    .isActive(true)
                    .lastSyncStatus("SUCCESS")
                    .lastSuccessSyncedAt(LocalDateTime.now().minusMinutes(12))
                    .lastSyncedAt(LocalDateTime.now().minusMinutes(12))
                    .createdBy(ownerUser)
                    .build();

            Channel agoda = Channel.builder()
                    .name("Agoda YCS Channel")
                    .channelCode("AGODA")
                    .feedToken("e2d3c4b5a6f7-ago")
                    .externalCalendarUrl("https://ycs.agoda.com/ical/stayaway-calendar.ics")
                    .allocatedRooms(4)
                    .syncIntervalMinutes(15)
                    .isActive(true)
                    .lastSyncStatus("SUCCESS")
                    .lastSuccessSyncedAt(LocalDateTime.now().minusMinutes(18))
                    .lastSyncedAt(LocalDateTime.now().minusMinutes(18))
                    .createdBy(ownerUser)
                    .build();

            Channel traveloka = Channel.builder()
                    .name("Traveloka TERA Channel")
                    .channelCode("TRAVELOKA")
                    .feedToken("b1a2c3d4e5f6-tvl")
                    .externalCalendarUrl("https://tera.traveloka.com/ical/stayaway-calendar.ics")
                    .allocatedRooms(4)
                    .syncIntervalMinutes(15)
                    .isActive(true)
                    .lastSyncStatus("SUCCESS")
                    .lastSuccessSyncedAt(LocalDateTime.now().minusMinutes(25))
                    .lastSyncedAt(LocalDateTime.now().minusMinutes(25))
                    .createdBy(ownerUser)
                    .build();

            Channel airbnb = Channel.builder()
                    .name("Airbnb Sync Channel")
                    .channelCode("AIRBNB")
                    .feedToken("a1b2c3d4e5f6-abn")
                    .externalCalendarUrl("https://www.airbnb.com/calendar/ical/stayaway.ics")
                    .allocatedRooms(4)
                    .syncIntervalMinutes(15)
                    .isActive(true)
                    .lastSyncStatus("SUCCESS")
                    .lastSuccessSyncedAt(LocalDateTime.now().minusMinutes(30))
                    .lastSyncedAt(LocalDateTime.now().minusMinutes(30))
                    .createdBy(ownerUser)
                    .build();

            List<Channel> channels = channelRepository.saveAll(List.of(bookingCom, agoda, traveloka, airbnb));

            // Liên kết ánh xạ loại phòng (ChannelRoomMapping)
            List<ChannelRoomMapping> mappings = new ArrayList<>();
            RoomType standard = roomTypeMap.get("Phòng Tiêu Chuẩn");
            RoomType superior = roomTypeMap.get("Phòng Cao Cấp");
            RoomType deluxe = roomTypeMap.get("Phòng Sang Trọng");
            RoomType suite = roomTypeMap.get("Phòng Tổng Thống");

            for (Channel c : channels) {
                if (standard != null) mappings.add(ChannelRoomMapping.builder().channel(c).roomType(standard).externalRoomTypeCode("STD_ROOM").allocatedRooms(2).build());
                if (superior != null) mappings.add(ChannelRoomMapping.builder().channel(c).roomType(superior).externalRoomTypeCode("SUP_ROOM").allocatedRooms(2).build());
                if (deluxe != null) mappings.add(ChannelRoomMapping.builder().channel(c).roomType(deluxe).externalRoomTypeCode("DLX_ROOM").allocatedRooms(1).build());
                if (suite != null) mappings.add(ChannelRoomMapping.builder().channel(c).roomType(suite).externalRoomTypeCode("SUI_ROOM").allocatedRooms(1).build());
            }
            channelRoomMappingRepository.saveAll(mappings);
            log.info("Đã cấu hình 4 Kênh phân phối OTA lớn và 16 ánh xạ phòng (ChannelRoomMapping).");
        }
    }

    private List<Guest> seedGuests(Map<String, LoyaltyTier> tierMap) {
        if (guestRepository.count() >= 75) {
            return guestRepository.findAll();
        }

        LoyaltyTier diamondTier = tierMap.get("Hội viên Kim Cương");
        LoyaltyTier goldTier = tierMap.get("Hội viên Vàng");
        LoyaltyTier silverTier = tierMap.get("Hội viên Bạc");
        LoyaltyTier bronzeTier = tierMap.get("Thành viên Đồng");

        String[] guestNames = {
                "Nguyễn Văn An", "Trần Thị Lan", "Lê Hoàng Nam", "Phạm Minh Quang", "Vũ Thị Hồng Nhung",
                "Hoàng Văn Tuấn", "Bùi Thị Mai", "Đặng Quốc Huy", "Ngô Thanh Hằng", "Dương Văn Đức",
                "Lý Thị Cẩm Tú", "Trịnh Đình Khang", "Đỗ Bích Phượng", "Mai Văn Cường", "Hồ Thị Tuyết",
                "Phan Văn Hậu", "Cao Thị Thùy", "Lương Quốc Bảo", "Tạ Thị Thanh", "Võ Minh Quân",
                "Đinh Hoàng Yến", "Chu Văn Thắng", "Lâm Thị Diệu", "Hà Quốc Tuấn", "Đoàn Thị Hương",
                "Diệp Văn Long", "Nông Thị Nga", "Vi Văn Sơn", "Quách Thị Kiều", "Mã Văn Hiếu",
                "Trần Đình Trọng", "Nguyễn Hải Yến", "Phạm Quang Dũng", "Lê Thu Trang", "Hoàng Nhật Minh",
                "Vũ Thị Ánh Tuyết", "Đào Văn Hùng", "Nguyễn Thùy Linh", "Bùi Anh Khoa", "Đặng Mỹ Duyên",
                "Ngô Gia Huy", "Trịnh Thùy Trang", "Dương Hoàng Nam", "Lý Minh Triết", "Mai Phương Thảo",
                "Hồ Quốc Việt", "Cao Minh Khôi", "Phan Bích Ngọc", "Lương Khánh Vân", "Đinh Trọng Nhân",
                "Võ Hoài Nam", "Chu Diệu Linh", "Hà Trọng Nghĩa", "Tạ Minh Trang", "Đoàn Văn Hậu",
                "Đỗ Mỹ Linh", "Nguyễn Quang Hải", "Trần Đình Hoàng", "Lê Thanh Thảo", "Phạm Tuấn Anh",
                "Vũ Ngọc Anh", "Hoàng Thùy Linh", "Bùi Tiến Dũng", "Đặng Văn Lâm", "Ngô Kiến Huy",
                "Trịnh Thăng Bình", "Dương Triệu Vũ", "Lý Nhã Kỳ", "Mai Phương Thúy", "Hồ Ngọc Hà",
                "Phan Mạnh Quỳnh", "Cao Thái Sơn", "Lương Bích Hữu", "Đinh Hương", "Võ Hoàng Yến"
        };

        List<Guest> guestsToSave = new ArrayList<>();
        for (int i = 0; i < guestNames.length; i++) {
            String name = guestNames[i];
            String phone = String.format("09%08d", (10000000 + (long) i * 111317) % 89999999 + 10000000);
            String email = "khach" + (i + 1) + "@gmail.com";
            String cccd = String.format("001200%06d", 1000 + i);

            int points;
            LoyaltyTier tier;
            if (i < 10) {
                points = 3600 + i * 150;
                tier = diamondTier;
            } else if (i < 25) {
                points = 1600 + (i - 10) * 120;
                tier = goldTier;
            } else if (i < 50) {
                points = 550 + (i - 25) * 35;
                tier = silverTier;
            } else {
                points = 50 + (i - 50) * 15;
                tier = bronzeTier;
            }

            guestsToSave.add(Guest.builder()
                    .name(name)
                    .phone(phone)
                    .email(email)
                    .idNumber(cccd)
                    .loyaltyPoints(points)
                    .loyaltyTier(tier)
                    .build());
        }

        List<Guest> saved = guestRepository.saveAll(guestsToSave);
        log.info("Đã khởi tạo thành công {} khách hàng với đầy đủ thông tin định danh và hạng hội viên.", saved.size());
        return saved;
    }

    private void seedOperationalData(
            List<User> users,
            List<Room> allRooms,
            List<ExtraService> services,
            List<Guest> guests,
            List<NegotiatedPriceAgreement> agreements,
            User adminUser,
            User ownerUser,
            User receptionistUser,
            User receptionistUser2,
            User housekeeperUser,
            User housekeeperUser2
    ) {
        LocalDate today = LocalDate.now();
        LocalDate startDate = LocalDate.of(2026, 1, 2);

        List<Booking> bookingsToSave = new ArrayList<>();
        List<BookingServiceUsage> usagesToSave = new ArrayList<>();
        List<Invoice> invoicesToSave = new ArrayList<>();
        List<Payment> paymentsToSave = new ArrayList<>();
        List<Deposit> depositsToSave = new ArrayList<>();
        List<StayDeclaration> declarationsToSave = new ArrayList<>();
        List<RoomCleaningRecord> cleaningsToSave = new ArrayList<>();

        String[] sources = {"WALKIN", "ONLINE", "BOOKING_COM", "AGODA", "TRAVELOKA", "AIRBNB"};
        int guestIndex = 0;
        int agreementIndex = 0;

        // Tập hợp các phòng đặc biệt cho ngày hôm nay:
        // Đang lưu trú hôm nay (CHECKED_IN): 101, 102, 201, 203, 301
        Set<String> inHouseRoomNumbers = Set.of("101", "102", "201", "203", "301");
        // Đang chờ nhận phòng hôm nay/ngày mai (CONFIRMED): 104, 204, 302, 401
        Set<String> upcomingRoomNumbers = Set.of("104", "204", "302", "401");

        // 1. Sinh chuỗi lịch sử lưu trú cho từng phòng từ tháng 1 đến tháng 9
        for (int rIdx = 0; rIdx < allRooms.size(); rIdx++) {
            Room room = allRooms.get(rIdx);
            RoomType roomType = room.getRoomType();
            String rNum = room.getRoomNumber();

            // Khởi đầu lệch ngày giữa các phòng để doanh thu và mật độ phân bố tự nhiên
            LocalDate currDate = startDate.plusDays(rIdx % 4);

            while (currDate.isBefore(today.minusDays(3))) {
                int stayDays = 1 + ((rIdx + currDate.getDayOfMonth()) % 3); // 1, 2, hoặc 3 đêm
                LocalDate checkIn = currDate;
                LocalDate checkOut = currDate.plusDays(stayDays);

                if (checkOut.isAfter(today.minusDays(2))) {
                    break;
                }

                Guest guest = guests.get(guestIndex % guests.size());
                guestIndex++;

                String source = sources[(rIdx + currDate.getMonthValue()) % sources.length];
                boolean isCorporate = (guestIndex % 7 == 0) && !agreements.isEmpty();
                NegotiatedPriceAgreement agreement = isCorporate ? agreements.get(agreementIndex++ % agreements.size()) : null;

                BigDecimal nightPrice = isCorporate ? agreement.getPricePerNight() : roomType.getBasePrice();
                BigDecimal roomAmount = nightPrice.multiply(BigDecimal.valueOf(stayDays));

                LocalDateTime checkedInAt = checkIn.atTime(14, 0).plusMinutes((rIdx * 17) % 180);
                LocalDateTime checkedOutAt = checkOut.atTime(11, 30).plusMinutes((rIdx * 13) % 60);

                // Thi thoảng có 1 booking hủy (khoảng 3% tổng số)
                boolean isCancelled = (rIdx % 5 == 0 && currDate.getDayOfMonth() == 13);

                Booking booking = Booking.builder()
                        .guest(guest)
                        .room(room)
                        .roomType(roomType)
                        .checkInDate(checkIn)
                        .checkOutDate(checkOut)
                        .checkedInAt(isCancelled ? null : checkedInAt)
                        .checkedOutAt(isCancelled ? null : checkedOutAt)
                        .status(isCancelled ? BookingStatus.CANCELLED : BookingStatus.CHECKED_OUT)
                        .expectedPrice(roomAmount)
                        .actualPrice(isCancelled ? BigDecimal.ZERO : roomAmount)
                        .cancellationFee(isCancelled ? roomAmount.multiply(new BigDecimal("0.50")) : BigDecimal.ZERO)
                        .source(source)
                        .appliedAgreement(agreement)
                        .priceSource(isCorporate ? "NEGOTIATED" : "STANDARD")
                        .createdBy(receptionistUser)
                        .note(isCancelled ? "Khách báo bận việc đột xuất xin hủy" : "Khách lưu trú hài lòng, dịch vụ tốt")
                        .build();

                bookingsToSave.add(booking);

                // Dịch vụ phụ thu & Hóa đơn cho booking đã check-out
                if (!isCancelled) {
                    BigDecimal serviceAmount = BigDecimal.ZERO;

                    // 65% booking có sử dụng dịch vụ phụ thu
                    if ((guestIndex % 3) != 0 && !services.isEmpty()) {
                        ExtraService s1 = services.get((guestIndex + rIdx) % services.size());
                        int qty = 1 + (rIdx % 2);
                        usagesToSave.add(BookingServiceUsage.builder()
                                .booking(booking)
                                .extraService(s1)
                                .quantity(qty)
                                .unitPriceSnapshot(s1.getUnitPrice())
                                .note(s1.getName())
                                .isSystemMandatory(false)
                                .build());
                        serviceAmount = serviceAmount.add(s1.getUnitPrice().multiply(BigDecimal.valueOf(qty)));

                        // Thêm 1 dịch vụ nữa (ăn sáng hoặc nước uống) nếu ở trên 2 đêm
                        if (stayDays >= 2) {
                            ExtraService s2 = services.get(0); // Ăn sáng buffet
                            usagesToSave.add(BookingServiceUsage.builder()
                                    .booking(booking)
                                    .extraService(s2)
                                    .quantity(stayDays)
                                    .unitPriceSnapshot(s2.getUnitPrice())
                                    .note("Buffet sáng theo số đêm")
                                    .isSystemMandatory(false)
                                    .build());
                            serviceAmount = serviceAmount.add(s2.getUnitPrice().multiply(BigDecimal.valueOf(stayDays)));
                        }
                    }

                    BigDecimal totalInvoice = roomAmount.add(serviceAmount);

                    Invoice invoice = Invoice.builder()
                            .booking(booking)
                            .mode(InvoiceMode.SINGLE)
                            .roomAmount(roomAmount)
                            .serviceAmount(serviceAmount)
                            .discountAmount(BigDecimal.ZERO)
                            .totalAmount(totalInvoice)
                            .status(InvoiceStatus.PAID)
                            .createdBy(receptionistUser)
                            .note("Đã hoàn tất thanh toán khi trả phòng")
                            .build();
                    invoicesToSave.add(invoice);

                    // Phương thức thanh toán: 35% Tiền mặt, 55% Chuyển khoản, 10% Thẻ
                    PaymentMethod payMethod = PaymentMethod.TRANSFER;
                    int pMod = (guestIndex + currDate.getDayOfMonth()) % 10;
                    if (pMod < 4) payMethod = PaymentMethod.CASH;
                    else if (pMod == 9) payMethod = PaymentMethod.CREDIT_CARD;

                    Payment payment = Payment.builder()
                            .invoice(invoice)
                            .amount(totalInvoice)
                            .method(payMethod)
                            .paidAt(checkedOutAt)
                            .collectedBy(receptionistUser)
                            .note("Thu tiền phòng & dịch vụ lượt lưu trú")
                            .build();
                    paymentsToSave.add(payment);

                    // Tiền đặt cọc trước (áp dụng cho ~40% khách)
                    if (guestIndex % 2 == 0) {
                        BigDecimal depAmt = roomAmount.multiply(new BigDecimal("0.30")).setScale(0, RoundingMode.HALF_UP);
                        depositsToSave.add(Deposit.builder()
                                .booking(booking)
                                .requiredAmount(depAmt)
                                .collectedAmount(depAmt)
                                .status(DepositStatus.COLLECTED)
                                .paymentMethod(PaymentMethod.TRANSFER)
                                .collectedBy(receptionistUser)
                                .collectedAt(checkIn.minusDays(1).atTime(10, 0))
                                .note("Đặt cọc trước giữ phòng 30%")
                                .build());
                    }

                    // Khai báo tạm trú
                    declarationsToSave.add(StayDeclaration.builder()
                            .booking(booking)
                            .status(StayDeclarationStatus.COMPLETED)
                            .completedBy(receptionistUser)
                            .completedAt(checkedInAt.plusHours(1))
                            .build());

                    // Nhật ký dọn buồng phòng sau check-out
                    cleaningsToSave.add(RoomCleaningRecord.builder()
                            .room(room)
                            .roomType(roomType)
                            .housekeeper(rIdx % 2 == 0 ? housekeeperUser : housekeeperUser2)
                            .cleaningType("CHECKOUT")
                            .startedAt(checkOut.atTime(12, 10))
                            .completedAt(checkOut.atTime(12, 45))
                            .actualDurationMinutes(35)
                            .standardDurationMinutes(35)
                            .status(CleaningRecordStatus.APPROVED)
                            .inspectedBy(receptionistUser)
                            .inspectedAt(checkOut.atTime(13, 0))
                            .isInterrupted(false)
                            .hasIncident(false)
                            .incidentCount(0)
                            .rejectionCount(0)
                            .build());
                }

                // Khoảng cách giữa các lượt khách tiếp theo: 0 đến 2 ngày trống
                int gapDays = (rIdx + currDate.getDayOfMonth()) % 3;
                currDate = checkOut.plusDays(gapDays);
            }

            // 2. Xử lý các phòng ĐANG Ở HÔM NAY (inHouseRoomNumbers: 101, 102, 201, 203, 301)
            if (inHouseRoomNumbers.contains(rNum)) {
                LocalDate checkIn = today.minusDays(1 + (rIdx % 2));
                LocalDate checkOut = today.plusDays(1 + (rIdx % 2));
                Guest guest = guests.get(guestIndex % guests.size());
                guestIndex++;

                BigDecimal roomAmount = roomType.getBasePrice().multiply(BigDecimal.valueOf(ChronoUnit.DAYS.between(checkIn, checkOut)));
                LocalDateTime checkedInAt = checkIn.atTime(14, 15);

                Booking inHouseBooking = Booking.builder()
                        .guest(guest)
                        .room(room)
                        .roomType(roomType)
                        .checkInDate(checkIn)
                        .checkOutDate(checkOut)
                        .checkedInAt(checkedInAt)
                        .status(BookingStatus.CHECKED_IN)
                        .expectedPrice(roomAmount)
                        .actualPrice(roomAmount)
                        .source("WALKIN")
                        .createdBy(receptionistUser)
                        .note("Khách đang lưu trú tại phòng, hỗ trợ chu đáo")
                        .build();

                bookingsToSave.add(inHouseBooking);

                // Dịch vụ minibar đã dùng
                if (!services.isEmpty()) {
                    ExtraService nướcSuối = services.stream().filter(s -> s.getName().contains("Nước suối khoáng")).findFirst().orElse(services.get(0));
                    usagesToSave.add(BookingServiceUsage.builder()
                            .booking(inHouseBooking)
                            .extraService(nướcSuối)
                            .quantity(2)
                            .unitPriceSnapshot(nướcSuối.getUnitPrice())
                            .note("Minibar phòng")
                            .isSystemMandatory(false)
                            .build());
                }

                // Đặt cọc phòng đang ở
                BigDecimal depAmt = roomAmount.multiply(new BigDecimal("0.30")).setScale(0, RoundingMode.HALF_UP);
                depositsToSave.add(Deposit.builder()
                        .booking(inHouseBooking)
                        .requiredAmount(depAmt)
                        .collectedAmount(depAmt)
                        .status(DepositStatus.COLLECTED)
                        .paymentMethod(PaymentMethod.CASH)
                        .collectedBy(receptionistUser)
                        .collectedAt(checkIn.atTime(14, 20))
                        .note("Thu tiền cọc lúc làm thủ tục nhận phòng")
                        .build());

                // Khai báo tạm trú
                declarationsToSave.add(StayDeclaration.builder()
                        .booking(inHouseBooking)
                        .status(StayDeclarationStatus.COMPLETED)
                        .completedBy(receptionistUser)
                        .completedAt(checkedInAt.plusHours(1))
                        .build());
            }

            // 3. Xử lý các phòng SẮP NHẬN PHÒNG (upcomingRoomNumbers: 104, 204, 302, 401)
            if (upcomingRoomNumbers.contains(rNum)) {
                LocalDate checkIn = today.plusDays(rIdx % 2); // Hôm nay hoặc ngày mai
                LocalDate checkOut = checkIn.plusDays(2);
                Guest guest = guests.get(guestIndex % guests.size());
                guestIndex++;

                BigDecimal roomAmount = roomType.getBasePrice().multiply(BigDecimal.valueOf(2));

                Booking upcomingBooking = Booking.builder()
                        .guest(guest)
                        .room(room)
                        .roomType(roomType)
                        .checkInDate(checkIn)
                        .checkOutDate(checkOut)
                        .status(BookingStatus.CONFIRMED)
                        .expectedPrice(roomAmount)
                        .actualPrice(roomAmount)
                        .source("ONLINE")
                        .createdBy(receptionistUser)
                        .note("Khách hẹn nhận phòng lúc 14h chiều, chuẩn bị phòng sạch sẽ")
                        .build();

                bookingsToSave.add(upcomingBooking);

                // Đã nhận cọc chuyển khoản
                BigDecimal depAmt = roomAmount.multiply(new BigDecimal("0.30")).setScale(0, RoundingMode.HALF_UP);
                depositsToSave.add(Deposit.builder()
                        .booking(upcomingBooking)
                        .requiredAmount(depAmt)
                        .collectedAmount(depAmt)
                        .status(DepositStatus.COLLECTED)
                        .paymentMethod(PaymentMethod.TRANSFER)
                        .collectedBy(receptionistUser)
                        .collectedAt(today.minusDays(1).atTime(9, 30))
                        .note("Khách cọc qua QR ngân hàng xác nhận đặt phòng")
                        .build());
            }
        }

        // Lưu toàn bộ danh sách Đặt phòng
        bookingRepository.saveAll(bookingsToSave);
        log.info("Đã lưu {} lượt đặt phòng thực tế trải dài từ tháng 1 đến nay.", bookingsToSave.size());

        // Lưu danh sách Dịch vụ sử dụng
        bookingServiceUsageRepository.saveAll(usagesToSave);
        log.info("Đã lưu {} lượt sử dụng dịch vụ phụ thu.", usagesToSave.size());

        // Lưu Hóa đơn và Thanh toán
        invoiceRepository.saveAll(invoicesToSave);
        paymentRepository.saveAll(paymentsToSave);
        log.info("Đã lưu {} hóa đơn thanh toán và {} giao dịch doanh thu.", invoicesToSave.size(), paymentsToSave.size());

        // Lưu Tiền đặt cọc
        depositRepository.saveAll(depositsToSave);
        log.info("Đã lưu {} khoản đặt cọc bảo đảm.", depositsToSave.size());

        // Lưu Khai báo tạm trú
        stayDeclarationRepository.saveAll(declarationsToSave);
        log.info("Đã lưu {} hồ sơ khai báo tạm trú.", declarationsToSave.size());

        // Lưu Nhật ký dọn buồng phòng
        // Thêm 1 bản ghi dọn phòng đang tiến hành hôm nay cho phòng 103 (DIRTY)
        Room room103 = allRooms.stream().filter(r -> "103".equals(r.getRoomNumber())).findFirst().orElse(null);
        if (room103 != null) {
            cleaningsToSave.add(RoomCleaningRecord.builder()
                    .room(room103)
                    .roomType(room103.getRoomType())
                    .housekeeper(housekeeperUser)
                    .cleaningType("CHECKOUT")
                    .startedAt(today.atTime(11, 40))
                    .standardDurationMinutes(30)
                    .status(CleaningRecordStatus.IN_PROGRESS)
                    .isInterrupted(false)
                    .hasIncident(false)
                    .incidentCount(0)
                    .rejectionCount(0)
                    .build());
        }
        roomCleaningRecordRepository.saveAll(cleaningsToSave);
        log.info("Đã lưu {} bản ghi nhật ký dọn buồng phòng.", cleaningsToSave.size());

        // 4. Sinh Sổ cái tài chính hàng ngày (DailyLedger) từ 01/01/2026 đến hôm nay
        seedDailyLedgers(startDate, today, paymentsToSave, depositsToSave, receptionistUser);

        // 5. Sinh Ca làm việc thu ngân (CashierShift)
        seedCashierShifts(today, receptionistUser, receptionistUser2);

        // 6. Seed Sự cố kỹ thuật phòng (RoomIncident)
        seedRoomIncidents(allRooms, housekeeperUser, housekeeperUser2, adminUser, receptionistUser);

        // 7. Seed Đồ thất lạc (LostItem)
        seedLostItems(allRooms, housekeeperUser, housekeeperUser2, receptionistUser);

        // 8. Cập nhật Trạng thái thực tế các phòng
        updateRealtimeRoomStatuses(allRooms, inHouseRoomNumbers);

        // 9. Khởi tạo Thông báo mẫu cho ngày hôm nay
        seedSampleNotifications(users, today);
    }

    private void seedDailyLedgers(LocalDate startDate, LocalDate today, List<Payment> payments, List<Deposit> deposits, User receptionistUser) {
        if (dailyLedgerRepository.count() > 0) return;

        Map<LocalDate, BigDecimal> cashMap = new HashMap<>();
        Map<LocalDate, BigDecimal> transferMap = new HashMap<>();
        Map<LocalDate, BigDecimal> cardMap = new HashMap<>();
        Map<LocalDate, BigDecimal> depTransferMap = new HashMap<>();
        Map<LocalDate, BigDecimal> depCashMap = new HashMap<>();

        for (Payment p : payments) {
            LocalDate d = p.getPaidAt().toLocalDate();
            if (p.getMethod() == PaymentMethod.CASH) {
                cashMap.put(d, cashMap.getOrDefault(d, BigDecimal.ZERO).add(p.getAmount()));
            } else if (p.getMethod() == PaymentMethod.CREDIT_CARD) {
                cardMap.put(d, cardMap.getOrDefault(d, BigDecimal.ZERO).add(p.getAmount()));
            } else {
                transferMap.put(d, transferMap.getOrDefault(d, BigDecimal.ZERO).add(p.getAmount()));
            }
        }

        for (Deposit dep : deposits) {
            if (dep.getCollectedAt() != null) {
                LocalDate d = dep.getCollectedAt().toLocalDate();
                if (dep.getPaymentMethod() == PaymentMethod.CASH) {
                    depCashMap.put(d, depCashMap.getOrDefault(d, BigDecimal.ZERO).add(dep.getCollectedAmount()));
                } else {
                    depTransferMap.put(d, depTransferMap.getOrDefault(d, BigDecimal.ZERO).add(dep.getCollectedAmount()));
                }
            }
        }

        List<DailyLedger> ledgers = new ArrayList<>();
        LocalDate cur = startDate;
        while (!cur.isAfter(today)) {
            boolean isPast = cur.isBefore(today);
            BigDecimal c = cashMap.getOrDefault(cur, BigDecimal.ZERO);
            BigDecimal tr = transferMap.getOrDefault(cur, BigDecimal.ZERO);
            BigDecimal cd = cardMap.getOrDefault(cur, BigDecimal.ZERO);
            BigDecimal dc = depCashMap.getOrDefault(cur, BigDecimal.ZERO);
            BigDecimal dt = depTransferMap.getOrDefault(cur, BigDecimal.ZERO);

            BigDecimal expCash = c.add(dc);

            ledgers.add(DailyLedger.builder()
                    .date(cur)
                    .status(isPast ? DailyLedgerStatus.CLOSED : DailyLedgerStatus.OPEN)
                    .closedBy(isPast ? receptionistUser : null)
                    .closedAt(isPast ? cur.atTime(23, 30) : null)
                    .totalInvoiceCash(c)
                    .totalInvoiceTransfer(tr)
                    .totalInvoiceCard(cd)
                    .totalDepositCash(dc)
                    .totalDepositTransfer(dt)
                    .totalDepositCard(BigDecimal.ZERO)
                    .totalRefundCash(BigDecimal.ZERO)
                    .totalRefundTransfer(BigDecimal.ZERO)
                    .totalRefundCard(BigDecimal.ZERO)
                    .totalExpectedCash(expCash)
                    .totalActualCash(expCash)
                    .totalDiscrepancy(BigDecimal.ZERO)
                    .cashHandoverAmount(expCash)
                    .build());

            cur = cur.plusDays(1);
        }
        dailyLedgerRepository.saveAll(ledgers);
        log.info("Đã khởi tạo {} sổ cái tài chính ngày (DailyLedger) liền mạch.", ledgers.size());
    }

    private void seedCashierShifts(LocalDate today, User letan1, User letan2) {
        if (cashierShiftRepository.count() > 0) return;

        List<CashierShift> shifts = new ArrayList<>();
        // Tạo ca cho 30 ngày gần đây
        for (int i = 30; i >= 1; i--) {
            LocalDate d = today.minusDays(i);
            // Ca sáng
            shifts.add(CashierShift.builder()
                    .openedBy(letan1)
                    .openedAt(d.atTime(7, 0))
                    .openingCash(new BigDecimal("2000000"))
                    .openingNote("Nhận ca sáng đầu ngày")
                    .status(CashierShiftStatus.CLOSED)
                    .closedBy(letan1)
                    .closedAt(d.atTime(15, 0))
                    .invoiceCash(new BigDecimal("1200000"))
                    .invoiceTransfer(new BigDecimal("2500000"))
                    .invoiceCard(BigDecimal.ZERO)
                    .depositCash(BigDecimal.ZERO)
                    .depositTransfer(new BigDecimal("600000"))
                    .depositCard(BigDecimal.ZERO)
                    .refundCash(BigDecimal.ZERO)
                    .refundTransfer(BigDecimal.ZERO)
                    .refundCard(BigDecimal.ZERO)
                    .expectedCash(new BigDecimal("3200000"))
                    .actualCash(new BigDecimal("3200000"))
                    .discrepancy(BigDecimal.ZERO)
                    .build());

            // Ca chiều
            shifts.add(CashierShift.builder()
                    .openedBy(letan2)
                    .openedAt(d.atTime(15, 0))
                    .openingCash(new BigDecimal("3200000"))
                    .openingNote("Tiếp quản ca chiều")
                    .status(CashierShiftStatus.CLOSED)
                    .closedBy(letan2)
                    .closedAt(d.atTime(23, 0))
                    .invoiceCash(new BigDecimal("800000"))
                    .invoiceTransfer(new BigDecimal("1400000"))
                    .invoiceCard(BigDecimal.ZERO)
                    .depositCash(BigDecimal.ZERO)
                    .depositTransfer(BigDecimal.ZERO)
                    .depositCard(BigDecimal.ZERO)
                    .refundCash(BigDecimal.ZERO)
                    .refundTransfer(BigDecimal.ZERO)
                    .refundCard(BigDecimal.ZERO)
                    .expectedCash(new BigDecimal("4000000"))
                    .actualCash(new BigDecimal("4000000"))
                    .discrepancy(BigDecimal.ZERO)
                    .build());
        }

        // Ca mở hôm nay (OPEN)
        shifts.add(CashierShift.builder()
                .openedBy(letan1)
                .openedAt(today.atTime(7, 0))
                .openingCash(new BigDecimal("2000000"))
                .openingNote("Bàn giao ca sáng ngày mới, két tiền khởi điểm 2.000.000 đ")
                .status(CashierShiftStatus.OPEN)
                .invoiceCash(BigDecimal.ZERO)
                .invoiceTransfer(BigDecimal.ZERO)
                .invoiceCard(BigDecimal.ZERO)
                .depositCash(BigDecimal.ZERO)
                .depositTransfer(BigDecimal.ZERO)
                .depositCard(BigDecimal.ZERO)
                .refundCash(BigDecimal.ZERO)
                .refundTransfer(BigDecimal.ZERO)
                .refundCard(BigDecimal.ZERO)
                .expectedCash(new BigDecimal("2000000"))
                .actualCash(new BigDecimal("2000000"))
                .discrepancy(BigDecimal.ZERO)
                .build());

        cashierShiftRepository.saveAll(shifts);
        log.info("Đã tạo {} ca thu ngân trực ban (gồm ca đang mở hôm nay).", shifts.size());
    }

    private void seedRoomIncidents(List<Room> allRooms, User housekeeper1, User housekeeper2, User admin, User letan) {
        if (roomIncidentRepository.count() > 0) return;

        Map<String, Room> rMap = new HashMap<>();
        for (Room r : allRooms) rMap.put(r.getRoomNumber(), r);

        LocalDate today = LocalDate.now();
        List<RoomIncident> incidents = new ArrayList<>();

        if (rMap.containsKey("103")) {
            incidents.add(RoomIncident.builder()
                    .room(rMap.get("103"))
                    .severity(IncidentSeverity.LIGHT)
                    .description("Vòi sen tắm bị rò rỉ nước ở khớp nối ren")
                    .status(IncidentStatus.RESOLVED)
                    .reportedBy(housekeeper1)
                    .reportedAt(today.minusDays(15).atTime(13, 0))
                    .resolvedBy(letan)
                    .resolvedAt(today.minusDays(15).atTime(15, 30))
                    .resolutionNote("Đã thay gioăng cao su mới và siết chặt ren chống rò rỉ.")
                    .affectedBookingsCount(0)
                    .build());
        }

        if (rMap.containsKey("202")) {
            incidents.add(RoomIncident.builder()
                    .room(rMap.get("202"))
                    .severity(IncidentSeverity.LIGHT)
                    .description("Điều hòa phát ra tiếng kêu rè rè khi bật nhiệt độ thấp")
                    .status(IncidentStatus.RESOLVED)
                    .reportedBy(housekeeper1)
                    .reportedAt(today.minusDays(8).atTime(10, 0))
                    .resolvedBy(admin)
                    .resolvedAt(today.minusDays(8).atTime(14, 0))
                    .resolutionNote("Kỹ thuật đã vệ sinh lưới lọc và cân chỉnh quạt lồng sóc.")
                    .affectedBookingsCount(0)
                    .build());
        }

        if (rMap.containsKey("302")) {
            incidents.add(RoomIncident.builder()
                    .room(rMap.get("302"))
                    .severity(IncidentSeverity.LIGHT)
                    .description("Bản lề cửa ra ban công bị rít khó đóng mở")
                    .status(IncidentStatus.RESOLVED)
                    .reportedBy(housekeeper2)
                    .reportedAt(today.minusDays(20).atTime(11, 20))
                    .resolvedBy(admin)
                    .resolvedAt(today.minusDays(20).atTime(16, 0))
                    .resolutionNote("Đã xịt dung dịch bôi trơn RP7 và siết ốc cân chỉnh.")
                    .affectedBookingsCount(0)
                    .build());
        }

        if (rMap.containsKey("104")) {
            incidents.add(RoomIncident.builder()
                    .room(rMap.get("104"))
                    .severity(IncidentSeverity.LIGHT)
                    .description("Điều khiển tivi hết pin, khách báo khi nhận phòng")
                    .status(IncidentStatus.RESOLVED)
                    .reportedBy(letan)
                    .reportedAt(today.minusDays(12).atTime(19, 0))
                    .resolvedBy(letan)
                    .resolvedAt(today.minusDays(12).atTime(19, 10))
                    .resolutionNote("Đã thay ngay 2 viên pin AAA mới cho khách.")
                    .affectedBookingsCount(0)
                    .build());
        }

        if (rMap.containsKey("204")) {
            incidents.add(RoomIncident.builder()
                    .room(rMap.get("204"))
                    .severity(IncidentSeverity.LIGHT)
                    .description("Đèn ngủ đầu giường chập chờn tiếp xúc điện")
                    .status(IncidentStatus.RESOLVED)
                    .reportedBy(housekeeper1)
                    .reportedAt(today.minusDays(5).atTime(9, 45))
                    .resolvedBy(admin)
                    .resolvedAt(today.minusDays(5).atTime(11, 15))
                    .resolutionNote("Đã thay đuôi bóng đèn mới và kiểm tra an toàn điện.")
                    .affectedBookingsCount(0)
                    .build());
        }

        if (rMap.containsKey("105")) {
            incidents.add(RoomIncident.builder()
                    .room(rMap.get("105"))
                    .severity(IncidentSeverity.LIGHT)
                    .description("Vòi xịt toilet áp lực nước yếu")
                    .status(IncidentStatus.RESOLVED)
                    .reportedBy(housekeeper2)
                    .reportedAt(today.minusDays(18).atTime(14, 0))
                    .resolvedBy(admin)
                    .resolvedAt(today.minusDays(18).atTime(15, 30))
                    .resolutionNote("Đã thông cặn canxi đầu vòi phun, dòng chảy đã mạnh đều.")
                    .affectedBookingsCount(0)
                    .build());
        }

        if (rMap.containsKey("401")) {
            incidents.add(RoomIncident.builder()
                    .room(rMap.get("401"))
                    .severity(IncidentSeverity.LIGHT)
                    .description("Khóa thẻ từ phòng phản hồi chậm khi chạm thẻ")
                    .status(IncidentStatus.RESOLVED)
                    .reportedBy(housekeeper1)
                    .reportedAt(today.minusDays(2).atTime(16, 0))
                    .resolvedBy(letan)
                    .resolvedAt(today.minusDays(2).atTime(16, 30))
                    .resolutionNote("Đã thay bộ 4 pin AA mới cho khóa thông minh điện tử.")
                    .affectedBookingsCount(0)
                    .build());
        }

        roomIncidentRepository.saveAll(incidents);
        log.info("Đã tạo {} bản ghi sự cố phòng mẫu đã xử lý (RoomIncident).", incidents.size());
    }

    private void seedLostItems(List<Room> allRooms, User housekeeper1, User housekeeper2, User letan) {
        if (lostItemRepository.count() > 0) return;

        Map<String, Room> rMap = new HashMap<>();
        for (Room r : allRooms) rMap.put(r.getRoomNumber(), r);

        LocalDate today = LocalDate.now();
        List<LostItem> items = new ArrayList<>();

        if (rMap.containsKey("102")) {
            items.add(LostItem.builder()
                    .room(rMap.get("102"))
                    .itemName("Tai nghe Apple AirPods Pro có hộp sạc màu trắng")
                    .foundLocation("Bàn trang điểm cạnh gương")
                    .foundDate(today.minusDays(14))
                    .foundTime(LocalTime.of(12, 30))
                    .storageLocation("Tủ đồ thất lạc Lễ tân")
                    .status(LostItemStatus.RETURNED)
                    .retentionExpiryDate(today.plusDays(16))
                    .receiverName("Trần Thị Lan")
                    .receiverPhone("0912345678")
                    .receiverNote("Khách quay lại nhận trực tiếp tại quầy chiều cùng ngày")
                    .returnedAt(today.minusDays(14).atTime(17, 0))
                    .returnedBy(letan)
                    .createdBy(housekeeper1)
                    .build());
        }

        if (rMap.containsKey("201")) {
            items.add(LostItem.builder()
                    .room(rMap.get("201"))
                    .itemName("Áo khoác dạ nữ màu be dáng dài")
                    .foundLocation("Trong tủ quần áo gỗ")
                    .foundDate(today.minusDays(10))
                    .foundTime(LocalTime.of(13, 0))
                    .storageLocation("Tủ đồ thất lạc Lễ tân")
                    .status(LostItemStatus.RETURNED)
                    .retentionExpiryDate(today.plusDays(20))
                    .receiverName("Lê Thị Bích Ngọc")
                    .receiverPhone("0901234567")
                    .receiverNote("Đã gửi chuyển phát nhanh Viettel Post theo địa chỉ khách yêu cầu")
                    .returnedAt(today.minusDays(9).atTime(10, 0))
                    .returnedBy(letan)
                    .createdBy(housekeeper1)
                    .build());
        }

        if (rMap.containsKey("301")) {
            items.add(LostItem.builder()
                    .room(rMap.get("301"))
                    .itemName("Kính râm Ray-Ban gọng đen trong bao da")
                    .foundLocation("Trên bàn làm việc cạnh cửa sổ")
                    .foundDate(today.minusDays(4))
                    .foundTime(LocalTime.of(11, 45))
                    .storageLocation("Ngăn kéo tủ Lost & Found Lễ tân")
                    .status(LostItemStatus.HOLDING)
                    .retentionExpiryDate(today.plusDays(26))
                    .createdBy(housekeeper2)
                    .build());
        }

        if (rMap.containsKey("104")) {
            items.add(LostItem.builder()
                    .room(rMap.get("104"))
                    .itemName("Sạc dự phòng Anker 10.000mAh màu đen kèm cáp sạc Type-C")
                    .foundLocation("Ngăn kéo tủ đầu giường")
                    .foundDate(today.minusDays(2))
                    .foundTime(LocalTime.of(12, 15))
                    .storageLocation("Ngăn kéo tủ Lost & Found Lễ tân")
                    .status(LostItemStatus.HOLDING)
                    .retentionExpiryDate(today.plusDays(28))
                    .createdBy(housekeeper1)
                    .build());
        }

        if (rMap.containsKey("205")) {
            items.add(LostItem.builder()
                    .room(rMap.get("205"))
                    .itemName("Sách 'Atomic Habits' bản tiếng Anh bìa cứng")
                    .foundLocation("Bàn trà ngoài ban công")
                    .foundDate(today.minusDays(7))
                    .foundTime(LocalTime.of(12, 40))
                    .storageLocation("Tủ sách sảnh chờ")
                    .status(LostItemStatus.RETURNED)
                    .retentionExpiryDate(today.plusDays(23))
                    .receiverName("Hoàng Văn Tuấn")
                    .receiverPhone("0934567890")
                    .receiverNote("Khách gửi bạn qua nhận hộ vào buổi tối")
                    .returnedAt(today.minusDays(6).atTime(20, 15))
                    .returnedBy(letan)
                    .createdBy(housekeeper2)
                    .build());
        }

        if (rMap.containsKey("401")) {
            items.add(LostItem.builder()
                    .room(rMap.get("401"))
                    .itemName("Đồng hồ đeo tay kim loại màu bạc Casio Edifice")
                    .foundLocation("Bồn rửa mặt phòng tắm")
                    .foundDate(today.minusDays(1))
                    .foundTime(LocalTime.of(12, 10))
                    .storageLocation("Két sắt an toàn của Lễ tân")
                    .status(LostItemStatus.HOLDING)
                    .retentionExpiryDate(today.plusDays(29))
                    .createdBy(housekeeper1)
                    .build());
        }

        lostItemRepository.saveAll(items);
        log.info("Đã tạo {} đồ thất lạc mẫu (LostItem).", items.size());
    }

    private void updateRealtimeRoomStatuses(List<Room> allRooms, Set<String> inHouseRoomNumbers) {
        List<Room> updatedRooms = new ArrayList<>();
        for (Room r : allRooms) {
            String num = r.getRoomNumber();
            if (inHouseRoomNumbers.contains(num)) {
                r.setStatus(RoomStatus.OCCUPIED);
            } else if ("103".equals(num)) {
                r.setStatus(RoomStatus.DIRTY);
            } else if ("202".equals(num)) {
                r.setStatus(RoomStatus.MAINTENANCE);
            } else {
                r.setStatus(RoomStatus.AVAILABLE);
            }
            updatedRooms.add(r);
        }
        roomRepository.saveAll(updatedRooms);
        log.info("Đã đồng bộ trạng thái thực tế cho toàn bộ 15 phòng (5 Đang ở, 1 Cần dọn, 1 Bảo trì, 8 Trống).");
    }

    private void seedSampleNotifications(List<User> users, LocalDate today) {
        if (notificationRepository.count() > 0) return;

        List<Notification> sampleNotifs = new ArrayList<>();
        for (User u : users) {
            if (u.getRole() == Role.OWNER || u.getRole() == Role.RECEPTIONIST || u.getRole() == Role.ADMIN) {
                sampleNotifs.add(Notification.builder()
                        .user(u)
                        .type(NotificationType.CHECKIN_TODAY)
                        .title("Check-in: Phòng 104")
                        .body("Khách Đặng Quốc Huy dự kiến nhận phòng 104 hôm nay lúc 14:00")
                        .refType("ROOM")
                        .isRead(false)
                        .build());

                sampleNotifs.add(Notification.builder()
                        .user(u)
                        .type(NotificationType.CHECKIN_TODAY)
                        .title("Check-in: Phòng 204")
                        .body("Khách Ngô Thanh Hằng dự kiến nhận phòng 204 hôm nay lúc 15:30")
                        .refType("ROOM")
                        .isRead(false)
                        .build());

                sampleNotifs.add(Notification.builder()
                        .user(u)
                        .type(NotificationType.CHECKOUT_TODAY)
                        .title("Check-out: Phòng 101")
                        .body("Khách Nguyễn Văn An hoàn tất trả phòng 101 hôm nay")
                        .refType("ROOM")
                        .isRead(false)
                        .build());
            }

            if (u.getRole() == Role.HOUSEKEEPER || u.getRole() == Role.OWNER || u.getRole() == Role.RECEPTIONIST) {
                sampleNotifs.add(Notification.builder()
                        .user(u)
                        .type(NotificationType.ROOM_DIRTY)
                        .title("Phòng cần dọn: 103")
                        .body("Phòng 103 vừa trả phòng, cần dọn dẹp để sẵn sàng đón lượt khách tiếp theo")
                        .refType("ROOM")
                        .isRead(false)
                        .build());
            }

            if (u.getRole() == Role.OWNER) {
                sampleNotifs.add(Notification.builder()
                        .user(u)
                        .type(NotificationType.STAY_MILESTONE)
                        .title("Cột mốc doanh thu tháng 9")
                        .body("Hệ thống ghi nhận doanh thu tháng 9 đã vượt mốc 35.000.000 đ")
                        .refType("INVOICE")
                        .isRead(false)
                        .build());
            }
        }

        notificationRepository.saveAll(sampleNotifs);
        log.info("Đã tạo {} thông báo mẫu cho ngày hôm nay.", sampleNotifs.size());
    }
}
