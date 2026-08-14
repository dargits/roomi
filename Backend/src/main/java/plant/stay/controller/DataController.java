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
import java.util.ArrayList;
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
    private final AuditLogService auditLogService;
    private final AuthUtil authUtil;

    // Import phòng từ CSV: roomNumber,roomTypeId,floor
    @PostMapping("/import")
    public ResponseEntity<MessageResponse> importData(@RequestParam String type,
                                                      @RequestParam("file") MultipartFile file,
                                                      HttpServletRequest request) {
        User actor = checkAdmin(request);
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()));
            String line;
            int count = 0;
            reader.readLine(); // Skip header

            if ("rooms".equals(type)) {
                while ((line = reader.readLine()) != null) {
                    String[] cols = line.split(",");
                    if (cols.length < 2) continue;
                    String roomNumber = cols[0].trim();
                    Long roomTypeId = Long.parseLong(cols[1].trim());
                    String floor = cols.length > 2 ? cols[2].trim() : null;

                    if (!roomRepository.existsByRoomNumber(roomNumber)) {
                        RoomType rt = roomTypeRepository.findById(roomTypeId).orElse(null);
                        if (rt != null) {
                            roomRepository.save(Room.builder()
                                    .roomNumber(roomNumber).roomType(rt).floor(floor).build());
                            count++;
                        }
                    }
                }
            } else if ("guests".equals(type)) {
                while ((line = reader.readLine()) != null) {
                    String[] cols = line.split(",");
                    if (cols.length < 1) continue;
                    String name = cols[0].trim();
                    String phone = cols.length > 1 ? cols[1].trim() : null;
                    String idNumber = cols.length > 2 ? cols[2].trim() : null;

                    if (phone == null || guestRepository.findByPhone(phone).isEmpty()) {
                        guestRepository.save(Guest.builder()
                                .name(name).phone(phone).idNumber(idNumber).build());
                        count++;
                    }
                }
            } else {
                return ResponseEntity.badRequest().body(new MessageResponse("Loại import không hỗ trợ: " + type));
            }

            auditLogService.log("Data", null, "IMPORT_" + type.toUpperCase(), actor,
                    "Import " + count + " bản ghi " + type);
            return ResponseEntity.ok(new MessageResponse("Import thành công " + count + " bản ghi"));
        } catch (Exception e) {
            throw new RuntimeException("Lỗi đọc file CSV: " + e.getMessage());
        }
    }

    // Export dữ liệu ra CSV
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportData(@RequestParam String type,
                                             HttpServletRequest request) {
        User actor = checkAdmin(request);
        StringBuilder csv = new StringBuilder();

        if ("bookings".equals(type)) {
            csv.append("ID,Khách,SĐT,Phòng,Loại phòng,Nhận phòng,Trả phòng,Trạng thái\n");
            bookingRepository.findAll().forEach(b ->
                    csv.append(String.format("%d,%s,%s,%s,%s,%s,%s,%s\n",
                            b.getId(), b.getGuest().getName(), b.getGuest().getPhone(),
                            b.getRoom() != null ? b.getRoom().getRoomNumber() : "",
                            b.getRoomType().getName(),
                            b.getCheckInDate(), b.getCheckOutDate(), b.getStatus())));
        } else if ("guests".equals(type)) {
            csv.append("ID,Tên,SĐT,CCCD,Email,Điểm loyalty\n");
            guestRepository.findAll().forEach(g ->
                    csv.append(String.format("%d,%s,%s,%s,%s,%d\n",
                            g.getId(), g.getName(),
                            g.getPhone() != null ? g.getPhone() : "",
                            g.getIdNumber() != null ? g.getIdNumber() : "",
                            g.getEmail() != null ? g.getEmail() : "",
                            g.getLoyaltyPoints())));
        } else {
            return ResponseEntity.badRequest().body(("Loại export không hỗ trợ").getBytes());
        }

        auditLogService.log("Data", null, "EXPORT_" + type.toUpperCase(), actor, "Export dữ liệu " + type);
        byte[] bytes = csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=export_" + type + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }

    private User checkAdmin(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN))
            throw new UnauthorizedException("Chỉ OWNER hoặc ADMIN mới có quyền import/export dữ liệu");
        return user;
    }
}
