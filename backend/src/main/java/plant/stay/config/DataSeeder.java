package plant.stay.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.model.RoomType;
import plant.stay.model.Room;
import plant.stay.model.ExtraService;
import plant.stay.model.RoomStatus;
import plant.stay.model.HotelSetting;
import plant.stay.model.DepositPolicy;
import plant.stay.model.InventoryItem;
import plant.stay.model.LoyaltyTier;
import plant.stay.repository.UserRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.repository.ExtraServiceRepository;
import plant.stay.repository.HotelSettingRepository;
import plant.stay.repository.DepositPolicyRepository;
import plant.stay.repository.InventoryItemRepository;
import plant.stay.repository.LoyaltyTierRepository;
import plant.stay.util.HashUtil;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

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
    private final InventoryItemRepository inventoryItemRepository;
    private final LoyaltyTierRepository loyaltyTierRepository;

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed Users (Tài khoản người dùng)
        User ownerUser = null;
        if (userRepository.count() == 0) {
            log.info("Bắt đầu khởi tạo dữ liệu mẫu người dùng (User)...");

            String defaultPassword = HashUtil.hashPassword("pass@123");

            User admin = User.builder()
                    .account("admin")
                    .name("Bàn Hữu Sự")
                    .password(defaultPassword)
                    .email("huusu@stayaway.vn")
                    .phone("0981111111")
                    .role(Role.ADMIN)
                    .active(true)
                    .build();

            User owner = User.builder()
                    .account("chusohuu")
                    .name("Trần Thị Mai")
                    .password(defaultPassword)
                    .email("mai.tran@stayaway.vn")
                    .phone("0982222222")
                    .role(Role.OWNER)
                    .active(true)
                    .build();

            User receptionist = User.builder()
                    .account("letan")
                    .name("Lê Ngọc Hân")
                    .password(defaultPassword)
                    .email("han.le@stayaway.vn")
                    .phone("0983333333")
                    .role(Role.RECEPTIONIST)
                    .active(true)
                    .build();

            User housekeeper = User.builder()
                    .account("buongphong")
                    .name("Phạm Thị Yến")
                    .password(defaultPassword)
                    .email("yen.pham@stayaway.vn")
                    .phone("0984444444")
                    .role(Role.HOUSEKEEPER)
                    .active(true)
                    .build();

            User accountant = User.builder()
                    .account("ketoan")
                    .name("Hoàng Minh Trí")
                    .password(defaultPassword)
                    .email("tri.hoang@stayaway.vn")
                    .phone("0985555555")
                    .role(Role.ACCOUNTANT)
                    .active(true)
                    .build();

            userRepository.saveAll(List.of(admin, owner, receptionist, housekeeper, accountant));
            ownerUser = owner;
            log.info("Đã tạo thành công các tài khoản mẫu với mật khẩu mặc định là pass@123.");
        } else {
            ownerUser = userRepository.findByAccount("chusohuu").orElse(null);
            log.info("Dữ liệu User đã tồn tại, bỏ qua bước tạo dữ liệu mẫu User.");
        }

        // Đảm bảo luôn có tài khoản nhân viên buồng phòng hoạt động
        String defaultPass = HashUtil.hashPassword("pass@123");
        if (userRepository.findByAccount("buongphong").isEmpty()) {
            userRepository.save(User.builder()
                    .account("buongphong")
                    .name("Phạm Thị Yến")
                    .password(defaultPass)
                    .email("yen.pham@stayaway.vn")
                    .phone("0984444444")
                    .role(Role.HOUSEKEEPER)
                    .active(true)
                    .build());
        }
        if (userRepository.findByAccount("buongphong2").isEmpty()) {
            userRepository.save(User.builder()
                    .account("buongphong2")
                    .name("Nguyễn Văn Nam")
                    .password(defaultPass)
                    .email("nam.nguyen@stayaway.vn")
                    .phone("0986666666")
                    .role(Role.HOUSEKEEPER)
                    .active(true)
                    .build());
        }

        // 2. Seed HotelSetting (Cấu hình thông tin cơ sở lưu trú)
        if (hotelSettingRepository.count() == 0) {
            log.info("Bắt đầu khởi tạo dữ liệu mẫu cho thông tin cơ sở (HotelSetting)...");
            HotelSetting hotelSetting = HotelSetting.builder()
                    .propertyName("Stay Away")
                    .address("Z115, Phan Đình Phùng, Tp. Thái Nguyên, Tỉnh Thái Nguyên")
                    .phone("0365224245")
                    .email("lienhe@stayaway.vn")
                    .defaultCheckinTime(LocalTime.of(14, 0))
                    .defaultCheckoutTime(LocalTime.of(12, 0))
                    .homeImage("https://i.ibb.co/TxVT7pQz/images-11-jpg.jpg")
                    .build();
            hotelSettingRepository.save(hotelSetting);
            log.info("Đã tạo thành công dữ liệu mẫu cho HotelSetting.");
        } else {
            log.info("Dữ liệu HotelSetting đã tồn tại, bỏ qua bước tạo dữ liệu mẫu.");
        }

        // 3. Seed RoomType & Room & ExtraService
        if (roomTypeRepository.count() == 0) {
            log.info("Bắt đầu khởi tạo dữ liệu mẫu cho Loại phòng, Sơ đồ phòng, Dịch vụ phụ thu...");

            // 3.1. Loại phòng (RoomType)
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

            // 3.2. Danh sách phòng (Room)
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

            // 3.3. Dịch vụ phụ thu (ExtraService)
            ExtraService breakfast = ExtraService.builder()
                    .name("Ăn sáng buffet")
                    .description("Buffet sáng đa dạng với các món ăn truyền thống Việt Nam và ẩm thực Á - Âu")
                    .unitPrice(new BigDecimal("150000"))
                    .unit("lượt")
                    .active(true)
                    .build();

            ExtraService airportPickup = ExtraService.builder()
                    .name("Đưa đón sân bay")
                    .description("Xe ô tô 4 chỗ hoặc 7 chỗ đời mới đưa đón tận nơi chu đáo và an toàn")
                    .unitPrice(new BigDecimal("300000"))
                    .unit("chuyến")
                    .active(true)
                    .build();

            ExtraService laundry = ExtraService.builder()
                    .name("Giặt là cao cấp")
                    .description("Giặt sấy, là ủi quần áo nhanh chóng và thơm mát trong ngày")
                    .unitPrice(new BigDecimal("50000"))
                    .unit("kg")
                    .active(true)
                    .build();

            ExtraService extraBed = ExtraService.builder()
                    .name("Kê thêm giường phụ")
                    .description("Kê thêm giường đơn êm ái kèm trọn bộ chăn ga gối đệm cao cấp")
                    .unitPrice(new BigDecimal("200000"))
                    .unit("giường/đêm")
                    .active(true)
                    .build();

            ExtraService motorbike = ExtraService.builder()
                    .name("Thuê xe máy tự lái")
                    .description("Xe tay ga / xe số đời mới tiết kiệm xăng, kèm 2 mũ bảo hiểm đạt chuẩn")
                    .unitPrice(new BigDecimal("120000"))
                    .unit("ngày")
                    .active(true)
                    .build();

            ExtraService spa = ExtraService.builder()
                    .name("Dịch vụ Spa thư giãn")
                    .description("Liệu trình massage body thảo dược 60 phút giúp phục hồi năng lượng")
                    .unitPrice(new BigDecimal("350000"))
                    .unit("suất")
                    .active(true)
                    .build();

            extraServiceRepository.saveAll(List.of(breakfast, airportPickup, laundry, extraBed, motorbike, spa));

            log.info("Đã tạo thành công dữ liệu mẫu cho RoomType, Room, ExtraService.");
        } else {
            log.info("Dữ liệu Room, RoomType, ExtraService đã tồn tại, bỏ qua bước tạo dữ liệu mẫu.");
        }

        // 4. Seed DepositPolicy (Chính sách đặt cọc)
        if (depositPolicyRepository.count() == 0) {
            log.info("Bắt đầu khởi tạo dữ liệu mẫu cho Chính sách đặt cọc (DepositPolicy)...");
            DepositPolicy defaultPolicy = DepositPolicy.builder()
                    .roomType(null) // Áp dụng cho tất cả loại phòng
                    .depositPercent(new BigDecimal("30.00")) // Cọc 30%
                    .active(true)
                    .updatedBy(ownerUser)
                    .build();
            depositPolicyRepository.save(defaultPolicy);
            log.info("Đã tạo thành công chính sách đặt cọc mặc định (30%).");
        }

        // 5. Seed InventoryItem (Kho đồ dùng khách sạn)
        if (inventoryItemRepository.count() == 0) {
            log.info("Bắt đầu khởi tạo dữ liệu mẫu cho Kho đồ dùng (InventoryItem)...");
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
            log.info("Đã tạo thành công dữ liệu mẫu cho Kho đồ dùng.");
        }

        // 6. Seed LoyaltyTier (Hạng hội viên thân thiết)
        if (loyaltyTierRepository.count() == 0) {
            log.info("Bắt đầu khởi tạo dữ liệu mẫu cho Hạng hội viên (LoyaltyTier)...");
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
            log.info("Đã tạo thành công dữ liệu mẫu cho Hạng hội viên.");
        }
    }
}
