package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.GuestStatusDTO;
import plant.stay.dto.response.StayDeclarationResponseDTO;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.IdentityDocumentRepository;
import plant.stay.repository.StayDeclarationRepository;
import plant.stay.service.StayDeclarationService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StayDeclarationServiceImpl implements StayDeclarationService {

    private static final String COMPLETE = "COMPLETE";
    private static final String MISSING = "MISSING";
    private static final DateTimeFormatter DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final BookingRepository bookingRepository;
    private final IdentityDocumentRepository identityDocumentRepository;
    private final StayDeclarationRepository stayDeclarationRepository;

    @Override
    @Transactional(readOnly = true)
    public StayDeclarationResponseDTO getTodayDeclarations() {
        return getDeclarationsForDate(LocalDate.now());
    }

    @Override
    @Transactional(readOnly = true)
    public StayDeclarationResponseDTO getDeclarationsForDate(LocalDate date) {
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to = date.plusDays(1).atStartOfDay();
        List<Booking> bookings = bookingRepository.findCheckedInWithGuestDocumentsBetween(from, to);
        Map<Long, List<IdentityDocument>> documentsByGuestId = identityDocumentRepository
            .findByGuestIdIn(bookings.stream().map(booking -> booking.getGuest().getId()).toList())
            .stream()
            .collect(Collectors.groupingBy(document -> document.getGuest().getId()));
        Map<Long, StayDeclaration> declarationsByBookingId = stayDeclarationRepository
            .findByBookingIdIn(bookings.stream().map(Booking::getId).toList())
            .stream()
            .collect(Collectors.toMap(declaration -> declaration.getBooking().getId(), declaration -> declaration));
        List<GuestStatusDTO> guests = bookings
                .stream()
            .map(booking -> toGuestStatus(booking,
                documentsByGuestId.getOrDefault(booking.getGuest().getId(), List.of()),
                declarationsByBookingId.get(booking.getId())))
                .toList();

        int missingDocumentGuests = (int) guests.stream()
                .filter(guest -> MISSING.equals(guest.getDocumentStatus()))
                .count();
        int pendingDeclarations = (int) guests.stream()
                .filter(guest -> StayDeclarationStatus.PENDING.name().equals(guest.getDeclarationStatus()))
                .count();

        return StayDeclarationResponseDTO.builder()
                .declarationDate(date)
                .totalGuests(guests.size())
                .completeGuests(guests.size() - missingDocumentGuests)
                .missingDocumentGuests(missingDocumentGuests)
                .pendingDeclarations(pendingDeclarations)
                .guests(guests)
                .build();
    }

    @Override
    @Transactional
    public void completeDeclaration(Long bookingId, User actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking với id: " + bookingId));
        if (booking.getCheckedInAt() == null) {
            throw new IllegalArgumentException("Chỉ có thể hoàn tất khai báo cho khách đã nhận phòng");
        }

        StayDeclaration declaration = stayDeclarationRepository.findByBookingId(bookingId)
                .orElseGet(() -> StayDeclaration.builder().booking(booking).build());
        declaration.setStatus(StayDeclarationStatus.COMPLETED);
        declaration.setCompletedBy(actor);
        declaration.setCompletedAt(LocalDateTime.now());
        stayDeclarationRepository.save(declaration);
        booking.setStayDeclaration(declaration);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportDeclarationsToExcel(LocalDate date) {
        StayDeclarationResponseDTO report = getDeclarationsForDate(date);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Khai bao luu tru");
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle missingStyle = createMissingStyle(workbook);

            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("BAO CAO KHAI BAO LUU TRU - " + date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 10));

            Row summaryRow = sheet.createRow(2);
            summaryRow.createCell(0).setCellValue("Tong khach: " + report.getTotalGuests());
            summaryRow.createCell(3).setCellValue("Du du lieu: " + report.getCompleteGuests());
            summaryRow.createCell(6).setCellValue("Thieu giay to: " + report.getMissingDocumentGuests());
            summaryRow.createCell(8).setCellValue("Chua khai bao: " + report.getPendingDeclarations());

            String[] headers = {"STT", "Ten khach", "CCCD/Ho chieu", "So dien thoai", "Phong",
                    "Ngay check-in", "Gio check-in", "Trang thai giay to", "Da khai bao",
                    "Gio hoan tat", "Thong tin con thieu"};
            Row headerRow = sheet.createRow(4);
            for (int index = 0; index < headers.length; index++) {
                Cell cell = headerRow.createCell(index);
                cell.setCellValue(headers[index]);
                cell.setCellStyle(headerStyle);
            }

            int rowIndex = 5;
            int sequence = 1;
            for (GuestStatusDTO guest : report.getGuests()) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(sequence++);
                row.createCell(1).setCellValue(valueOrEmpty(guest.getGuestName()));
                row.createCell(2).setCellValue(valueOrEmpty(guest.getIdNumber()));
                row.createCell(3).setCellValue(valueOrEmpty(guest.getPhone()));
                row.createCell(4).setCellValue(valueOrEmpty(guest.getRoomNumber()));
                row.createCell(5).setCellValue(guest.getCheckedInAt() != null
                        ? guest.getCheckedInAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "");
                row.createCell(6).setCellValue(formatDateTime(guest.getCheckedInAt()));
                row.createCell(7).setCellValue(COMPLETE.equals(guest.getDocumentStatus()) ? "Du du lieu" : "Thieu giay to");
                row.createCell(8).setCellValue(StayDeclarationStatus.COMPLETED.name().equals(guest.getDeclarationStatus())
                        ? "Da khai bao" : "Chua khai bao");
                row.createCell(9).setCellValue(formatDateTime(guest.getDeclarationCompletedAt()));
                row.createCell(10).setCellValue(String.join(", ", guest.getMissingRequirements()));
                if (MISSING.equals(guest.getDocumentStatus())) {
                    for (int column = 0; column < headers.length; column++) {
                        row.getCell(column).setCellStyle(missingStyle);
                    }
                }
            }

            for (int index = 0; index < headers.length; index++) {
                sheet.autoSizeColumn(index);
                sheet.setColumnWidth(index, Math.min(sheet.getColumnWidth(index) + 512, 18000));
            }
            workbook.write(output);
            return output.toByteArray();
        } catch (Exception exception) {
            throw new IllegalStateException("Khong the xuat bao cao khai bao luu tru", exception);
        }
    }

    private GuestStatusDTO toGuestStatus(Booking booking,
                                         List<IdentityDocument> identityDocuments,
                                         StayDeclaration declaration) {
        Guest guest = booking.getGuest();
        List<String> missingRequirements = new ArrayList<>();
        if (isBlank(guest.getName())) {
            missingRequirements.add("guest name");
        }
        if (isBlank(guest.getPhone())) {
            missingRequirements.add("phone number");
        }
        if (isBlank(guest.getIdNumber())) {
            missingRequirements.add("identity document number");
        }

        Set<IdentityDocumentType> uploadedDocuments = EnumSet.noneOf(IdentityDocumentType.class);
        for (IdentityDocument document : identityDocuments) {
            if (!isBlank(document.getImageUrl())) {
                uploadedDocuments.add(document.getDocumentType());
            }
        }
        boolean hasPassport = uploadedDocuments.contains(IdentityDocumentType.PASSPORT);
        boolean hasNationalId = uploadedDocuments.contains(IdentityDocumentType.NATIONAL_ID_FRONT)
                && uploadedDocuments.contains(IdentityDocumentType.NATIONAL_ID_BACK);
        if (!hasPassport && !hasNationalId) {
            missingRequirements.add("identity document images");
        }

        StayDeclarationStatus declarationStatus = declaration == null
                ? StayDeclarationStatus.PENDING
                : declaration.getStatus();

        return GuestStatusDTO.builder()
                .bookingId(booking.getId())
                .guestId(guest.getId())
                .guestName(guest.getName())
                .phone(guest.getPhone())
                .idNumber(guest.getIdNumber())
                .roomNumber(booking.getRoom() != null ? booking.getRoom().getRoomNumber() : null)
                .checkedInAt(booking.getCheckedInAt())
                .documentStatus(missingRequirements.isEmpty() ? COMPLETE : MISSING)
                .missingRequirements(missingRequirements)
                .declarationStatus(declarationStatus.name())
                .declarationCompletedAt(declaration != null ? declaration.getCompletedAt() : null)
                .build();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 14);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private CellStyle createMissingStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LIGHT_ORANGE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private String formatDateTime(LocalDateTime value) {
        return value != null ? value.format(DATE_TIME_FORMAT) : "";
    }

    private String valueOrEmpty(String value) {
        return value != null ? value : "";
    }
}