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
import plant.stay.service.AuditLogService;
import plant.stay.service.StayDeclarationService;
import plant.stay.util.PersonalDataMasker;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
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
    private final AuditLogService auditLogService;

    // ────────────────────────────────────────────────────────────────────────────
    // NCL-12-CN-002: Lấy danh sách khai báo theo ngày, mask số giấy tờ theo QTN-24
    // ────────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public StayDeclarationResponseDTO getTodayDeclarations(Role actorRole) {
        return getDeclarationsForDate(LocalDate.now(), actorRole);
    }

    @Override
    @Transactional(readOnly = true)
    public StayDeclarationResponseDTO getDeclarationsForDate(LocalDate date, Role actorRole) {
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to = date.plusDays(1).atStartOfDay();
        List<Booking> bookings = bookingRepository.findCheckedInWithGuestDocumentsBetween(from, to);

        Map<Long, List<IdentityDocument>> documentsByGuestId = identityDocumentRepository
            .findByGuestIdIn(bookings.stream().map(b -> b.getGuest().getId()).toList())
            .stream()
            .collect(Collectors.groupingBy(d -> d.getGuest().getId()));

        Map<Long, StayDeclaration> declarationsByBookingId = stayDeclarationRepository
            .findByBookingIdIn(bookings.stream().map(Booking::getId).toList())
            .stream()
            .collect(Collectors.toMap(d -> d.getBooking().getId(), d -> d));

        // QTN-24: RECEPTIONIST và OWNER xem đầy đủ; các vai trò khác thấy mask
        boolean canViewFull = actorRole == Role.RECEPTIONIST || actorRole == Role.OWNER;

        List<GuestStatusDTO> guests = bookings.stream()
            .map(booking -> toGuestStatus(
                booking,
                documentsByGuestId.getOrDefault(booking.getGuest().getId(), List.of()),
                declarationsByBookingId.get(booking.getId()),
                canViewFull))
            .toList();

        long missingDocumentGuests = guests.stream()
            .filter(g -> MISSING.equals(g.getDocumentStatus())).count();
        long pendingDeclarations = guests.stream()
            .filter(g -> StayDeclarationStatus.PENDING.name().equals(g.getDeclarationStatus())).count();

        // Kiểm tra cảnh báo gần 23h (theo luật khai báo lưu trú)
        boolean nearDeadline = LocalDateTime.now().getHour() >= 22;

        return StayDeclarationResponseDTO.builder()
                .declarationDate(date)
                .totalGuests(guests.size())
                .completeGuests((int) (guests.size() - missingDocumentGuests))
                .missingDocumentGuests((int) missingDocumentGuests)
                .pendingDeclarations((int) pendingDeclarations)
                .nearDeadlineWarning(nearDeadline && pendingDeclarations > 0)
                .guests(guests)
                .build();
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Đánh dấu đã khai báo xong
    // ────────────────────────────────────────────────────────────────────────────

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

        auditLogService.log("StayDeclaration", booking.getId(), "COMPLETE_DECLARATION", actor,
            "Hoàn tất khai báo lưu trú cho booking #" + bookingId
            + " (khách: " + booking.getGuest().getName() + ")");
    }

    // ────────────────────────────────────────────────────────────────────────────
    // NCL-12-CN-003: Kết xuất Excel + ghi AuditLog (QTN-24 áp dụng mask trong file)
    // ────────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public byte[] exportAndLogDeclarations(LocalDate date, User actor) {
        // QTN-24: RECEPTIONIST và OWNER xuất đầy đủ; vai trò khác mask
        boolean canViewFull = actor.getRole() == Role.RECEPTIONIST || actor.getRole() == Role.OWNER;
        StayDeclarationResponseDTO report = getDeclarationsForDate(date, actor.getRole());
        byte[] data = buildExcel(date, report, canViewFull);

        // Ghi nhật ký kết xuất — NCL-12-CN-006 ghi đây để trace
        auditLogService.log("GuestPersonalData", null, "EXPORT_STAY_DECLARATION", actor,
            "Kết xuất danh sách khai báo lưu trú ngày " + date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
            + " gồm " + report.getTotalGuests() + " khách"
            + (canViewFull ? "" : " [số giấy tờ đã che theo QTN-24]"));

        return data;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ────────────────────────────────────────────────────────────────────────────

    private GuestStatusDTO toGuestStatus(Booking booking,
                                         List<IdentityDocument> identityDocuments,
                                         StayDeclaration declaration,
                                         boolean canViewFullId) {
        Guest guest = booking.getGuest();
        List<String> missingRequirements = new ArrayList<>();
        if (isBlank(guest.getName())) missingRequirements.add("Họ tên khách");
        if (isBlank(guest.getPhone())) missingRequirements.add("Số điện thoại");
        if (isBlank(guest.getIdNumber())) missingRequirements.add("Số CCCD/hộ chiếu");

        Set<IdentityDocumentType> uploaded = EnumSet.noneOf(IdentityDocumentType.class);
        for (IdentityDocument doc : identityDocuments) {
            if (!isBlank(doc.getImageUrl())) uploaded.add(doc.getDocumentType());
        }
        boolean hasDocument = !uploaded.isEmpty();

        if (!hasDocument) {
            missingRequirements.add("Ảnh giấy tờ tùy thân");
        }

        StayDeclarationStatus declarationStatus = declaration == null
                ? StayDeclarationStatus.PENDING : declaration.getStatus();

        // QTN-24: mask số giấy tờ
        String rawId = guest.getIdNumber();
        String displayId = maskIdNumber(rawId, canViewFullId);
        boolean isMasked = rawId != null && !rawId.equals(displayId);

        List<plant.stay.dto.response.DocumentDTO> docs = identityDocuments.stream()
                .filter(d -> !isBlank(d.getImageUrl()))
                .map(d -> plant.stay.dto.response.DocumentDTO.builder()
                        .type(d.getDocumentType().name())
                        .url(d.getImageUrl())
                        .build())
                .toList();

        return GuestStatusDTO.builder()
                .bookingId(booking.getId())
                .guestId(guest.getId())
                .guestName(guest.getName())
                .phone(guest.getPhone())
                .idNumber(displayId)
                .idNumberMasked(isMasked)
                .roomNumber(booking.getRoom() != null ? booking.getRoom().getRoomNumber() : null)
                .checkedInAt(booking.getCheckedInAt())
                .checkInDate(booking.getCheckInDate())
                .checkOutDate(booking.getCheckOutDate())
                .documentStatus(missingRequirements.isEmpty() ? COMPLETE : MISSING)
                .missingRequirements(missingRequirements)
                .documents(docs)
                .declarationStatus(declarationStatus.name())
                .declarationCompletedAt(declaration != null ? declaration.getCompletedAt() : null)
                .build();
    }

    /**
     * QTN-24: Che số giấy tờ — hiển thị 4 ký tự cuối, phần đầu thay bằng dấu sao.
     * VD: "001234567890" → "********7890"
     */
    private String maskIdNumber(String idNumber, boolean canViewFull) {
        if (idNumber == null || idNumber.isBlank()) return idNumber;
        if (canViewFull) return idNumber;
        int len = idNumber.length();
        if (len <= 4) return "****";
        return "*".repeat(len - 4) + idNumber.substring(len - 4);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Excel builder (NCL-12-CN-003)
    // ────────────────────────────────────────────────────────────────────────────

    private byte[] buildExcel(LocalDate date, StayDeclarationResponseDTO report, boolean canViewFull) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Khai bao luu tru");
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle missingStyle = createMissingStyle(workbook);
            CellStyle warnStyle = createWarnStyle(workbook);

            // Tiêu đề chính
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("DANH SACH KHAI BAO LUU TRU - " + date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 11));

            // Dòng ghi chú che dữ liệu nếu không có quyền
            if (!canViewFull) {
                Row noteRow = sheet.createRow(1);
                Cell noteCell = noteRow.createCell(0);
                noteCell.setCellValue("[QTN-24] So giay to da duoc che theo quyen truy cap - Chi OWNER/LE TAN xem duoc day du");
                noteCell.setCellStyle(warnStyle);
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(1, 1, 0, 11));
            }

            // Summary
            Row summaryRow = sheet.createRow(2);
            summaryRow.createCell(0).setCellValue("Tong khach: " + report.getTotalGuests());
            summaryRow.createCell(3).setCellValue("Du du lieu: " + report.getCompleteGuests());
            summaryRow.createCell(6).setCellValue("Thieu giay to: " + report.getMissingDocumentGuests());
            summaryRow.createCell(9).setCellValue("Chua khai bao: " + report.getPendingDeclarations());

            // Header
            String[] headers = {"STT", "Ho ten khach", "So CCCD/Ho chieu", "So dien thoai", "Phong",
                    "Ngay nhan phong", "Ngay tra phong", "Gio check-in", "Tinh trang giay to",
                    "Da khai bao", "Gio hoan tat", "Thong tin con thieu"};
            Row headerRow = sheet.createRow(4);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIndex = 5, seq = 1;
            for (GuestStatusDTO guest : report.getGuests()) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(seq++);
                row.createCell(1).setCellValue(valueOrEmpty(guest.getGuestName()));
                row.createCell(2).setCellValue(valueOrEmpty(guest.getIdNumber()));
                row.createCell(3).setCellValue(valueOrEmpty(guest.getPhone()));
                row.createCell(4).setCellValue(valueOrEmpty(guest.getRoomNumber()));
                row.createCell(5).setCellValue(guest.getCheckInDate() != null
                        ? guest.getCheckInDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "");
                row.createCell(6).setCellValue(guest.getCheckOutDate() != null
                        ? guest.getCheckOutDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "");
                row.createCell(7).setCellValue(formatDateTime(guest.getCheckedInAt()));
                row.createCell(8).setCellValue(COMPLETE.equals(guest.getDocumentStatus()) ? "Du du lieu" : "Thieu giay to");
                row.createCell(9).setCellValue(StayDeclarationStatus.COMPLETED.name().equals(guest.getDeclarationStatus())
                        ? "Da khai bao" : "Chua khai bao");
                row.createCell(10).setCellValue(formatDateTime(guest.getDeclarationCompletedAt()));
                row.createCell(11).setCellValue(String.join(", ", guest.getMissingRequirements()));
                if (MISSING.equals(guest.getDocumentStatus())) {
                    for (int c = 0; c < headers.length; c++) {
                        if (row.getCell(c) != null) row.getCell(c).setCellStyle(missingStyle);
                    }
                }
            }
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, Math.min(sheet.getColumnWidth(i) + 512, 20000));
            }
            workbook.write(output);
            return output.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Khong the xuat bao cao khai bao luu tru", e);
        }
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

    private CellStyle createWarnStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setItalic(true);
        font.setColor(IndexedColors.DARK_RED.getIndex());
        style.setFont(font);
        return style;
    }

    private String formatDateTime(LocalDateTime value) {
        return value != null ? value.format(DATE_TIME_FORMAT) : "";
    }

    private String valueOrEmpty(String value) {
        return value != null ? value : "";
    }
}