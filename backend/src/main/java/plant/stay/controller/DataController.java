package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

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
    // Import dữ liệu từ CSV (Chuẩn hóa RFC-4180)
    // ==========================================
    @PostMapping("/import")
    public ResponseEntity<ImportResultDto> importData(@RequestParam String type,
                                                      @RequestParam("file") MultipartFile file,
                                                      HttpServletRequest request) {
        User actor = checkAdmin(request);

        if (file.isEmpty()) {
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
            String line = reader.readLine(); // Bỏ qua dòng tiêu đề (Header)
            if (line == null) {
                return ResponseEntity.badRequest().body(ImportResultDto.builder()
                        .success(false)
                        .message("Tệp CSV rỗng")
                        .build());
            }

            int lineNum = 1;
            while ((line = reader.readLine()) != null) {
                lineNum++;
                String trimmed = line.trim();
                if (trimmed.isEmpty()) continue;

                totalRows++;
                List<String> cols = parseCsvLine(trimmed);

                try {
                    if ("rooms".equalsIgnoreCase(type)) {
                        if (cols.size() < 2 || cols.get(0).isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Thiếu thông tin số phòng hoặc loại phòng", lineNum));
                            continue;
                        }
                        String roomNumber = cols.get(0);
                        String rtCol = cols.get(1);
                        String floor = cols.size() > 2 && !cols.get(2).isEmpty() ? cols.get(2) : "1";

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
                            errorCount++;
                            details.add(String.format("Dòng %d: Không tìm thấy loại phòng '%s' cho phòng '%s'", lineNum, rtCol, roomNumber));
                            continue;
                        }

                        roomRepository.save(Room.builder()
                                .roomNumber(roomNumber)
                                .roomType(rt)
                                .floor(floor)
                                .status(RoomStatus.AVAILABLE)
                                .build());
                        importedCount++;

                    } else if ("guests".equalsIgnoreCase(type)) {
                        if (cols.isEmpty() || cols.get(0).isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Tên khách hàng không được để trống", lineNum));
                            continue;
                        }
                        String name = cols.get(0);
                        String phone = cols.size() > 1 && !cols.get(1).isEmpty() ? cols.get(1) : null;
                        String idNumber = cols.size() > 2 && !cols.get(2).isEmpty() ? cols.get(2) : null;
                        String email = cols.size() > 3 && !cols.get(3).isEmpty() ? cols.get(3) : null;

                        if (phone != null && guestRepository.findByPhone(phone).isPresent()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Khách hàng '%s' có SĐT '%s' đã tồn tại (Bỏ qua)", lineNum, name, phone));
                            continue;
                        }

                        guestRepository.save(Guest.builder()
                                .name(name)
                                .phone(phone)
                                .idNumber(idNumber)
                                .email(email)
                                .loyaltyPoints(0)
                                .build());
                        importedCount++;

                    } else if ("room-types".equalsIgnoreCase(type) || "roomtypes".equalsIgnoreCase(type)) {
                        if (cols.size() < 2 || cols.get(0).isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Thiếu tên loại phòng hoặc giá cơ bản", lineNum));
                            continue;
                        }
                        String name = cols.get(0);

                        if (roomTypeRepository.findByNameIgnoreCase(name).isPresent()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Loại phòng '%s' đã tồn tại (Bỏ qua)", lineNum, name));
                            continue;
                        }

                        BigDecimal basePrice;
                        try {
                            String priceStr = cols.get(1).replaceAll("[^0-9.]", "");
                            basePrice = new BigDecimal(priceStr);
                        } catch (Exception ex) {
                            errorCount++;
                            details.add(String.format("Dòng %d: Giá cơ bản '%s' không hợp lệ", lineNum, cols.get(1)));
                            continue;
                        }

                        int maxCapacity = 2;
                        if (cols.size() > 2 && !cols.get(2).isEmpty()) {
                            try {
                                maxCapacity = Integer.parseInt(cols.get(2).replaceAll("[^0-9]", ""));
                            } catch (Exception ignored) {}
                        }
                        String desc = cols.size() > 3 ? cols.get(3) : "";

                        roomTypeRepository.save(RoomType.builder()
                                .name(name)
                                .basePrice(basePrice)
                                .maxCapacity(maxCapacity)
                                .amenitiesDescription(desc)
                                .active(true)
                                .build());
                        importedCount++;

                    } else if ("extra-services".equalsIgnoreCase(type) || "extraservices".equalsIgnoreCase(type)) {
                        if (cols.size() < 2 || cols.get(0).isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Thiếu tên dịch vụ hoặc đơn giá", lineNum));
                            continue;
                        }
                        String name = cols.get(0);

                        BigDecimal unitPrice;
                        try {
                            String priceStr = cols.get(1).replaceAll("[^0-9.]", "");
                            unitPrice = new BigDecimal(priceStr);
                        } catch (Exception ex) {
                            errorCount++;
                            details.add(String.format("Dòng %d: Đơn giá dịch vụ '%s' không hợp lệ", lineNum, cols.get(1)));
                            continue;
                        }

                        String unit = cols.size() > 2 && !cols.get(2).isEmpty() ? cols.get(2) : "Lần";

                        extraServiceRepository.save(ExtraService.builder()
                                .name(name)
                                .unitPrice(unitPrice)
                                .unit(unit)
                                .active(true)
                                .build());
                        importedCount++;

                    } else if ("inventory".equalsIgnoreCase(type) || "inventory-items".equalsIgnoreCase(type)) {
                        if (cols.isEmpty() || cols.get(0).isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Tên đồ dùng không được để trống", lineNum));
                            continue;
                        }
                        String name = cols.get(0);
                        if (inventoryItemRepository.existsByNameIgnoreCase(name)) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Đồ dùng '%s' đã có trong kho (Bỏ qua)", lineNum, name));
                            continue;
                        }

                        String unit = cols.size() > 1 && !cols.get(1).isEmpty() ? cols.get(1) : "cái";
                        int qty = 0;
                        if (cols.size() > 2 && !cols.get(2).isEmpty()) {
                            try {
                                qty = Integer.parseInt(cols.get(2).replaceAll("[^0-9-]", ""));
                            } catch (Exception ignored) {}
                        }
                        int threshold = 10;
                        if (cols.size() > 3 && !cols.get(3).isEmpty()) {
                            try {
                                threshold = Integer.parseInt(cols.get(3).replaceAll("[^0-9-]", ""));
                            } catch (Exception ignored) {}
                        }

                        inventoryItemRepository.save(InventoryItem.builder()
                                .name(name)
                                .unit(unit)
                                .quantityOnHand(qty)
                                .lowStockThreshold(threshold)
                                .build());
                        importedCount++;

                    } else if ("staff".equalsIgnoreCase(type) || "users".equalsIgnoreCase(type)) {
                        if (cols.size() < 2 || cols.get(0).isEmpty() || cols.get(1).isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Thiếu họ tên hoặc tên tài khoản nhân sự", lineNum));
                            continue;
                        }
                        String name = cols.get(0);
                        String account = cols.get(1);

                        if (userRepository.findByAccount(account).isPresent()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Tài khoản nhân sự '%s' đã tồn tại (Bỏ qua)", lineNum, account));
                            continue;
                        }

                        String phone = cols.size() > 2 && !cols.get(2).isEmpty() ? cols.get(2) : null;
                        String email = cols.size() > 3 && !cols.get(3).isEmpty() ? cols.get(3) : null;
                        Role role = Role.RECEPTIONIST;
                        if (cols.size() > 4 && !cols.get(4).isEmpty()) {
                            try {
                                role = Role.valueOf(cols.get(4).trim().toUpperCase());
                            } catch (Exception ignored) {}
                        }

                        userRepository.save(User.builder()
                                .name(name)
                                .account(account)
                                .phone(phone)
                                .email(email)
                                .role(role)
                                .password(HashUtil.hashPassword("pass@123"))
                                .active(true)
                                .build());
                        importedCount++;

                    } else {
                        return ResponseEntity.badRequest().body(ImportResultDto.builder()
                                .success(false)
                                .message("Loại dữ liệu nhập không hỗ trợ: " + type)
                                .build());
                    }

                } catch (Exception ex) {
                    errorCount++;
                    details.add(String.format("Dòng %d: Lỗi không xác định - %s", lineNum, ex.getMessage()));
                }
            }

            long durationMs = System.currentTimeMillis() - startTime;

            auditLogService.log("Data", null, "IMPORT_" + type.toUpperCase(), actor,
                    String.format("Nhập dữ liệu %s: Thành công %d, Bỏ qua %d, Lỗi %d trên tổng số %d dòng (%d ms)",
                            type, importedCount, skippedCount, errorCount, totalRows, durationMs));

            String summaryMessage = String.format("Nhập dữ liệu %s thành công %d bản ghi (Bỏ qua %d, Lỗi %d)",
                    type, importedCount, skippedCount, errorCount);

            return ResponseEntity.ok(ImportResultDto.builder()
                    .success(errorCount == 0 && importedCount > 0)
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
    public ResponseEntity<byte[]> exportData(@RequestParam String type,
                                             HttpServletRequest request) {
        User actor = checkAdmin(request);
        StringBuilder csv = new StringBuilder();
        // UTF-8 BOM để Excel hiển thị đúng tiếng Việt có dấu
        csv.append('\uFEFF');

        if ("bookings".equalsIgnoreCase(type)) {
            csv.append("Mã Booking,Khách hàng,Số điện thoại,Phòng,Loại phòng,Ngày nhận,Ngày trả,Trạng thái,Giá dự kiến,Giá thực tế,Nguồn,Ghi chú\n");
            bookingRepository.findAll().forEach(b -> {
                csv.append(b.getId()).append(",");
                csv.append(escapeCsv(b.getGuest() != null ? b.getGuest().getName() : "")).append(",");
                csv.append(escapeCsv(b.getGuest() != null && b.getGuest().getPhone() != null ? b.getGuest().getPhone() : "")).append(",");
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

        } else if ("guests".equalsIgnoreCase(type)) {
            csv.append("ID,Tên khách hàng,Số điện thoại,CCCD/CMND,Email,Điểm tích lũy\n");
            guestRepository.findAll().forEach(g -> {
                csv.append(g.getId()).append(",");
                csv.append(escapeCsv(g.getName())).append(",");
                csv.append(escapeCsv(PersonalDataMasker.displayPhone(g.getPhone(), actor.getRole()))).append(",");
                csv.append(escapeCsv(PersonalDataMasker.displayIdentifier(g.getIdNumber(), actor.getRole()))).append(",");
                csv.append(escapeCsv(PersonalDataMasker.displayEmail(g.getEmail(), actor.getRole()))).append(",");
                csv.append(g.getLoyaltyPoints() != null ? g.getLoyaltyPoints() : 0).append("\n");
            });

        } else if ("rooms".equalsIgnoreCase(type)) {
            csv.append("ID,Số phòng,ID Loại phòng,Tên Loại phòng,Tầng,Trạng thái\n");
            roomRepository.findAll().forEach(r -> {
                csv.append(r.getId()).append(",");
                csv.append(escapeCsv(r.getRoomNumber())).append(",");
                csv.append(r.getRoomType() != null ? r.getRoomType().getId() : 0).append(",");
                csv.append(escapeCsv(r.getRoomType() != null ? r.getRoomType().getName() : "")).append(",");
                csv.append(escapeCsv(r.getFloor() != null ? r.getFloor() : "")).append(",");
                csv.append(r.getStatus() != null ? r.getStatus() : "").append("\n");
            });

        } else if ("room-types".equalsIgnoreCase(type) || "roomtypes".equalsIgnoreCase(type)) {
            csv.append("ID,Tên loại phòng,Giá cơ bản (VNĐ),Sức chứa tối đa,Trạng thái,Mô tả tiện nghi\n");
            roomTypeRepository.findAll().forEach(rt -> {
                csv.append(rt.getId()).append(",");
                csv.append(escapeCsv(rt.getName())).append(",");
                csv.append(rt.getBasePrice() != null ? rt.getBasePrice() : "").append(",");
                csv.append(rt.getMaxCapacity()).append(",");
                csv.append(rt.isActive() ? "Hoạt động" : "Tạm ẩn").append(",");
                csv.append(escapeCsv(rt.getAmenitiesDescription() != null ? rt.getAmenitiesDescription() : "")).append("\n");
            });

        } else if ("extra-services".equalsIgnoreCase(type) || "extraservices".equalsIgnoreCase(type)) {
            csv.append("ID,Tên dịch vụ,Đơn giá (VNĐ),Đơn vị tính,Trạng thái\n");
            extraServiceRepository.findAll().forEach(es -> {
                csv.append(es.getId()).append(",");
                csv.append(escapeCsv(es.getName())).append(",");
                csv.append(es.getUnitPrice() != null ? es.getUnitPrice() : "").append(",");
                csv.append(escapeCsv(es.getUnit() != null ? es.getUnit() : "")).append(",");
                csv.append(es.isActive() ? "Hoạt động" : "Tạm ẩn").append("\n");
            });

        } else if ("invoices".equalsIgnoreCase(type)) {
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

        } else if ("inventory".equalsIgnoreCase(type) || "inventory-items".equalsIgnoreCase(type)) {
            csv.append("ID,Tên đồ dùng,Đơn vị tính,Số lượng tồn,Ngưỡng cảnh báo,Ngày cập nhật\n");
            inventoryItemRepository.findAll().forEach(item -> {
                csv.append(item.getId()).append(",");
                csv.append(escapeCsv(item.getName())).append(",");
                csv.append(escapeCsv(item.getUnit() != null ? item.getUnit() : "")).append(",");
                csv.append(item.getQuantityOnHand() != null ? item.getQuantityOnHand() : 0).append(",");
                csv.append(item.getLowStockThreshold() != null ? item.getLowStockThreshold() : 10).append(",");
                csv.append(item.getUpdatedAt() != null ? item.getUpdatedAt() : "").append("\n");
            });

        } else if ("staff".equalsIgnoreCase(type) || "users".equalsIgnoreCase(type)) {
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
            return ResponseEntity.badRequest().body(("Loại bảng không hỗ trợ: " + type).getBytes(StandardCharsets.UTF_8));
        }

        auditLogService.log("Data", null, "EXPORT_" + type.toUpperCase(), actor, "Xuất dữ liệu bảng " + type);
        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = "stayaway_" + type + "_" + timestamp + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .contentLength(bytes.length)
                .body(bytes);
    }

    // ==========================================
    // TIỆN ÍCH PARSER CSV CHUẨN RFC-4180
    // ==========================================
    public static List<String> parseCsvLine(String line) {
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
            } else if (c == ',' && !inQuotes) {
                values.add(sb.toString().trim());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        values.add(sb.toString().trim());
        return values;
    }

    private static String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n") || val.contains("\r")) {
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
