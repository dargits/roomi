package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.util.AuthUtil;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1/data")
@CrossOrigin("*")
@RequiredArgsConstructor
public class DataController {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final GuestRepository guestRepository;
    private final BookingRepository bookingRepository;
    private final InvoiceRepository invoiceRepository;
    private final ExtraServiceRepository extraServiceRepository;
    private final AuditLogService auditLogService;
    private final AuthUtil authUtil;

    // ==========================================
    // Import dữ liệu từ CSV
    // ==========================================
    @PostMapping("/import")
    public ResponseEntity<MessageResponse> importData(@RequestParam String type,
                                                      @RequestParam("file") MultipartFile file,
                                                      HttpServletRequest request) {
        User actor = checkAdmin(request);
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
            String line;
            int count = 0;
            reader.readLine(); // Bỏ qua dòng tiêu đề

            if ("rooms".equalsIgnoreCase(type)) {
                while ((line = reader.readLine()) != null) {
                    if (line.trim().isEmpty()) continue;
                    String[] cols = line.split(",");
                    if (cols.length < 2) continue;
                    String roomNumber = cols[0].trim();
                    Long roomTypeId = Long.parseLong(cols[1].trim());
                    String floor = cols.length > 2 ? cols[2].trim() : "1";

                    if (!roomRepository.existsByRoomNumber(roomNumber)) {
                        RoomType rt = roomTypeRepository.findById(roomTypeId).orElse(null);
                        if (rt != null) {
                            roomRepository.save(Room.builder()
                                    .roomNumber(roomNumber)
                                    .roomType(rt)
                                    .floor(floor)
                                    .status(RoomStatus.AVAILABLE)
                                    .build());
                            count++;
                        }
                    }
                }
            } else if ("guests".equalsIgnoreCase(type)) {
                while ((line = reader.readLine()) != null) {
                    if (line.trim().isEmpty()) continue;
                    String[] cols = line.split(",");
                    if (cols.length < 1) continue;
                    String name = cols[0].trim();
                    String phone = cols.length > 1 ? cols[1].trim() : null;
                    String idNumber = cols.length > 2 ? cols[2].trim() : null;
                    String email = cols.length > 3 ? cols[3].trim() : null;

                    if (phone == null || guestRepository.findByPhone(phone).isEmpty()) {
                        guestRepository.save(Guest.builder()
                                .name(name)
                                .phone(phone)
                                .idNumber(idNumber)
                                .email(email)
                                .loyaltyPoints(0)
                                .build());
                        count++;
                    }
                }
            } else if ("room-types".equalsIgnoreCase(type) || "roomtypes".equalsIgnoreCase(type)) {
                while ((line = reader.readLine()) != null) {
                    if (line.trim().isEmpty()) continue;
                    String[] cols = line.split(",");
                    if (cols.length < 3) continue;
                    String name = cols[0].trim();
                    BigDecimal basePrice = new BigDecimal(cols[1].trim());
                    int maxCapacity = Integer.parseInt(cols[2].trim());
                    String desc = cols.length > 3 ? cols[3].trim() : "";

                    roomTypeRepository.save(RoomType.builder()
                            .name(name)
                            .basePrice(basePrice)
                            .maxCapacity(maxCapacity)
                            .amenitiesDescription(desc)
                            .active(true)
                            .build());
                    count++;
                }
            } else if ("extra-services".equalsIgnoreCase(type) || "extraservices".equalsIgnoreCase(type)) {
                while ((line = reader.readLine()) != null) {
                    if (line.trim().isEmpty()) continue;
                    String[] cols = line.split(",");
                    if (cols.length < 2) continue;
                    String name = cols[0].trim();
                    BigDecimal unitPrice = new BigDecimal(cols[1].trim());
                    String unit = cols.length > 2 ? cols[2].trim() : "Lần";

                    extraServiceRepository.save(ExtraService.builder()
                            .name(name)
                            .unitPrice(unitPrice)
                            .unit(unit)
                            .active(true)
                            .build());
                    count++;
                }
            } else {
                return ResponseEntity.badRequest().body(new MessageResponse("Loại import không hỗ trợ: " + type));
            }

            auditLogService.log("Data", null, "IMPORT_" + type.toUpperCase(), actor,
                    "Import thành công " + count + " bản ghi " + type);
            return ResponseEntity.ok(new MessageResponse("Import thành công " + count + " bản ghi " + type));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Lỗi xử lý file CSV: " + e.getMessage()));
        }
    }

    // ==========================================
    // Export dữ liệu / Sao lưu hệ thống ra CSV
    // ==========================================
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportData(@RequestParam String type,
                                             HttpServletRequest request) {
        User actor = checkAdmin(request);
        StringBuilder csv = new StringBuilder();
        // Thêm UTF-8 BOM để Excel hiển thị đúng tiếng Việt có dấu
        csv.append('\uFEFF');

        if ("bookings".equalsIgnoreCase(type)) {
            csv.append("Mã Booking,Khách hàng,Số điện thoại,Phòng,Loại phòng,Ngày nhận,Ngày trả,Trạng thái,Giá dự kiến,Giá thực tế,Nguồn,Ghi chú\n");
            bookingRepository.findAll().forEach(b ->
                    csv.append(String.format("%d,\"%s\",\"%s\",\"%s\",\"%s\",%s,%s,%s,%s,%s,\"%s\",\"%s\"\n",
                            b.getId(),
                            b.getGuest() != null ? b.getGuest().getName() : "",
                            b.getGuest() != null && b.getGuest().getPhone() != null ? b.getGuest().getPhone() : "",
                            b.getRoom() != null ? b.getRoom().getRoomNumber() : "Chưa xếp",
                            b.getRoomType() != null ? b.getRoomType().getName() : "",
                            b.getCheckInDate(),
                            b.getCheckOutDate(),
                            b.getStatus(),
                            b.getExpectedPrice() != null ? b.getExpectedPrice() : "",
                            b.getActualPrice() != null ? b.getActualPrice() : "",
                            b.getSource() != null ? b.getSource() : "",
                            b.getNote() != null ? b.getNote().replace("\"", "\"\"") : "")));
        } else if ("guests".equalsIgnoreCase(type)) {
            csv.append("ID,Tên khách hàng,Số điện thoại,CCCD/CMND,Email,Điểm tích lũy\n");
            guestRepository.findAll().forEach(g ->
                    csv.append(String.format("%d,\"%s\",\"%s\",\"%s\",\"%s\",%d\n",
                            g.getId(),
                            g.getName(),
                            g.getPhone() != null ? g.getPhone() : "",
                            g.getIdNumber() != null ? g.getIdNumber() : "",
                            g.getEmail() != null ? g.getEmail() : "",
                            g.getLoyaltyPoints())));
        } else if ("rooms".equalsIgnoreCase(type)) {
            csv.append("ID,Số phòng,ID Loại phòng,Tên Loại phòng,Tầng,Trạng thái\n");
            roomRepository.findAll().forEach(r ->
                    csv.append(String.format("%d,\"%s\",%d,\"%s\",\"%s\",%s\n",
                            r.getId(),
                            r.getRoomNumber(),
                            r.getRoomType() != null ? r.getRoomType().getId() : 0,
                            r.getRoomType() != null ? r.getRoomType().getName() : "",
                            r.getFloor() != null ? r.getFloor() : "",
                            r.getStatus())));
        } else if ("room-types".equalsIgnoreCase(type) || "roomtypes".equalsIgnoreCase(type)) {
            csv.append("ID,Tên loại phòng,Giá cơ bản (VNĐ),Sức chứa tối đa,Trạng thái,Mô tả tiện nghi\n");
            roomTypeRepository.findAll().forEach(rt ->
                    csv.append(String.format("%d,\"%s\",%s,%d,%s,\"%s\"\n",
                            rt.getId(),
                            rt.getName(),
                            rt.getBasePrice(),
                            rt.getMaxCapacity(),
                            rt.isActive() ? "Hoạt động" : "Tạm ẩn",
                            rt.getAmenitiesDescription() != null ? rt.getAmenitiesDescription().replace("\"", "\"\"") : "")));
        } else if ("extra-services".equalsIgnoreCase(type) || "extraservices".equalsIgnoreCase(type)) {
            csv.append("ID,Tên dịch vụ,Đơn giá (VNĐ),Đơn vị tính,Trạng thái\n");
            extraServiceRepository.findAll().forEach(es ->
                    csv.append(String.format("%d,\"%s\",%s,\"%s\",%s\n",
                            es.getId(),
                            es.getName(),
                            es.getUnitPrice(),
                            es.getUnit() != null ? es.getUnit() : "",
                            es.isActive() ? "Hoạt động" : "Tạm ẩn")));
        } else if ("invoices".equalsIgnoreCase(type)) {
            csv.append("Mã Hóa đơn,Mã Booking,Tiền phòng,Tiền dịch vụ,Giảm giá,Tổng tiền,Trạng thái,Ngày tạo\n");
            invoiceRepository.findAll().forEach(inv ->
                    csv.append(String.format("%d,%d,%s,%s,%s,%s,%s,%s\n",
                            inv.getId(),
                            inv.getBooking() != null ? inv.getBooking().getId() : 0,
                            inv.getRoomAmount() != null ? inv.getRoomAmount() : 0,
                            inv.getServiceAmount() != null ? inv.getServiceAmount() : 0,
                            inv.getDiscountAmount() != null ? inv.getDiscountAmount() : 0,
                            inv.getTotalAmount() != null ? inv.getTotalAmount() : 0,
                            inv.getStatus(),
                            inv.getCreatedAt())));
        } else {
            return ResponseEntity.badRequest().body("Loại export không hỗ trợ".getBytes(StandardCharsets.UTF_8));
        }

        auditLogService.log("Data", null, "EXPORT_" + type.toUpperCase(), actor, "Xuất dữ liệu / sao lưu " + type);
        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=backup_" + type + "_" + System.currentTimeMillis() + ".csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }

    private User checkAdmin(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN))
            throw new UnauthorizedException("Chỉ OWNER hoặc ADMIN mới có quyền nhập/xuất dữ liệu hệ thống");
        return user;
    }
}
