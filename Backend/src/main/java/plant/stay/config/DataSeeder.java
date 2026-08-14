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
import plant.stay.repository.UserRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.repository.ExtraServiceRepository;
import plant.stay.model.HotelSetting;
import plant.stay.repository.HotelSettingRepository;
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

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            log.info("Bắt đầu khởi tạo dữ liệu mẫu (Data Seeding)...");

            String defaultPassword = HashUtil.hashPassword("pass@123");

            User admin = User.builder()
                    .account("admin")
                    .name("Bàn Hữu Sự")
                    .password(defaultPassword)
                    .email("huusu@stay.com")
                    .phone("0981111111")
                    .role(Role.ADMIN)
                    .active(true)
                    .build();

            User owner = User.builder()
                    .account("chusohuu")
                    .name("Trần Thị Mai")
                    .password(defaultPassword)
                    .email("mai.tran@stay.com")
                    .phone("0982222222")
                    .role(Role.OWNER)
                    .active(true)
                    .build();

            User receptionist = User.builder()
                    .account("letan")
                    .name("Lê Ngọc Hân")
                    .password(defaultPassword)
                    .email("han.le@stay.com")
                    .phone("0983333333")
                    .role(Role.RECEPTIONIST)
                    .active(true)
                    .build();

            User housekeeper = User.builder()
                    .account("buongphong")
                    .name("Phạm Thị Yến")
                    .password(defaultPassword)
                    .email("yen.pham@stay.com")
                    .phone("0984444444")
                    .role(Role.HOUSEKEEPER)
                    .active(true)
                    .build();

            User accountant = User.builder()
                    .account("ketoan")
                    .name("Hoàng Minh Trí")
                    .password(defaultPassword)
                    .email("tri.hoang@stay.com")
                    .phone("0985555555")
                    .role(Role.ACCOUNTANT)
                    .active(true)
                    .build();


            userRepository.saveAll(List.of(admin, owner, receptionist, housekeeper, accountant));
            
            log.info("Đã tạo thành công các tài khoản mẫu với mật khẩu mặc định là pass@123.");
        } else {
            log.info("Dữ liệu User đã tồn tại, bỏ qua bước tạo dữ liệu mẫu User.");
        }

        if (hotelSettingRepository.count() == 0) {
            log.info("Bắt đầu khởi tạo dữ liệu mẫu cho HotelSetting...");
            HotelSetting hotelSetting = HotelSetting.builder()
                    .propertyName("Stay Away")
                    .address("Z115, Phan Đình Phùng, Tp. Thái Nguyên")
                    .phone("0365224245")
                    .email("booking@stayaway.io")
                    .defaultCheckinTime(LocalTime.parse("02:00:00"))
                    .defaultCheckoutTime(LocalTime.parse("12:00:00"))
                    .homeImage("https://i.ibb.co/TxVT7pQz/images-11-jpg.jpg")
                    .build();
            hotelSettingRepository.save(hotelSetting);
            log.info("Đã tạo thành công dữ liệu mẫu cho HotelSetting.");
        } else {
            log.info("Dữ liệu HotelSetting đã tồn tại, bỏ qua bước tạo dữ liệu mẫu.");
        }

        if (roomTypeRepository.count() == 0) {
            log.info("Bắt đầu khởi tạo dữ liệu mẫu cho RoomType, Room, ExtraService...");

            // 1. Seed RoomType
            RoomType standard = RoomType.builder()
                    .name("Standard")
                    .maxCapacity(2)
                    .basePrice(new BigDecimal("500000"))
                    .amenitiesDescription("Tivi, Điều hòa, Nóng lạnh, Wifi miễn phí")
                    .active(true)
                    .imageUrls(List.of(
                            "https://i.ibb.co/1fxxj3ZK/images-3-jpg.jpg",
                            "https://i.ibb.co/s90VKFMW/images-2-jpg.jpg",
                            "https://i.ibb.co/YBZHpwFQ/images-1-jpg.jpg"
                    ))
                    .build();

            RoomType superior = RoomType.builder()
                    .name("Superior")
                    .maxCapacity(2)
                    .basePrice(new BigDecimal("700000"))
                    .amenitiesDescription("Tivi, Điều hòa, Nóng lạnh, Wifi miễn phí, Cửa sổ lớn, Tủ lạnh nhỏ")
                    .active(true)
                    .imageUrls(List.of(
                            "https://i.ibb.co/jPHrYZ3x/images-6-jpg.jpg",
                            "https://i.ibb.co/1JtdT9mC/images-5-jpg.jpg",
                            "https://i.ibb.co/HDVrpwFY/images-4-jpg.jpg"
                    ))
                    .build();

            RoomType deluxe = RoomType.builder()
                    .name("Deluxe")
                    .maxCapacity(3)
                    .basePrice(new BigDecimal("1000000"))
                    .amenitiesDescription("Tivi, Điều hòa, Nóng lạnh, Wifi miễn phí, Ban công, Tủ lạnh, Bồn tắm")
                    .active(true)
                    .imageUrls(List.of(
                            "https://i.ibb.co/KjD3yg66/images-9-jpg.jpg",
                            "https://i.ibb.co/gMGYHYtQ/images-8-jpg.jpg",
                            "https://i.ibb.co/Zz4bVzmH/images-7-jpg.jpg"
                    ))
                    .build();

            RoomType suite = RoomType.builder()
                    .name("Suite")
                    .maxCapacity(4)
                    .basePrice(new BigDecimal("2000000"))
                    .amenitiesDescription("Phòng khách riêng, Tivi màn hình lớn, Điều hòa, Nóng lạnh, Wifi miễn phí, View biển, Tủ lạnh, Bồn tắm massage")
                    .active(true)
                    .imageUrls(List.of(
                            "https://i.ibb.co/TxVT7pQz/images-11-jpg.jpg",
                            "https://i.ibb.co/gFZ7Fnv0/images-10-jpg.jpg",
                            "https://i.ibb.co/hR4wpr5f/phong-suite-la-gi-webp.webp"
                    ))
                    .build();

            roomTypeRepository.saveAll(List.of(standard, superior, deluxe, suite));

            // 2. Seed Room
            List<Room> rooms = new ArrayList<>();
            // Tầng 1: 5 phòng Standard
            for (int i = 1; i <= 5; i++) {
                rooms.add(Room.builder().roomNumber("10" + i).floor("1").roomType(standard).status(RoomStatus.AVAILABLE).build());
            }
            // Tầng 2: 5 phòng Superior
            for (int i = 1; i <= 5; i++) {
                rooms.add(Room.builder().roomNumber("20" + i).floor("2").roomType(superior).status(RoomStatus.AVAILABLE).build());
            }
            // Tầng 3: 3 phòng Deluxe
            for (int i = 1; i <= 3; i++) {
                rooms.add(Room.builder().roomNumber("30" + i).floor("3").roomType(deluxe).status(RoomStatus.AVAILABLE).build());
            }
            // Tầng 4: 2 phòng Suite
            for (int i = 1; i <= 2; i++) {
                rooms.add(Room.builder().roomNumber("40" + i).floor("4").roomType(suite).status(RoomStatus.AVAILABLE).build());
            }
            roomRepository.saveAll(rooms);

            // 3. Seed ExtraService
            ExtraService breakfast = ExtraService.builder()
                    .name("Ăn sáng buffet")
                    .description("Buffet sáng đa dạng món ăn Âu, Á")
                    .unitPrice(new BigDecimal("150000"))
                    .unit("lượt")
                    .active(true)
                    .build();

            ExtraService airportPickup = ExtraService.builder()
                    .name("Đưa đón sân bay")
                    .description("Xe ô tô 4 chỗ hoặc 7 chỗ đưa đón tận nơi")
                    .unitPrice(new BigDecimal("300000"))
                    .unit("chuyến")
                    .active(true)
                    .build();

            ExtraService laundry = ExtraService.builder()
                    .name("Giặt là")
                    .description("Giặt sấy, là ủi quần áo")
                    .unitPrice(new BigDecimal("50000"))
                    .unit("kg")
                    .active(true)
                    .build();

            ExtraService extraBed = ExtraService.builder()
                    .name("Giường phụ (Extra bed)")
                    .description("Kê thêm giường phụ trong phòng")
                    .unitPrice(new BigDecimal("200000"))
                    .unit("giường/đêm")
                    .active(true)
                    .build();

            extraServiceRepository.saveAll(List.of(breakfast, airportPickup, laundry, extraBed));

            log.info("Đã tạo thành công dữ liệu mẫu cho RoomType, Room, ExtraService.");
        } else {
            log.info("Dữ liệu Room, RoomType, ExtraService đã tồn tại, bỏ qua bước tạo dữ liệu mẫu.");
        }
    }
}
