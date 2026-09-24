package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import plant.stay.dto.response.ImportResultDto;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.util.AuthUtil;
import plant.stay.util.HashUtil;
import plant.stay.util.PersonalDataMasker;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/v1/data")
@CrossOrigin("*")
@RequiredArgsConstructor
@Slf4j
public class DataController {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final GuestRepository guestRepository;
    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;
    private final ExtraServiceRepository extraServiceRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final AuthUtil authUtil;

    // ==========================================
    // Import dữ liệu từ CSV (Chuẩn hóa RFC-4180 & Tương thích Excel)
    // ==========================================
    @PostMapping("/import")
    @Transactional
    public ResponseEntity<ImportResultDto> importData(@RequestParam(required = false) String type,
                                                      @RequestParam("file") MultipartFile file,
                                                      HttpServletRequest request) {
        User actor = checkAdmin(request);

        String targetType = (type != null && !type.trim().isEmpty()) ? type.trim() : request.getParameter("type");
        if (targetType == null || targetType.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ImportResultDto.builder()
                    .success(false)
                    .message("Thiếu thông tin loại dữ liệu (type) cần nhập")
                    .build());
        }
        // Xử lý trường hợp tham số bị gửi trùng (cả URL query và form-data): lấy phần tử đầu tiên
        if (targetType.contains(",")) {
            targetType = targetType.split(",")[0].trim();
        }
        targetType = targetType.trim().toLowerCase(Locale.ROOT);

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(ImportResultDto.builder()
                    .success(false)
                    .message("Tệp CSV tải lên không có dữ liệu")
                    .build());
        }

        List<String> details = new ArrayList<>();
        int importedCount = 0;
        int skippedCount = 0;
        int errorCount = 0;
        int totalRows = 0;
        long startTime = System.currentTimeMillis();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                return ResponseEntity.badRequest().body(ImportResultDto.builder()
                        .success(false)
                        .message("Tệp CSV rỗng")
                        .build());
            }

            if (headerLine.startsWith("\uFEFF")) {
                headerLine = headerLine.substring(1);
            }

            char delimiter = detectDelimiter(headerLine);
            List<String> headerCols = parseCsvLine(headerLine, delimiter);

            // Kiểm tra xem dòng đầu tiên có thực sự là tiêu đề không (nếu là số thì coi như dòng dữ liệu đầu tiên)
            boolean firstLineIsData = isDataRow(headerCols);
            List<String> currentLineCols = firstLineIsData ? headerCols : null;
            if (firstLineIsData) {
                headerCols = new ArrayList<>();
            }

            // Bản đồ vị trí cột thông minh theo tiêu đề
            int col0 = -1, col1 = -1, col2 = -1, col3 = -1, col4 = -1;
            boolean hasIdCol = !headerCols.isEmpty() && normalizeHeader(headerCols.get(0)).contains("id");

            if ("rooms".equalsIgnoreCase(targetType)) {
                col0 = findColumnIndex(headerCols, "sophong", "roomnumber", "phong");
                col1 = findColumnIndex(headerCols, "tenloaiphong", "loaiphong", "maloaiphong", "roomtype", "idloaiphong");
                col2 = findColumnIndex(headerCols, "tang", "floor");
                if (col0 < 0 || col1 < 0) {
                    col0 = hasIdCol ? 1 : 0;
                    col1 = hasIdCol ? (headerCols.size() > 3 ? 3 : 2) : 1;
                    col2 = hasIdCol ? 4 : 2;
                }
            } else if ("guests".equalsIgnoreCase(targetType)) {
                col0 = findColumnIndex(headerCols, "tenkhachhang", "tenkhach", "hovaten", "hoten", "name", "ten");
                col1 = findColumnIndex(headerCols, "sodienthoai", "dienthoai", "sdt", "phone", "tel");
                col2 = findColumnIndex(headerCols, "cccdcmnd", "cccd", "cmnd", "socccd", "idnumber", "identity");
                col3 = findColumnIndex(headerCols, "email", "mail");
                if (col0 < 0) {
                    col0 = hasIdCol ? 1 : 0;
                    col1 = hasIdCol ? 2 : 1;
                    col2 = hasIdCol ? 3 : 2;
                    col3 = hasIdCol ? 4 : 3;
                }
            } else if ("room-types".equalsIgnoreCase(targetType) || "roomtypes".equalsIgnoreCase(targetType)) {
                col0 = findColumnIndex(headerCols, "tenloaiphong", "loaiphong", "name", "ten");
                col1 = findColumnIndex(headerCols, "giacoban", "giacobanvnd", "dongia", "price", "gia");
                col2 = findColumnIndex(headerCols, "succhuatoida", "succhua", "capacity", "songuoi");
                col3 = findColumnIndex(headerCols, "motatiennghi", "tiennghi", "mota", "amenities", "description");
                if (col0 < 0 || col1 < 0) {
                    col0 = hasIdCol ? 1 : 0;
                    col1 = hasIdCol ? 2 : 1;
                    col2 = hasIdCol ? 3 : 2;
                    col3 = hasIdCol ? (headerCols.size() > 5 ? 5 : 4) : 3;
                }
            } else if ("extra-services".equalsIgnoreCase(targetType) || "extraservices".equalsIgnoreCase(targetType)) {
                col0 = findColumnIndex(headerCols, "tendichvu", "dichvu", "name", "ten");
                col1 = findColumnIndex(headerCols, "dongiavnd", "dongia", "unitprice", "price", "gia");
                col2 = findColumnIndex(headerCols, "donvitinh", "donvi", "unit");
                if (col0 < 0 || col1 < 0) {
                    col0 = hasIdCol ? 1 : 0;
                    col1 = hasIdCol ? 2 : 1;
                    col2 = hasIdCol ? 3 : 2;
                }
            } else if ("inventory".equalsIgnoreCase(targetType) || "inventory-items".equalsIgnoreCase(targetType)) {
                col0 = findColumnIndex(headerCols, "tendodung", "tenvattu", "dodung", "vattu", "name", "ten");
                col1 = findColumnIndex(headerCols, "donvitinh", "donvi", "unit");
                col2 = findColumnIndex(headerCols, "soluongton", "soluong", "tonkho", "quantity", "qty");
                col3 = findColumnIndex(headerCols, "nguongcanhbao", "canhbaoton", "nguong", "threshold");
                if (col0 < 0) {
                    col0 = hasIdCol ? 1 : 0;
                    col1 = hasIdCol ? 2 : 1;
                    col2 = hasIdCol ? 3 : 2;
                    col3 = hasIdCol ? 4 : 3;
                }
            } else if ("staff".equalsIgnoreCase(targetType) || "users".equalsIgnoreCase(targetType)) {
                col0 = findColumnIndex(headerCols, "hovaten", "hoten", "name", "ten");
                col1 = findColumnIndex(headerCols, "taikhoan", "tentaikhoan", "username", "account");
                col2 = findColumnIndex(headerCols, "sodienthoai", "sdt", "phone");
                col3 = findColumnIndex(headerCols, "email", "mail");
                col4 = findColumnIndex(headerCols, "vaitro", "phanquyen", "chucvu", "role");
                if (col0 < 0) {
                    col0 = hasIdCol ? 1 : 0;
                    col1 = hasIdCol ? 2 : 1;
                    col2 = hasIdCol ? 3 : 2;
                    col3 = hasIdCol ? 4 : 3;
                    col4 = hasIdCol ? 5 : 4;
                }
            } else {
                return ResponseEntity.badRequest().body(ImportResultDto.builder()
                        .success(false)
                        .message("Loại dữ liệu nhập không hỗ trợ: " + targetType)
                        .build());
            }

            int lineNum = firstLineIsData ? 0 : 1;
            String line;
            while (true) {
                List<String> cols;
                if (currentLineCols != null) {
                    cols = currentLineCols;
                    currentLineCols = null;
                } else {
                    line = reader.readLine();
                    if (line == null) break;
                    String trimmed = line.trim();
                    if (trimmed.isEmpty()) continue;
                    cols = parseCsvLine(trimmed, delimiter);
                }

                lineNum++;
                totalRows++;

                try {
                    if ("rooms".equalsIgnoreCase(targetType)) {
                        String roomNumber = getColValue(cols, col0, "");
                        String rtCol = getColValue(cols, col1, "");
                        String floor = getColValue(cols, col2, "1");
                        if (floor.isEmpty()) floor = "1";

                        if (roomNumber.isEmpty() || rtCol.isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Thiếu thông tin số phòng hoặc loại phòng", lineNum));
                            continue;
                        }

                        if (roomRepository.existsByRoomNumber(roomNumber)) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Phòng '%s' đã tồn tại trong hệ thống (Bỏ qua)", lineNum, roomNumber));
                            continue;
                        }

                        // Tìm RoomType theo ID hoặc Tên loại phòng
                        RoomType rt = null;
                        try {
                            Long rtId = Long.parseLong(rtCol);
                            rt = roomTypeRepository.findById(rtId).orElse(null);
                        } catch (NumberFormatException ignored) {}

                        if (rt == null) {
                            rt = roomTypeRepository.findByNameIgnoreCase(rtCol).orElse(null);
                        }

                        if (rt == null) {
                            // Tự động khởi tạo RoomType để quy trình nhập phòng luôn liền mạch
                            rt = roomTypeRepository.save(RoomType.builder()
                                    .name(rtCol)
                                    .basePrice(new BigDecimal("500000"))
                                    .maxCapacity(2)
                                    .amenitiesDescription("Tự động khởi tạo khi nhập phòng từ CSV")
                                    .active(true)
                                    .build());
                            details.add(String.format("Dòng %d: Đã tự động tạo loại phòng mới '%s' cho phòng '%s'", lineNum, rtCol, roomNumber));
                        }

                        roomRepository.save(Room.builder()
                                .roomNumber(roomNumber)
                                .roomType(rt)
                                .floor(floor)
                                .status(RoomStatus.AVAILABLE)
                                .build());
                        importedCount++;

                    } else if ("guests".equalsIgnoreCase(targetType)) {
                        String name = getColValue(cols, col0, "");
                        String phone = getColValue(cols, col1, null);
                        String idNumber = getColValue(cols, col2, null);
                        String email = getColValue(cols, col3, null);

                        if (name.isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Tên khách hàng không được để trống", lineNum));
                            continue;
                        }

                        if (phone != null && !phone.isEmpty() && guestRepository.findByPhone(phone).isPresent()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Khách hàng '%s' có SĐT '%s' đã tồn tại (Bỏ qua)", lineNum, name, phone));
                            continue;
                        }

                        guestRepository.save(Guest.builder()
                                .name(name)
                                .phone(phone != null && !phone.isEmpty() ? phone : null)
                                .idNumber(idNumber != null && !idNumber.isEmpty() ? idNumber : null)
                                .email(email != null && !email.isEmpty() ? email : null)
                                .loyaltyPoints(0)
                                .build());
                        importedCount++;

                    } else if ("room-types".equalsIgnoreCase(targetType) || "roomtypes".equalsIgnoreCase(targetType)) {
                        String name = getColValue(cols, col0, "");
                        String priceStr = getColValue(cols, col1, "");
                        String capStr = getColValue(cols, col2, "2");
                        String desc = getColValue(cols, col3, "");

                        if (name.isEmpty() || priceStr.isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Thiếu tên loại phòng hoặc giá cơ bản", lineNum));
                            continue;
                        }

                        if (roomTypeRepository.findByNameIgnoreCase(name).isPresent()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Loại phòng '%s' đã tồn tại (Bỏ qua)", lineNum, name));
                            continue;
                        }

                        BigDecimal basePrice;
                        try {
                            String cleanPrice = priceStr.replaceAll("[^0-9.]", "");
                            basePrice = new BigDecimal(cleanPrice);
                        } catch (Exception ex) {
                            errorCount++;
                            details.add(String.format("Dòng %d: Giá cơ bản '%s' không hợp lệ", lineNum, priceStr));
                            continue;
                        }

                        int maxCapacity = 2;
                        try {
                            String cleanCap = capStr.replaceAll("[^0-9]", "");
                            if (!cleanCap.isEmpty()) maxCapacity = Integer.parseInt(cleanCap);
                        } catch (Exception ignored) {}

                        roomTypeRepository.save(RoomType.builder()
                                .name(name)
                                .basePrice(basePrice)
                                .maxCapacity(maxCapacity > 0 ? maxCapacity : 2)
                                .amenitiesDescription(desc)
                                .active(true)
                                .build());
                        importedCount++;

                    } else if ("extra-services".equalsIgnoreCase(targetType) || "extraservices".equalsIgnoreCase(targetType)) {
                        String name = getColValue(cols, col0, "");
                        String priceStr = getColValue(cols, col1, "");
                        String unit = getColValue(cols, col2, "Lần");
                        if (unit.isEmpty()) unit = "Lần";

                        if (name.isEmpty() || priceStr.isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Thiếu tên dịch vụ hoặc đơn giá", lineNum));
                            continue;
                        }

                        BigDecimal unitPrice;
                        try {
                            String cleanPrice = priceStr.replaceAll("[^0-9.]", "");
                            unitPrice = new BigDecimal(cleanPrice);
                        } catch (Exception ex) {
                            errorCount++;
                            details.add(String.format("Dòng %d: Đơn giá dịch vụ '%s' không hợp lệ", lineNum, priceStr));
                            continue;
                        }

                        extraServiceRepository.save(ExtraService.builder()
                                .name(name)
                                .unitPrice(unitPrice)
                                .unit(unit)
                                .active(true)
                                .build());
                        importedCount++;

                    } else if ("inventory".equalsIgnoreCase(targetType) || "inventory-items".equalsIgnoreCase(targetType)) {
                        String name = getColValue(cols, col0, "");
                        String unit = getColValue(cols, col1, "cái");
                        String qtyStr = getColValue(cols, col2, "0");
                        String threshStr = getColValue(cols, col3, "10");

                        if (name.isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Tên đồ dùng không được để trống", lineNum));
                            continue;
                        }

                        if (inventoryItemRepository.existsByNameIgnoreCase(name)) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Đồ dùng '%s' đã có trong kho (Bỏ qua)", lineNum, name));
                            continue;
                        }

                        int qty = 0;
                        try {
                            String cleanQty = qtyStr.replaceAll("[^0-9-]", "");
                            if (!cleanQty.isEmpty()) qty = Integer.parseInt(cleanQty);
                        } catch (Exception ignored) {}

                        int threshold = 10;
                        try {
                            String cleanThresh = threshStr.replaceAll("[^0-9-]", "");
                            if (!cleanThresh.isEmpty()) threshold = Integer.parseInt(cleanThresh);
                        } catch (Exception ignored) {}

                        inventoryItemRepository.save(InventoryItem.builder()
                                .name(name)
                                .unit(unit.isEmpty() ? "cái" : unit)
                                .quantityOnHand(qty)
                                .lowStockThreshold(threshold > 0 ? threshold : 10)
                                .build());
                        importedCount++;

                    } else if ("staff".equalsIgnoreCase(targetType) || "users".equalsIgnoreCase(targetType)) {
                        String name = getColValue(cols, col0, "");
                        String account = getColValue(cols, col1, "");
                        String phone = getColValue(cols, col2, null);
                        String email = getColValue(cols, col3, null);
                        String roleStr = getColValue(cols, col4, "RECEPTIONIST");

                        if (name.isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Họ tên nhân sự không được để trống", lineNum));
                            continue;
                        }

                        if (account.isEmpty()) {
                            if (email != null && email.contains("@")) {
                                account = email.substring(0, email.indexOf("@")).toLowerCase(Locale.ROOT);
                            } else {
                                account = normalizeHeader(name);
                            }
                        }

                        if (userRepository.findByAccount(account).isPresent()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Tài khoản nhân sự '%s' đã tồn tại (Bỏ qua)", lineNum, account));
                            continue;
                        }

                        Role role = Role.RECEPTIONIST;
                        if (!roleStr.isEmpty()) {
                            try {
                                role = Role.valueOf(roleStr.trim().toUpperCase(Locale.ROOT));
                            } catch (Exception ignored) {}
                        }

                        userRepository.save(User.builder()
                                .name(name)
                                .account(account)
                                .phone(phone != null && !phone.isEmpty() ? phone : null)
                                .email(email != null && !email.isEmpty() ? email : null)
                                .role(role)
                                .password(HashUtil.hashPassword("pass@123"))
                                .active(true)
                                .build());
                        importedCount++;
                    }

                } catch (Exception ex) {
                    errorCount++;
                    details.add(String.format("Dòng %d: Lỗi không xác định - %s", lineNum, ex.getMessage()));
                }
            }

            long durationMs = System.currentTimeMillis() - startTime;

            auditLogService.log("Data", null, "IMPORT_" + targetType.toUpperCase(Locale.ROOT), actor,
                    String.format("Nhập dữ liệu %s: Thành công %d, Bỏ qua %d, Lỗi %d trên tổng số %d dòng (%d ms)",
                            targetType, importedCount, skippedCount, errorCount, totalRows, durationMs));

            String summaryMessage = String.format("Nhập dữ liệu %s hoàn tất: %d bản ghi thành công (Bỏ qua %d, Lỗi %d)",
                    targetType, importedCount, skippedCount, errorCount);

            return ResponseEntity.ok(ImportResultDto.builder()
                    .success(importedCount > 0 || (totalRows > 0 && skippedCount == totalRows))
                    .message(summaryMessage)
                    .totalRows(totalRows)
                    .importedCount(importedCount)
                    .skippedCount(skippedCount)
                    .errorCount(errorCount)
                    .durationMs(durationMs)
                    .details(details.size() > 30 ? details.subList(0, 30) : details)
                    .build());

        } catch (Exception e) {
            log.error("Lỗi khi đọc file CSV nhập dữ liệu: ", e);
            return ResponseEntity.badRequest().body(ImportResultDto.builder()
                    .success(false)
                    .message("Lỗi đọc tệp CSV: " + e.getMessage())
                    .build());
        }
    }

    // ==========================================
    // Export dữ liệu theo bảng ra CSV
    // ==========================================
    @GetMapping("/export")
    @Transactional(readOnly = true)
    public ResponseEntity<?> exportData(@RequestParam(required = false) String type,
                                         HttpServletRequest request) {
        User actor = checkAdmin(request);
        String targetType = (type != null && !type.trim().isEmpty()) ? type.trim() : request.getParameter("type");
        if (targetType == null || targetType.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Thiếu thông tin loại dữ liệu (type) cần xuất"));
        }
        targetType = targetType.trim().toLowerCase(Locale.ROOT);

        try {
            StringBuilder csv = new StringBuilder();
            // UTF-8 BOM để Excel hiển thị đúng tiếng Việt có dấu
            csv.append('\uFEFF');

            if ("bookings".equals(targetType)) {
                csv.append("Mã Booking,Khách hàng,Số điện thoại,Phòng,Loại phòng,Ngày nhận,Ngày trả,Trạng thái,Giá dự kiến,Giá thực tế,Nguồn,Ghi chú\n");
                bookingRepository.findAll().forEach(b -> {
                    csv.append(b.getId()).append(",");
                    csv.append(escapeCsv(b.getGuest() != null ? b.getGuest().getName() : "")).append(",");
                    csv.append(escapeCsv(b.getGuest() != null && b.getGuest().getPhone() != null ? PersonalDataMasker.displayPhone(b.getGuest().getPhone(), actor.getRole()) : "")).append(",");
                    csv.append(escapeCsv(b.getRoom() != null ? b.getRoom().getRoomNumber() : "Chưa xếp")).append(",");
                    csv.append(escapeCsv(b.getRoomType() != null ? b.getRoomType().getName() : "")).append(",");
                    csv.append(b.getCheckInDate() != null ? b.getCheckInDate() : "").append(",");
                    csv.append(b.getCheckOutDate() != null ? b.getCheckOutDate() : "").append(",");
                    csv.append(b.getStatus() != null ? b.getStatus() : "").append(",");
                    csv.append(b.getExpectedPrice() != null ? b.getExpectedPrice() : "").append(",");
                    csv.append(b.getActualPrice() != null ? b.getActualPrice() : "").append(",");
                    csv.append(escapeCsv(b.getSource() != null ? b.getSource() : "")).append(",");
                    csv.append(escapeCsv(b.getNote() != null ? b.getNote() : "")).append("\n");
                });

            } else if ("guests".equals(targetType)) {
                csv.append("ID,Tên khách hàng,Số điện thoại,CCCD/CMND,Email,Điểm tích lũy\n");
                guestRepository.findAll().forEach(g -> {
                    csv.append(g.getId()).append(",");
                    csv.append(escapeCsv(g.getName())).append(",");
                    csv.append(escapeCsv(PersonalDataMasker.displayPhone(g.getPhone(), actor.getRole()))).append(",");
                    csv.append(escapeCsv(PersonalDataMasker.displayIdentifier(g.getIdNumber(), actor.getRole()))).append(",");
                    csv.append(escapeCsv(PersonalDataMasker.displayEmail(g.getEmail(), actor.getRole()))).append(",");
                    csv.append(g.getLoyaltyPoints() != null ? g.getLoyaltyPoints() : 0).append("\n");
                });

            } else if ("rooms".equals(targetType)) {
                csv.append("ID,Số phòng,ID Loại phòng,Tên Loại phòng,Tầng,Trạng thái\n");
                roomRepository.findAll().forEach(r -> {
                    csv.append(r.getId()).append(",");
                    csv.append(escapeCsv(r.getRoomNumber())).append(",");
                    csv.append(r.getRoomType() != null ? r.getRoomType().getId() : 0).append(",");
                    csv.append(escapeCsv(r.getRoomType() != null ? r.getRoomType().getName() : "")).append(",");
                    csv.append(escapeCsv(r.getFloor() != null ? r.getFloor() : "")).append(",");
                    csv.append(r.getStatus() != null ? r.getStatus() : "").append("\n");
                });

            } else if ("room-types".equals(targetType) || "roomtypes".equals(targetType)) {
                csv.append("ID,Tên loại phòng,Giá cơ bản (VNĐ),Sức chứa tối đa,Trạng thái,Mô tả tiện nghi\n");
                roomTypeRepository.findAll().forEach(rt -> {
                    csv.append(rt.getId()).append(",");
                    csv.append(escapeCsv(rt.getName())).append(",");
                    csv.append(rt.getBasePrice() != null ? rt.getBasePrice() : "").append(",");
                    csv.append(rt.getMaxCapacity()).append(",");
                    csv.append(rt.isActive() ? "Hoạt động" : "Tạm ẩn").append(",");
                    csv.append(escapeCsv(rt.getAmenitiesDescription() != null ? rt.getAmenitiesDescription() : "")).append("\n");
                });

            } else if ("extra-services".equals(targetType) || "extraservices".equals(targetType)) {
                csv.append("ID,Tên dịch vụ,Đơn giá (VNĐ),Đơn vị tính,Trạng thái\n");
                extraServiceRepository.findAll().forEach(es -> {
                    csv.append(es.getId()).append(",");
                    csv.append(escapeCsv(es.getName())).append(",");
                    csv.append(es.getUnitPrice() != null ? es.getUnitPrice() : "").append(",");
                    csv.append(escapeCsv(es.getUnit() != null ? es.getUnit() : "")).append(",");
                    csv.append(es.isActive() ? "Hoạt động" : "Tạm ẩn").append("\n");
                });

            } else if ("invoices".equals(targetType)) {
                csv.append("Mã Hóa đơn,Mã Booking,Tiền phòng,Tiền dịch vụ,Giảm giá,Tổng tiền,Trạng thái,Ngày tạo\n");
                invoiceRepository.findAll().forEach(inv -> {
                    csv.append(inv.getId()).append(",");
                    csv.append(inv.getBooking() != null ? inv.getBooking().getId() : 0).append(",");
                    csv.append(inv.getRoomAmount() != null ? inv.getRoomAmount() : 0).append(",");
                    csv.append(inv.getServiceAmount() != null ? inv.getServiceAmount() : 0).append(",");
                    csv.append(inv.getDiscountAmount() != null ? inv.getDiscountAmount() : 0).append(",");
                    csv.append(inv.getTotalAmount() != null ? inv.getTotalAmount() : 0).append(",");
                    csv.append(inv.getStatus() != null ? inv.getStatus() : "").append(",");
                    csv.append(inv.getCreatedAt() != null ? inv.getCreatedAt() : "").append("\n");
                });

            } else if ("inventory".equals(targetType) || "inventory-items".equals(targetType)) {
                csv.append("ID,Tên đồ dùng,Đơn vị tính,Số lượng tồn,Ngưỡng cảnh báo,Ngày cập nhật\n");
                inventoryItemRepository.findAll().forEach(item -> {
                    csv.append(item.getId()).append(",");
                    csv.append(escapeCsv(item.getName())).append(",");
                    csv.append(escapeCsv(item.getUnit() != null ? item.getUnit() : "")).append(",");
                    csv.append(item.getQuantityOnHand() != null ? item.getQuantityOnHand() : 0).append(",");
                    csv.append(item.getLowStockThreshold() != null ? item.getLowStockThreshold() : 10).append(",");
                    csv.append(item.getUpdatedAt() != null ? item.getUpdatedAt() : "").append("\n");
                });

            } else if ("staff".equals(targetType) || "users".equals(targetType)) {
                csv.append("ID,Họ và tên,Tài khoản,Số điện thoại,Email,Vai trò,Trạng thái\n");
                userRepository.findAll().forEach(u -> {
                    csv.append(u.getId()).append(",");
                    csv.append(escapeCsv(u.getName())).append(",");
                    csv.append(escapeCsv(u.getAccount())).append(",");
                    csv.append(escapeCsv(u.getPhone() != null ? u.getPhone() : "")).append(",");
                    csv.append(escapeCsv(u.getEmail() != null ? u.getEmail() : "")).append(",");
                    csv.append(u.getRole() != null ? u.getRole() : "").append(",");
                    csv.append(u.isActive() ? "Hoạt động" : "Khóa").append("\n");
                });

            } else {
                return ResponseEntity.badRequest().body(new MessageResponse("Loại bảng không hỗ trợ: " + targetType));
            }

            auditLogService.log("Data", null, "EXPORT_" + targetType.toUpperCase(Locale.ROOT), actor, "Xuất dữ liệu bảng " + targetType);
            byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "stayaway_" + targetType + "_" + timestamp + ".csv";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                    .contentLength(bytes.length)
                    .body(bytes);

        } catch (Exception ex) {
            log.error("Lỗi khi xuất CSV cho loại {}: ", targetType, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Lỗi trích xuất dữ liệu bảng " + targetType + ": " + ex.getMessage()));
        }
    }

    // ==========================================
    // TIỆN ÍCH PARSER & NORMALIZER CSV
    // ==========================================
    public static List<String> parseCsvLine(String line) {
        return parseCsvLine(line, ',');
    }

    public static List<String> parseCsvLine(String line, char delimiter) {
        List<String> values = new ArrayList<>();
        if (line == null) return values;

        // Xóa BOM nếu có ở đầu dòng
        if (line.startsWith("\uFEFF")) {
            line = line.substring(1);
        }

        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;
        char[] chars = line.toCharArray();

        for (int i = 0; i < chars.length; i++) {
            char c = chars[i];
            if (c == '"') {
                if (inQuotes && i + 1 < chars.length && chars[i + 1] == '"') {
                    sb.append('"');
                    i++; // skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == delimiter && !inQuotes) {
                values.add(sb.toString().trim());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        values.add(sb.toString().trim());
        return values;
    }

    private static char detectDelimiter(String headerLine) {
        if (headerLine == null || headerLine.isEmpty()) return ',';
        int commas = 0;
        int semicolons = 0;
        int tabs = 0;
        boolean inQuotes = false;
        for (char c : headerLine.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (!inQuotes) {
                if (c == ',') commas++;
                else if (c == ';') semicolons++;
                else if (c == '\t') tabs++;
            }
        }
        if (semicolons > commas && semicolons >= tabs) return ';';
        if (tabs > commas && tabs > semicolons) return '\t';
        return ',';
    }

    private static String normalizeHeader(String h) {
        if (h == null) return "";
        String normalized = Normalizer.normalize(h, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalized.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private static int findColumnIndex(List<String> headers, String... keywords) {
        if (headers == null || headers.isEmpty()) return -1;
        for (int i = 0; i < headers.size(); i++) {
            String norm = normalizeHeader(headers.get(i));
            for (String kw : keywords) {
                if (norm.equals(kw) || norm.contains(kw)) {
                    return i;
                }
            }
        }
        return -1;
    }

    private static String getColValue(List<String> cols, int index, String defaultVal) {
        if (cols == null || index < 0 || index >= cols.size()) return defaultVal;
        String val = cols.get(index);
        return (val != null && !val.trim().isEmpty()) ? val.trim() : defaultVal;
    }

    private static boolean isDataRow(List<String> cols) {
        if (cols == null || cols.isEmpty()) return false;
        String first = cols.get(0).trim();
        // Nếu trường đầu tiên thuần số, đây nhiều khả năng là dòng dữ liệu (phòng/ID) không có dòng header
        return first.matches("\\d+");
    }

    private static String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains(";") || val.contains("\t") || val.contains("\"") || val.contains("\n") || val.contains("\r")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }

    private User checkAdmin(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN)) {
            throw new UnauthorizedException("Chỉ OWNER hoặc ADMIN mới có quyền nhập/xuất dữ liệu hệ thống");
        }
        return user;
    }
}
