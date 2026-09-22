package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import plant.stay.dto.response.*;
import plant.stay.exception.BusinessException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.LegacyBookingImportService;

import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LegacyBookingImportServiceImpl implements LegacyBookingImportService {

    private final RoomRepository roomRepository;
    private final GuestRepository guestRepository;
    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final BookingImportLogRepository bookingImportLogRepository;
    private final AuditLogService auditLogService;

    private static final DateTimeFormatter[] DATE_FORMATTERS = new DateTimeFormatter[]{
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy")
    };

    @Override
    public byte[] generateExcelTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Mau_Nhap_Dat_Phong_Cu");

            // Style cho tiêu đề
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setFontHeightInPoints((short) 11);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Style cho dữ liệu mẫu
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            String[] columns = {
                    "Tên khách (*)",
                    "Số điện thoại / Liên hệ (*)",
                    "Số phòng (*)",
                    "Ngày nhận phòng (dd/MM/yyyy) (*)",
                    "Ngày trả phòng (dd/MM/yyyy) (*)",
                    "Giá tiền (VNĐ) (*)",
                    "Tình trạng thanh toán (*)",
                    "Ghi chú"
            };

            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(28);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Dữ liệu mẫu minh họa
            Object[][] sampleData = {
                    {"Nguyễn Văn An", "0901234567", "101", "01/10/2026", "03/10/2026", 1500000, "Đã thanh toán", "Khách quen cũ"},
                    {"Trần Thị Mai", "0987654321", "102", "05/10/2026", "08/10/2026", 2400000, "Chưa thanh toán", "Đặt phòng lưu trữ từ sổ sách"},
                    {"Lê Hoàng Long", "0912334455", "201", "10/10/2026", "12/10/2026", 1800000, "Một phần", "Đã cọc 500k trước khi chuyển PMS"}
            };

            int rowIdx = 1;
            for (Object[] rowData : sampleData) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(20);
                for (int col = 0; col < rowData.length; col++) {
                    Cell cell = row.createCell(col);
                    if (rowData[col] instanceof Number) {
                        cell.setCellValue(((Number) rowData[col]).doubleValue());
                    } else {
                        cell.setCellValue(rowData[col] != null ? rowData[col].toString() : "");
                    }
                    cell.setCellStyle(dataStyle);
                }
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
                sheet.setColumnWidth(i, Math.max(sheet.getColumnWidth(i), 18 * 256));
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            log.error("Lỗi khi sinh file mẫu Excel", e);
            throw new BusinessException("Không thể tạo tệp mẫu bảng tính: " + e.getMessage());
        }
    }

    @Override
    public LegacyBookingImportPreviewResponse previewImport(MultipartFile file) {
        List<LegacyBookingRowDto> parsedRows = parseSpreadsheet(file);
        return validateRows(parsedRows);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public LegacyBookingImportCommitResponse commitImport(MultipartFile file, User actor) {
        List<LegacyBookingRowDto> parsedRows = parseSpreadsheet(file);
        LegacyBookingImportPreviewResponse validation = validateRows(parsedRows);

        if (validation.getErrorCount() > 0) {
            // Ghi nhật ký bị từ chối
            bookingImportLogRepository.save(BookingImportLog.builder()
                    .fileName(file != null ? file.getOriginalFilename() : "Unknown")
                    .totalRows(validation.getTotalRows())
                    .successCount(0)
                    .errorCount(validation.getErrorCount())
                    .status("REJECTED")
                    .importedBy(actor)
                    .importedAt(LocalDateTime.now())
                    .notes("Bị từ chối do có " + validation.getErrorCount() + " dòng lỗi. Không có bản ghi nào được lưu.")
                    .build());

            throw new BusinessException("Tệp dữ liệu còn chứa " + validation.getErrorCount()
                    + " dòng lỗi. Hệ thống chỉ ghi khi toàn bộ các dòng đều hợp lệ theo nguyên tắc trọn vẹn hoặc không gì cả.");
        }

        List<LegacyBookingRowDto> validRows = validation.getPreviewRows();
        if (validRows.isEmpty()) {
            throw new BusinessException("Tệp dữ liệu không có dòng đặt phòng nào để nhập.");
        }

        LocalDate today = LocalDate.now();

        // Tiến hành ghi toàn bộ theo nguyên tắc All-or-Nothing
        for (LegacyBookingRowDto row : validRows) {
            // 1. Tìm hoặc tạo Khách hàng
            String contact = row.getContact().trim();
            Guest guest = null;
            if (contact.contains("@")) {
                guest = guestRepository.search(contact).stream().findFirst().orElse(null);
            } else {
                guest = guestRepository.findByPhone(contact).orElse(null);
            }

            if (guest == null) {
                guest = Guest.builder()
                        .name(row.getGuestName().trim())
                        .phone(contact.contains("@") ? null : contact)
                        .email(contact.contains("@") ? contact : null)
                        .loyaltyPoints(0)
                        .build();
                guest = guestRepository.save(guest);
            }

            // 2. Tìm Phòng và Loại phòng
            Room room = roomRepository.findByRoomNumber(row.getRoomNumber().trim())
                    .orElseThrow(() -> new BusinessException("Phòng " + row.getRoomNumber() + " không tồn tại."));
            RoomType roomType = room.getRoomType();

            // 3. Xác định trạng thái theo mốc thời gian
            BookingStatus status;
            LocalDateTime checkedInAt = null;
            LocalDateTime checkedOutAt = null;

            if (!row.getCheckOutDate().isAfter(today)) {
                // Đặt phòng đã qua trong quá khứ -> CHECKED_OUT
                status = BookingStatus.CHECKED_OUT;
                checkedInAt = row.getCheckInDate().atTime(14, 0);
                checkedOutAt = row.getCheckOutDate().atTime(12, 0);
            } else if (!row.getCheckInDate().isAfter(today) && row.getCheckOutDate().isAfter(today)) {
                // Đặt phòng đang trong kỳ lưu trú hiện tại -> CHECKED_IN
                status = BookingStatus.CHECKED_IN;
                checkedInAt = row.getCheckInDate().atTime(14, 0);
            } else {
                // Đặt phòng trong tương lai -> CONFIRMED
                status = BookingStatus.CONFIRMED;
            }

            // 4. Lưu Booking (mang nguồn là LEGACY_IMPORT, không thu cọc, không sinh thông báo)
            Booking booking = Booking.builder()
                    .guest(guest)
                    .room(room)
                    .roomType(roomType)
                    .checkInDate(row.getCheckInDate())
                    .checkOutDate(row.getCheckOutDate())
                    .checkedInAt(checkedInAt)
                    .checkedOutAt(checkedOutAt)
                    .status(status)
                    .expectedPrice(row.getPrice())
                    .actualPrice(status == BookingStatus.CHECKED_OUT ? row.getPrice() : null)
                    .source("LEGACY_IMPORT")
                    .depositAmount(BigDecimal.ZERO)
                    .reminderSentAt(null)
                    .note(row.getNote() != null && !row.getNote().trim().isEmpty()
                            ? "[Nhập cũ] " + row.getNote().trim()
                            : "[Nhập dữ liệu cũ từ bảng tính]")
                    .createdBy(actor)
                    .build();

            booking = bookingRepository.save(booking);

            // 5. Tự động sinh Hóa đơn & Thanh toán tương ứng
            String rawPayStatus = row.getPaymentStatus() != null ? row.getPaymentStatus().toLowerCase() : "";
            boolean isPaid = rawPayStatus.contains("đã") || rawPayStatus.contains("paid") || rawPayStatus.contains("xong");
            boolean isPartial = rawPayStatus.contains("một phần") || rawPayStatus.contains("partial") || rawPayStatus.contains("cọc");

            InvoiceStatus invoiceStatus = isPaid ? InvoiceStatus.PAID : InvoiceStatus.PENDING_PAYMENT;

            Invoice invoice = Invoice.builder()
                    .booking(booking)
                    .mode(InvoiceMode.SINGLE)
                    .roomAmount(row.getPrice())
                    .serviceAmount(BigDecimal.ZERO)
                    .discountAmount(BigDecimal.ZERO)
                    .totalAmount(row.getPrice())
                    .status(invoiceStatus)
                    .note("Hóa đơn tự động cho đặt phòng cũ nhập từ file bảng tính.")
                    .createdBy(actor)
                    .build();

            invoice = invoiceRepository.save(invoice);

            if (isPaid) {
                Payment payment = Payment.builder()
                        .invoice(invoice)
                        .amount(row.getPrice())
                        .method(PaymentMethod.CASH)
                        .note("Thanh toán hoàn tất từ dữ liệu cũ.")
                        .build();
                paymentRepository.save(payment);
            }
        }

        // 6. Ghi nhận nhật ký lịch sử nhập dữ liệu
        BookingImportLog importLog = BookingImportLog.builder()
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "legacy_import.xlsx")
                .totalRows(validRows.size())
                .successCount(validRows.size())
                .errorCount(0)
                .status("SUCCESS")
                .importedBy(actor)
                .importedAt(LocalDateTime.now())
                .notes("Nhập trọn vẹn thành công " + validRows.size() + " đặt phòng cũ vào hệ thống.")
                .build();

        importLog = bookingImportLogRepository.save(importLog);

        // 7. Ghi Audit Log hệ thống
        if (auditLogService != null) {
            auditLogService.log("Booking", null, "IMPORT_LEGACY", actor,
                    "Quản trị viên đã nhập thành công " + validRows.size() + " đặt phòng cũ từ file: " + file.getOriginalFilename());
        }

        return LegacyBookingImportCommitResponse.builder()
                .importLogId(importLog.getId())
                .totalRows(validRows.size())
                .successCount(validRows.size())
                .errorCount(0)
                .message("Đã nhập dữ liệu trọn vẹn thành công " + validRows.size() + " đặt phòng cũ.")
                .build();
    }

    @Override
    public List<BookingImportLogResponse> getImportHistory() {
        List<BookingImportLog> logs = bookingImportLogRepository.findAllByOrderByImportedAtDesc();
        List<BookingImportLogResponse> list = new ArrayList<>();
        for (BookingImportLog l : logs) {
            list.add(BookingImportLogResponse.builder()
                    .id(l.getId())
                    .fileName(l.getFileName())
                    .totalRows(l.getTotalRows())
                    .successCount(l.getSuccessCount())
                    .errorCount(l.getErrorCount())
                    .status(l.getStatus())
                    .importedById(l.getImportedBy() != null ? l.getImportedBy().getId() : null)
                    .importedByName(l.getImportedBy() != null ? l.getImportedBy().getName() : "Hệ thống")
                    .importedAt(l.getImportedAt())
                    .notes(l.getNotes())
                    .build());
        }
        return list;
    }

    /**
     * Phân tích tệp Excel (.xlsx, .xls) hoặc CSV sang danh sách các dòng thô
     */
    private List<LegacyBookingRowDto> parseSpreadsheet(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Vui lòng chọn tệp bảng tính hợp lệ để tải lên.");
        }

        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        List<LegacyBookingRowDto> rows = new ArrayList<>();

        if (fileName.endsWith(".csv")) {
            parseCsv(file, rows);
        } else {
            parseExcel(file, rows);
        }

        return rows;
    }

    private void parseExcel(MultipartFile file, List<LegacyBookingRowDto> rows) {
        try (InputStream is = file.getInputStream(); Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) return;

            int lastRow = sheet.getLastRowNum();
            for (int i = 1; i <= lastRow; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String guestName = getCellString(row.getCell(0));
                String contact = getCellString(row.getCell(1));
                String roomNumber = getCellString(row.getCell(2));
                String checkInStr = getCellString(row.getCell(3));
                String checkOutStr = getCellString(row.getCell(4));
                String priceStr = getCellString(row.getCell(5));
                String paymentStatus = getCellString(row.getCell(6));
                String note = getCellString(row.getCell(7));

                // Bỏ qua dòng hoàn toàn trống
                if (guestName.isEmpty() && contact.isEmpty() && roomNumber.isEmpty()
                        && checkInStr.isEmpty() && checkOutStr.isEmpty() && priceStr.isEmpty()) {
                    continue;
                }

                BigDecimal price = null;
                try {
                    String cleanPrice = priceStr.replaceAll("[^0-9.]", "");
                    if (!cleanPrice.isEmpty()) {
                        price = new BigDecimal(cleanPrice);
                    }
                } catch (Exception ignored) {
                }

                LocalDate checkInDate = parseDate(checkInStr);
                LocalDate checkOutDate = parseDate(checkOutStr);

                rows.add(LegacyBookingRowDto.builder()
                        .rowNumber(i + 1) // Số dòng theo người dùng nhìn thấy trong Excel
                        .guestName(guestName)
                        .contact(contact)
                        .roomNumber(roomNumber)
                        .checkInDate(checkInDate)
                        .checkOutDate(checkOutDate)
                        .price(price)
                        .paymentStatus(paymentStatus)
                        .note(note)
                        .build());
            }
        } catch (Exception e) {
            log.error("Lỗi khi đọc file Excel", e);
            throw new BusinessException("Lỗi định dạng file bảng tính: " + e.getMessage());
        }
    }

    private void parseCsv(MultipartFile file, List<LegacyBookingRowDto> rows) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            int rowNumber = 1;
            reader.readLine(); // Bỏ qua dòng tiêu đề

            while ((line = reader.readLine()) != null) {
                rowNumber++;
                if (line.trim().isEmpty()) continue;

                String[] cols = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
                if (cols.length < 5) continue;

                String guestName = cleanQuotes(cols[0]);
                String contact = cols.length > 1 ? cleanQuotes(cols[1]) : "";
                String roomNumber = cols.length > 2 ? cleanQuotes(cols[2]) : "";
                String checkInStr = cols.length > 3 ? cleanQuotes(cols[3]) : "";
                String checkOutStr = cols.length > 4 ? cleanQuotes(cols[4]) : "";
                String priceStr = cols.length > 5 ? cleanQuotes(cols[5]) : "";
                String paymentStatus = cols.length > 6 ? cleanQuotes(cols[6]) : "";
                String note = cols.length > 7 ? cleanQuotes(cols[7]) : "";

                BigDecimal price = null;
                try {
                    String cleanPrice = priceStr.replaceAll("[^0-9.]", "");
                    if (!cleanPrice.isEmpty()) price = new BigDecimal(cleanPrice);
                } catch (Exception ignored) {}

                rows.add(LegacyBookingRowDto.builder()
                        .rowNumber(rowNumber)
                        .guestName(guestName)
                        .contact(contact)
                        .roomNumber(roomNumber)
                        .checkInDate(parseDate(checkInStr))
                        .checkOutDate(parseDate(checkOutStr))
                        .price(price)
                        .paymentStatus(paymentStatus)
                        .note(note)
                        .build());
            }
        } catch (Exception e) {
            throw new BusinessException("Lỗi đọc file CSV: " + e.getMessage());
        }
    }

    private String cleanQuotes(String val) {
        if (val == null) return "";
        String s = val.trim();
        if (s.startsWith("\"") && s.endsWith("\"") && s.length() >= 2) {
            s = s.substring(1, s.length() - 1).trim();
        }
        return s;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    LocalDate d = cell.getLocalDateTimeCellValue().toLocalDate();
                    return d.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                }
                double num = cell.getNumericCellValue();
                if (num == (long) num) {
                    return String.valueOf((long) num);
                }
                return String.valueOf(num);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue().trim();
                } catch (Exception e) {
                    return String.valueOf(cell.getNumericCellValue());
                }
            default:
                return "";
        }
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) return null;
        String clean = dateStr.trim();
        for (DateTimeFormatter fmt : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(clean, fmt);
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    /**
     * Kiểm tra tính hợp lệ toàn diện của từng dòng
     */
    private LegacyBookingImportPreviewResponse validateRows(List<LegacyBookingRowDto> rows) {
        List<LegacyBookingImportErrorDto> errors = new ArrayList<>();
        List<LegacyBookingRowDto> validRows = new ArrayList<>();

        // Danh sách để kiểm tra trùng phòng ngay trong chính tệp
        List<LegacyBookingRowDto> acceptedRows = new ArrayList<>();

        for (LegacyBookingRowDto row : rows) {
            List<String> rowErrors = new ArrayList<>();

            // 1. Kiểm tra trường bắt buộc
            if (row.getGuestName() == null || row.getGuestName().trim().isEmpty()) {
                rowErrors.add("Thiếu tên khách hàng");
            }
            if (row.getContact() == null || row.getContact().trim().isEmpty()) {
                rowErrors.add("Thiếu thông tin liên hệ (SĐT hoặc Email)");
            }
            if (row.getRoomNumber() == null || row.getRoomNumber().trim().isEmpty()) {
                rowErrors.add("Thiếu số phòng");
            }

            // 2. Kiểm tra định dạng ngày
            if (row.getCheckInDate() == null) {
                rowErrors.add("Sai định dạng ngày nhận phòng (yêu cầu định dạng dd/MM/yyyy)");
            }
            if (row.getCheckOutDate() == null) {
                rowErrors.add("Sai định dạng ngày trả phòng (yêu cầu định dạng dd/MM/yyyy)");
            }

            // 3. Kiểm tra ngày trả trước hoặc bằng ngày nhận
            if (row.getCheckInDate() != null && row.getCheckOutDate() != null) {
                if (!row.getCheckOutDate().isAfter(row.getCheckInDate())) {
                    rowErrors.add("Ngày trả phòng (" + row.getCheckOutDate() + ") phải sau ngày nhận phòng (" + row.getCheckInDate() + ")");
                }
            }

            // 4. Kiểm tra phòng tồn tại trong hệ thống
            Room room = null;
            if (row.getRoomNumber() != null && !row.getRoomNumber().trim().isEmpty()) {
                Optional<Room> rOpt = roomRepository.findByRoomNumber(row.getRoomNumber().trim());
                if (rOpt.isEmpty()) {
                    rowErrors.add("Phòng '" + row.getRoomNumber() + "' không tồn tại trong hệ thống khách sạn");
                } else {
                    room = rOpt.get();
                }
            }

            // 5. Kiểm tra giá tiền
            if (row.getPrice() == null || row.getPrice().compareTo(BigDecimal.ZERO) < 0) {
                rowErrors.add("Giá tiền không hợp lệ (phải là số lớn hơn hoặc bằng 0)");
            }

            // 6. Kiểm tra trùng phòng với đặt phòng đã có trong cơ sở dữ liệu
            if (room != null && row.getCheckInDate() != null && row.getCheckOutDate() != null
                    && row.getCheckOutDate().isAfter(row.getCheckInDate())) {
                List<Booking> dbConflicts = bookingRepository.findOverlappingBookingsForRoom(
                        room.getId(), row.getCheckInDate(), row.getCheckOutDate());

                if (!dbConflicts.isEmpty()) {
                    Booking c = dbConflicts.get(0);
                    String guestName = c.getGuest() != null ? c.getGuest().getName() : "Không rõ";
                    rowErrors.add("Trùng phòng '" + room.getRoomNumber() + "' với đặt phòng #" + c.getId()
                            + " của khách " + guestName + " (" + c.getCheckInDate() + " đến " + c.getCheckOutDate() + ")");
                }

                // 7. Kiểm tra trùng phòng ngay trong chính tệp tải lên
                for (LegacyBookingRowDto prev : acceptedRows) {
                    if (prev.getRoomNumber().equalsIgnoreCase(row.getRoomNumber())) {
                        // Kiểm tra khoảng giao nhau: startA < endB && endA > startB
                        if (row.getCheckInDate().isBefore(prev.getCheckOutDate())
                                && row.getCheckOutDate().isAfter(prev.getCheckInDate())) {
                            rowErrors.add("Trùng phòng '" + row.getRoomNumber() + "' với dòng " + prev.getRowNumber()
                                    + " trong cùng tệp (" + prev.getCheckInDate() + " đến " + prev.getCheckOutDate() + ")");
                            break;
                        }
                    }
                }
            }

            if (!rowErrors.isEmpty()) {
                errors.add(LegacyBookingImportErrorDto.builder()
                        .rowNumber(row.getRowNumber())
                        .guestName(row.getGuestName() != null ? row.getGuestName() : "—")
                        .roomNumber(row.getRoomNumber() != null ? row.getRoomNumber() : "—")
                        .checkInDate(row.getCheckInDate() != null ? row.getCheckInDate().toString() : "—")
                        .checkOutDate(row.getCheckOutDate() != null ? row.getCheckOutDate().toString() : "—")
                        .reason(String.join("; ", rowErrors))
                        .build());
            } else {
                validRows.add(row);
                acceptedRows.add(row);
            }
        }

        return LegacyBookingImportPreviewResponse.builder()
                .totalRows(rows.size())
                .validCount(validRows.size())
                .errorCount(errors.size())
                .errors(errors)
                .previewRows(validRows)
                .build();
    }
}
