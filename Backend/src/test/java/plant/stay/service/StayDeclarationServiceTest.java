package plant.stay.service;

import org.junit.jupiter.api.Test;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.GuestStatusDTO;
import plant.stay.dto.response.StayDeclarationResponseDTO;
import plant.stay.model.*;
import plant.stay.repository.*;

import java.math.BigDecimal;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@Transactional
class StayDeclarationServiceTest {

    @Autowired
    private StayDeclarationService stayDeclarationService;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private GuestRepository guestRepository;

    @Autowired
    private RoomTypeRepository roomTypeRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private IdentityDocumentRepository identityDocumentRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void returnsCompleteDocumentsAndCompletesDeclaration() {
        Guest guest = guestRepository.save(Guest.builder()
                .name("Declaration Guest")
                .phone("0900000001")
                .idNumber("001000000001")
                .build());
        RoomType roomType = roomTypeRepository.save(RoomType.builder()
                .name("Declaration Test Room")
                .maxCapacity(2)
                .basePrice(BigDecimal.valueOf(500000))
                .build());
        Room room = roomRepository.save(Room.builder()
                .roomNumber("DECL-101")
                .roomType(roomType)
                .floor("1")
                .build());
        Booking booking = bookingRepository.save(Booking.builder()
                .guest(guest)
                .roomType(roomType)
                .room(room)
                .checkInDate(LocalDate.now())
                .checkOutDate(LocalDate.now().plusDays(1))
                .checkedInAt(LocalDateTime.now())
                .status(BookingStatus.CHECKED_IN)
                .build());
        identityDocumentRepository.save(IdentityDocument.builder()
                .guest(guest)
                .documentType(IdentityDocumentType.NATIONAL_ID_FRONT)
                .imageUrl("https://example.test/front.jpg")
                .build());
        identityDocumentRepository.save(IdentityDocument.builder()
                .guest(guest)
                .documentType(IdentityDocumentType.NATIONAL_ID_BACK)
                .imageUrl("https://example.test/back.jpg")
                .build());

        StayDeclarationResponseDTO pendingResponse = stayDeclarationService.getTodayDeclarations();
        GuestStatusDTO pendingGuest = pendingResponse.getGuests().stream()
                .filter(item -> item.getBookingId().equals(booking.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals("COMPLETE", pendingGuest.getDocumentStatus());
        assertEquals("PENDING", pendingGuest.getDeclarationStatus());

        User receptionist = userRepository.save(User.builder()
                .account("declaration-receptionist")
                .name("Declaration Receptionist")
                .password("test-password")
                .role(Role.RECEPTIONIST)
                .build());
        stayDeclarationService.completeDeclaration(booking.getId(), receptionist);

        StayDeclarationResponseDTO completedResponse = stayDeclarationService.getTodayDeclarations();
        GuestStatusDTO completedGuest = completedResponse.getGuests().stream()
                .filter(item -> item.getBookingId().equals(booking.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals("COMPLETED", completedGuest.getDeclarationStatus());
        assertNotNull(completedGuest.getDeclarationCompletedAt());

                byte[] excelReport = stayDeclarationService.exportDeclarationsToExcel(LocalDate.now());
                try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(excelReport))) {
                        assertEquals("Khai bao luu tru", workbook.getSheetAt(0).getSheetName());
                        assertEquals("BAO CAO KHAI BAO LUU TRU - "
                                                        + LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                                        workbook.getSheetAt(0).getRow(0).getCell(0).getStringCellValue());
                } catch (Exception exception) {
                        throw new AssertionError("Excel report must be readable", exception);
                }
    }
}