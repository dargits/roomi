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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import plant.stay.dto.response.DataTaskDto;
import plant.stay.service.DataQueueService;

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
    private final CorporateClientRepository corporateClientRepository;
    private final LostItemRepository lostItemRepository;
    private final RoomIncidentRepository roomIncidentRepository;
    private final DepositPolicyRepository depositPolicyRepository;
    private final AuditLogService auditLogService;
    private final AuthUtil authUtil;
    private final DataQueueService dataQueueService;

    // ==========================================
    // Import dữ liệu bất đồng bộ qua Hàng đợi (Queue-based Async Import)
    // ==========================================
    @PostMapping("/import/async")
    public ResponseEntity<?> importDataAsync(@RequestParam(required = false) String type,
                                             @RequestParam("file") MultipartFile file,
                                             HttpServletRequest request) {
        User actor = checkAdmin(request);
        String targetType = (type != null && !type.trim().isEmpty()) ? type.trim() : request.getParameter("type");
        if (targetType == null || targetType.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Thiếu thông tin loại dữ liệu (type) cần nhập"));
        }
        if (targetType.contains(",")) targetType = targetType.split(",")[0].trim();
        targetType = targetType.trim().toLowerCase(Locale.ROOT);

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Tệp CSV tải lên không có dữ liệu"));
        }

        // Kiểm tra giới hạn dung lượng tối đa 10MB
        if (file.getSize() > 10 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(new MessageResponse("Dung lượng tệp vượt quá giới hạn cho phép (tối đa 10MB). Vui lòng chia nhỏ tệp để tiếp tục."));
        }

        try {
            byte[] fileBytes = file.getBytes();
            DataTaskDto task = dataQueueService.submitImportTask(targetType, fileBytes, file.getOriginalFilename(), actor);
            return ResponseEntity.accepted().body(task);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(new MessageResponse("Không thể tiếp nhận tệp vào hàng đợi: " + e.getMessage()));
        }
    }

    // ==========================================
    // Export dữ liệu bất đồng bộ qua Hàng đợi (Queue-based Async Export)
    // ==========================================
    @PostMapping("/export/async")
    public ResponseEntity<?> exportDataAsync(@RequestParam(required = false) String type,
                                             HttpServletRequest request) {
        User actor = checkAdmin(request);
        String targetType = (type != null && !type.trim().isEmpty()) ? type.trim() : request.getParameter("type");
        if (targetType == null || targetType.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Thiếu thông tin loại dữ liệu (type) cần xuất"));
        }
        targetType = targetType.trim().toLowerCase(Locale.ROOT);

        DataTaskDto task = dataQueueService.submitExportTask(targetType, actor);
        return ResponseEntity.accepted().body(task);
    }

    // ==========================================
    // Tra cứu tiến trình tác vụ theo TaskId
    // ==========================================
    @GetMapping("/task/{taskId}")
    public ResponseEntity<DataTaskDto> getTaskStatus(@PathVariable String taskId, HttpServletRequest request) {
        checkAdmin(request);
        DataTaskDto task = dataQueueService.getTaskStatus(taskId);
        return ResponseEntity.ok(task);
    }

    // ==========================================
    // Tải xuống kết quả tệp Export từ Hàng đợi
    // ==========================================
    @GetMapping("/task/{taskId}/download")
    public ResponseEntity<byte[]> downloadExportFile(@PathVariable String taskId, HttpServletRequest request) {
        checkAdmin(request);
        byte[] fileBytes = dataQueueService.getExportFile(taskId);
        if (fileBytes == null) {
            return ResponseEntity.notFound().build();
        }
        String fileName = dataQueueService.getExportFileName(taskId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(fileBytes);
    }

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

        // Giới hạn dung lượng tối đa 10MB
        if (file.getSize() > 10 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(ImportResultDto.builder()
                    .success(false)
                    .message("Dung lượng tệp vượt quá giới hạn tối đa 10MB. Vui lòng chia nhỏ tệp để tiếp tục.")
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
            int col5 = -1, col6 = -1, col7 = -1, col8 = -1, col9 = -1, col10 = -1, col11 = -1;
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
            } else if ("bookings".equalsIgnoreCase(targetType)) {
                col0 = findColumnIndex(headerCols, "khachhang", "tenkhachhang", "tenkhach", "hoten", "name");
                col1 = findColumnIndex(headerCols, "sodienthoai", "dienthoai", "sdt", "phone");
                col2 = findColumnIndex(headerCols, "phong", "sophong", "roomnumber", "room");
                col3 = findColumnIndex(headerCols, "loaiphong", "tenloaiphong", "roomtype");
                col4 = findColumnIndex(headerCols, "ngaynhan", "ngaynhanphong", "checkin", "checkindate");
                col5 = findColumnIndex(headerCols, "ngaytra", "ngaytraphong", "checkout", "checkoutdate");
                col6 = findColumnIndex(headerCols, "giadukien", "expectedprice", "gia", "price", "tongtien");
                col7 = findColumnIndex(headerCols, "giathucte", "actualprice");
                col8 = findColumnIndex(headerCols, "trangthai", "status");
                col9 = findColumnIndex(headerCols, "nguon", "source", "kenh");
                col10 = findColumnIndex(headerCols, "ghichu", "note");
                if (col0 < 0) {
                    col0 = hasIdCol ? 1 : 0;
                    col1 = hasIdCol ? 2 : 1;
                    col2 = hasIdCol ? 3 : 2;
                    col3 = hasIdCol ? 4 : 3;
                    col4 = hasIdCol ? 5 : 4;
                    col5 = hasIdCol ? 6 : 5;
                    col6 = hasIdCol ? 7 : 6;
                    col7 = hasIdCol ? 8 : 7;
                    col8 = hasIdCol ? 9 : 8;
                    col9 = hasIdCol ? 10 : 9;
                    col10 = hasIdCol ? 11 : 10;
                }
            } else if ("invoices".equalsIgnoreCase(targetType)) {
                col0 = findColumnIndex(headerCols, "mabooking", "bookingid", "booking", "madatphong");
                col1 = findColumnIndex(headerCols, "tienphong", "roomamount");
                col2 = findColumnIndex(headerCols, "tiendichvu", "serviceamount", "dichvu");
                col3 = findColumnIndex(headerCols, "giamgia", "discountamount", "discount");
                col4 = findColumnIndex(headerCols, "tongtien", "totalamount", "tongcong", "total");
                col5 = findColumnIndex(headerCols, "trangthai", "status");
                col6 = findColumnIndex(headerCols, "ghichu", "note");
                if (col0 < 0) {
                    col0 = hasIdCol ? 1 : 0;
                    col1 = hasIdCol ? 2 : 1;
                    col2 = hasIdCol ? 3 : 2;
                    col3 = hasIdCol ? 4 : 3;
                    col4 = hasIdCol ? 5 : 4;
                    col5 = hasIdCol ? 6 : 5;
                    col6 = hasIdCol ? 7 : 6;
                }
            } else if ("corporate-clients".equalsIgnoreCase(targetType) || "corporate_clients".equalsIgnoreCase(targetType)) {
                col0 = findColumnIndex(headerCols, "tendoanhnghiep", "tencongty", "companyname", "congty", "ten");
                col1 = findColumnIndex(headerCols, "masothue", "mst", "taxcode");
                col2 = findColumnIndex(headerCols, "nguoilienhe", "contactperson", "nguoidaidien", "contact");
                col3 = findColumnIndex(headerCols, "sodienthoai", "dienthoai", "sdt", "phone");
                col4 = findColumnIndex(headerCols, "email", "mail", "contactemail");
                col5 = findColumnIndex(headerCols, "diachi", "address");
                col6 = findColumnIndex(headerCols, "ghichu", "note");
                if (col0 < 0) {
                    col0 = hasIdCol ? 1 : 0;
                    col1 = hasIdCol ? 2 : 1;
                    col2 = hasIdCol ? 3 : 2;
                    col3 = hasIdCol ? 4 : 3;
                    col4 = hasIdCol ? 5 : 4;
                    col5 = hasIdCol ? 6 : 5;
                    col6 = hasIdCol ? 7 : 6;
                }
            } else if ("lost-items".equalsIgnoreCase(targetType) || "lost_items".equalsIgnoreCase(targetType)) {
                col0 = findColumnIndex(headerCols, "sophong", "phong", "roomnumber", "room");
                col1 = findColumnIndex(headerCols, "tentaisan", "tendovat", "itemname", "tendo", "ten");
                col2 = findColumnIndex(headerCols, "vitri", "vitritimthay", "foundlocation", "noitimthay");
                col3 = findColumnIndex(headerCols, "ngaytimthay", "founddate", "ngay");
                col4 = findColumnIndex(headerCols, "noicatgiu", "storagelocation", "kho");
                col5 = findColumnIndex(headerCols, "trangthai", "status");
                col6 = findColumnIndex(headerCols, "nguoinhan", "receivername", "receiver");
                if (col0 < 0) {
                    col0 = hasIdCol ? 1 : 0;
                    col1 = hasIdCol ? 2 : 1;
                    col2 = hasIdCol ? 3 : 2;
                    col3 = hasIdCol ? 4 : 3;
                    col4 = hasIdCol ? 5 : 4;
                    col5 = hasIdCol ? 6 : 5;
                    col6 = hasIdCol ? 7 : 6;
                }
            } else if ("room-incidents".equalsIgnoreCase(targetType) || "room_incidents".equalsIgnoreCase(targetType)) {
                col0 = findColumnIndex(headerCols, "sophong", "phong", "roomnumber", "room");
                col1 = findColumnIndex(headerCols, "mucdo", "mucdosuco", "severity", "capdo");
                col2 = findColumnIndex(headerCols, "motasuco", "mota", "description", "noidung");
                col3 = findColumnIndex(headerCols, "trangthai", "status");
                if (col0 < 0) {
                    col0 = hasIdCol ? 1 : 0;
                    col1 = hasIdCol ? 2 : 1;
                    col2 = hasIdCol ? 3 : 2;
                    col3 = hasIdCol ? 4 : 3;
                }
            } else if ("deposit-policies".equalsIgnoreCase(targetType) || "deposit_policies".equalsIgnoreCase(targetType)) {
                col0 = findColumnIndex(headerCols, "loaiphong", "tenloaiphong", "roomtype", "hangphong");
                col1 = findColumnIndex(headerCols, "tylecoc", "phantramcoc", "percent", "depositpercent", "tyle");
                col2 = findColumnIndex(headerCols, "trangthai", "active", "hoatdong");
                if (col0 < 0) {
                    col0 = hasIdCol ? 1 : 0;
                    col1 = hasIdCol ? 2 : 1;
                    col2 = hasIdCol ? 3 : 2;
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

                        RoomType rt = null;
                        try {
                            Long rtId = Long.parseLong(rtCol);
                            rt = roomTypeRepository.findById(rtId).orElse(null);
                        } catch (NumberFormatException ignored) {}

                        if (rt == null) {
                            rt = roomTypeRepository.findByNameIgnoreCase(rtCol).orElse(null);
                        }

                        if (rt == null) {
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

                    } else if ("bookings".equalsIgnoreCase(targetType)) {
                        String guestName = getColValue(cols, col0, "");
                        String phone = getColValue(cols, col1, null);
                        String roomNum = getColValue(cols, col2, "");
                        String rtName = getColValue(cols, col3, "");
                        String checkInStr = getColValue(cols, col4, "");
                        String checkOutStr = getColValue(cols, col5, "");
                        String expPriceStr = getColValue(cols, col6, "");
                        String actPriceStr = getColValue(cols, col7, "");
                        String statusStr = getColValue(cols, col8, "CONFIRMED");
                        String sourceStr = getColValue(cols, col9, "DIRECT");
                        String noteStr = getColValue(cols, col10, "");

                        if (guestName.isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Tên khách hàng không được để trống", lineNum));
                            continue;
                        }

                        // Tìm hoặc tạo khách hàng
                        Guest guest = null;
                        if (phone != null && !phone.isEmpty()) {
                            guest = guestRepository.findByPhone(phone).orElse(null);
                        }
                        if (guest == null) {
                            guest = guestRepository.save(Guest.builder()
                                    .name(guestName)
                                    .phone(phone != null && !phone.isEmpty() ? phone : null)
                                    .loyaltyPoints(0)
                                    .build());
                        }

                        // Tìm phòng & hạng phòng
                        Room room = null;
                        if (!roomNum.isEmpty()) {
                            room = roomRepository.findByRoomNumber(roomNum).orElse(null);
                        }

                        RoomType rt = (room != null) ? room.getRoomType() : null;
                        if (rt == null && !rtName.isEmpty()) {
                            rt = roomTypeRepository.findByNameIgnoreCase(rtName).orElse(null);
                        }
                        if (rt == null) {
                            rt = roomTypeRepository.findAll().stream().findFirst().orElse(null);
                        }
                        if (rt == null) {
                            rt = roomTypeRepository.save(RoomType.builder()
                                    .name("Phòng Tiêu Chuẩn")
                                    .basePrice(new BigDecimal("500000"))
                                    .maxCapacity(2)
                                    .active(true)
                                    .build());
                        }

                        LocalDate checkIn = parseLocalDate(checkInStr, LocalDate.now());
                        LocalDate checkOut = parseLocalDate(checkOutStr, checkIn.plusDays(1));
                        if (!checkOut.isAfter(checkIn)) {
                            checkOut = checkIn.plusDays(1);
                        }

                        BookingStatus status = BookingStatus.CONFIRMED;
                        if (!statusStr.isEmpty()) {
                            String sNorm = normalizeHeader(statusStr);
                            if (sNorm.contains("nhan") || sNorm.contains("checkin")) status = BookingStatus.CHECKED_IN;
                            else if (sNorm.contains("tra") || sNorm.contains("checkout")) status = BookingStatus.CHECKED_OUT;
                            else if (sNorm.contains("huy") || sNorm.contains("cancel")) status = BookingStatus.CANCELLED;
                            else if (sNorm.contains("noshow")) status = BookingStatus.NO_SHOW;
                            else if (sNorm.contains("moi") || sNorm.contains("new")) status = BookingStatus.NEW;
                            else {
                                try {
                                    status = BookingStatus.valueOf(statusStr.toUpperCase(Locale.ROOT));
                                } catch (Exception ignored) {}
                            }
                        }

                        BigDecimal expPrice = parseBigDecimal(expPriceStr, rt.getBasePrice());
                        BigDecimal actPrice = parseBigDecimal(actPriceStr, expPrice);

                        bookingRepository.save(Booking.builder()
                                .guest(guest)
                                .room(room)
                                .roomType(rt)
                                .checkInDate(checkIn)
                                .checkOutDate(checkOut)
                                .status(status)
                                .expectedPrice(expPrice)
                                .actualPrice(actPrice)
                                .source(sourceStr.isEmpty() ? "DIRECT" : sourceStr)
                                .note(noteStr)
                                .build());
                        importedCount++;

                    } else if ("invoices".equalsIgnoreCase(targetType)) {
                        String bookingIdStr = getColValue(cols, col0, "");
                        String roomAmtStr = getColValue(cols, col1, "0");
                        String srvAmtStr = getColValue(cols, col2, "0");
                        String discAmtStr = getColValue(cols, col3, "0");
                        String totalAmtStr = getColValue(cols, col4, "0");
                        String statusStr = getColValue(cols, col5, "PAID");
                        String noteStr = getColValue(cols, col6, "");

                        Long bookingId = parseLong(bookingIdStr, null);
                        Booking booking = (bookingId != null) ? bookingRepository.findById(bookingId).orElse(null) : null;
                        if (booking == null) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Không tìm thấy Mã Booking '%s' tương ứng trong hệ thống (Bỏ qua)", lineNum, bookingIdStr));
                            continue;
                        }

                        BigDecimal roomAmt = parseBigDecimal(roomAmtStr, booking.getExpectedPrice() != null ? booking.getExpectedPrice() : BigDecimal.ZERO);
                        BigDecimal srvAmt = parseBigDecimal(srvAmtStr, BigDecimal.ZERO);
                        BigDecimal discAmt = parseBigDecimal(discAmtStr, BigDecimal.ZERO);
                        BigDecimal totalAmt = parseBigDecimal(totalAmtStr, roomAmt.add(srvAmt).subtract(discAmt));

                        InvoiceStatus status = InvoiceStatus.PAID;
                        if (!statusStr.isEmpty()) {
                            String sNorm = normalizeHeader(statusStr);
                            if (sNorm.contains("cho") || sNorm.contains("pending")) status = InvoiceStatus.PENDING_PAYMENT;
                            else if (sNorm.contains("huy") || sNorm.contains("cancel")) status = InvoiceStatus.CANCELLED;
                            else if (sNorm.contains("nhap") || sNorm.contains("draft")) status = InvoiceStatus.DRAFT;
                            else {
                                try {
                                    status = InvoiceStatus.valueOf(statusStr.toUpperCase(Locale.ROOT));
                                } catch (Exception ignored) {}
                            }
                        }

                        invoiceRepository.save(Invoice.builder()
                                .booking(booking)
                                .roomAmount(roomAmt)
                                .serviceAmount(srvAmt)
                                .discountAmount(discAmt)
                                .totalAmount(totalAmt)
                                .status(status)
                                .note(noteStr)
                                .createdBy(actor)
                                .build());
                        importedCount++;

                    } else if ("corporate-clients".equalsIgnoreCase(targetType) || "corporate_clients".equalsIgnoreCase(targetType)) {
                        String companyName = getColValue(cols, col0, "");
                        String taxCode = getColValue(cols, col1, null);
                        String contactPerson = getColValue(cols, col2, null);
                        String phone = getColValue(cols, col3, null);
                        String email = getColValue(cols, col4, null);
                        String address = getColValue(cols, col5, null);
                        String note = getColValue(cols, col6, null);

                        if (companyName.isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Tên doanh nghiệp/công ty không được để trống", lineNum));
                            continue;
                        }

                        if (taxCode != null && !taxCode.isEmpty() && corporateClientRepository.findByTaxCode(taxCode).isPresent()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Doanh nghiệp '%s' có Mã số thuế '%s' đã tồn tại (Bỏ qua)", lineNum, companyName, taxCode));
                            continue;
                        }

                        corporateClientRepository.save(CorporateClient.builder()
                                .companyName(companyName)
                                .taxCode(taxCode != null && !taxCode.isEmpty() ? taxCode : null)
                                .contactPerson(contactPerson)
                                .contactPhone(phone)
                                .contactEmail(email)
                                .address(address)
                                .note(note)
                                .active(true)
                                .createdBy(actor)
                                .build());
                        importedCount++;

                    } else if ("lost-items".equalsIgnoreCase(targetType) || "lost_items".equalsIgnoreCase(targetType)) {
                        String roomNum = getColValue(cols, col0, "");
                        String itemName = getColValue(cols, col1, "");
                        String foundLoc = getColValue(cols, col2, "");
                        String dateStr = getColValue(cols, col3, "");
                        String storage = getColValue(cols, col4, "Kho lễ tân");
                        String statusStr = getColValue(cols, col5, "HOLDING");
                        String receiver = getColValue(cols, col6, null);

                        if (itemName.isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Tên đồ vật/tài sản thất lạc không được để trống", lineNum));
                            continue;
                        }

                        Room room = null;
                        if (!roomNum.isEmpty()) {
                            room = roomRepository.findByRoomNumber(roomNum).orElse(null);
                        }
                        if (room == null) {
                            room = roomRepository.findAll().stream().findFirst().orElse(null);
                        }
                        if (room == null) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Không tìm thấy phòng '%s' cho đồ thất lạc '%s'", lineNum, roomNum, itemName));
                            continue;
                        }

                        LocalDate foundDate = parseLocalDate(dateStr, LocalDate.now());
                        LostItemStatus status = LostItemStatus.HOLDING;
                        if (!statusStr.isEmpty()) {
                            try {
                                status = LostItemStatus.valueOf(statusStr.toUpperCase(Locale.ROOT));
                            } catch (Exception ignored) {}
                        }

                        lostItemRepository.save(LostItem.builder()
                                .room(room)
                                .itemName(itemName)
                                .foundLocation(foundLoc.isEmpty() ? "Phòng " + room.getRoomNumber() : foundLoc)
                                .foundDate(foundDate)
                                .storageLocation(storage)
                                .status(status)
                                .receiverName(receiver)
                                .createdBy(actor)
                                .build());
                        importedCount++;

                    } else if ("room-incidents".equalsIgnoreCase(targetType) || "room_incidents".equalsIgnoreCase(targetType)) {
                        String roomNum = getColValue(cols, col0, "");
                        String sevStr = getColValue(cols, col1, "LIGHT");
                        String desc = getColValue(cols, col2, "");
                        String statusStr = getColValue(cols, col3, "OPEN");

                        if (desc.isEmpty()) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Mô tả sự cố phòng không được để trống", lineNum));
                            continue;
                        }

                        Room room = null;
                        if (!roomNum.isEmpty()) {
                            room = roomRepository.findByRoomNumber(roomNum).orElse(null);
                        }
                        if (room == null) {
                            skippedCount++;
                            details.add(String.format("Dòng %d: Không tìm thấy phòng '%s' để ghi nhận sự cố", lineNum, roomNum));
                            continue;
                        }

                        IncidentSeverity severity = IncidentSeverity.LIGHT;
                        if (!sevStr.isEmpty()) {
                            String sNorm = normalizeHeader(sevStr);
                            if (sNorm.contains("nang") || sNorm.contains("heavy")) severity = IncidentSeverity.HEAVY;
                            else if (sNorm.contains("khoa") || sNorm.contains("out")) severity = IncidentSeverity.OUT_OF_SERVICE;
                            else {
                                try {
                                    severity = IncidentSeverity.valueOf(sevStr.toUpperCase(Locale.ROOT));
                                } catch (Exception ignored) {}
                            }
                        }

                        IncidentStatus status = IncidentStatus.OPEN;
                        if (!statusStr.isEmpty() && normalizeHeader(statusStr).contains("giai quyet")) {
                            status = IncidentStatus.RESOLVED;
                        }

                        roomIncidentRepository.save(RoomIncident.builder()
                                .room(room)
                                .severity(severity)
                                .description(desc)
                                .status(status)
                                .reportedBy(actor)
                                .build());
                        importedCount++;

                    } else if ("deposit-policies".equalsIgnoreCase(targetType) || "deposit_policies".equalsIgnoreCase(targetType)) {
                        String rtCol = getColValue(cols, col0, "");
                        String percentStr = getColValue(cols, col1, "30");
                        String activeStr = getColValue(cols, col2, "true");

                        RoomType rt = null;
                        if (!rtCol.isEmpty() && !rtCol.equalsIgnoreCase("tatca") && !rtCol.equalsIgnoreCase("all") && !rtCol.contains("mặc định")) {
                            rt = roomTypeRepository.findByNameIgnoreCase(rtCol).orElse(null);
                        }

                        BigDecimal percent = parseBigDecimal(percentStr, new BigDecimal("30"));
                        boolean active = !"khoa".equalsIgnoreCase(activeStr) && !"false".equalsIgnoreCase(activeStr);

                        depositPolicyRepository.save(DepositPolicy.builder()
                                .roomType(rt)
                                .depositPercent(percent)
                                .active(active)
                                .updatedBy(actor)
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

            String friendlyTarget = switch (targetType.toLowerCase(Locale.ROOT)) {
                case "extra-services", "extra_services" -> "Dịch vụ phụ thu";
                case "room-types", "room_types" -> "Hạng phòng";
                case "rooms" -> "Danh mục phòng";
                case "guests" -> "Khách hàng";
                case "bookings" -> "Đặt phòng";
                case "invoices" -> "Hóa đơn & Doanh thu";
                case "inventory", "inventory-items" -> "Kho đồ dùng & Vật tư";
                case "staff", "users" -> "Nhân sự & Người dùng";
                case "corporate-clients", "corporate_clients" -> "Khách hàng doanh nghiệp";
                case "lost-items", "lost_items" -> "Đồ thất lạc";
                case "room-incidents", "room_incidents" -> "Sự cố phòng";
                case "deposit-policies", "deposit_policies" -> "Chính sách đặt cọc";
                default -> targetType;
            };
            String summaryMessage = String.format("Nhập dữ liệu %s hoàn tất: %,d bản ghi thành công (Bỏ qua %,d, Lỗi %,d)",
                    friendlyTarget, importedCount, skippedCount, errorCount);

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

            } else if ("corporate-clients".equals(targetType) || "corporate_clients".equals(targetType)) {
                csv.append("ID,Tên doanh nghiệp / Công ty,Mã số thuế,Người liên hệ,Số điện thoại,Email,Địa chỉ,Ghi chú,Trạng thái\n");
                corporateClientRepository.findAllByOrderByIdDesc().forEach(c -> {
                    csv.append(c.getId()).append(",");
                    csv.append(escapeCsv(c.getCompanyName())).append(",");
                    csv.append(escapeCsv(c.getTaxCode() != null ? c.getTaxCode() : "")).append(",");
                    csv.append(escapeCsv(c.getContactPerson() != null ? c.getContactPerson() : "")).append(",");
                    csv.append(escapeCsv(c.getContactPhone() != null ? PersonalDataMasker.displayPhone(c.getContactPhone(), actor.getRole()) : "")).append(",");
                    csv.append(escapeCsv(c.getContactEmail() != null ? PersonalDataMasker.displayEmail(c.getContactEmail(), actor.getRole()) : "")).append(",");
                    csv.append(escapeCsv(c.getAddress() != null ? c.getAddress() : "")).append(",");
                    csv.append(escapeCsv(c.getNote() != null ? c.getNote() : "")).append(",");
                    csv.append(c.getActive() != null && c.getActive() ? "Hoạt động" : "Tạm ngưng").append("\n");
                });

            } else if ("lost-items".equals(targetType) || "lost_items".equals(targetType)) {
                csv.append("ID,Số phòng,Tên tài sản / Đồ vật,Vị trí tìm thấy,Ngày tìm thấy,Nơi cất giữ,Trạng thái,Người nhận\n");
                lostItemRepository.findAll().forEach(item -> {
                    csv.append(item.getId()).append(",");
                    csv.append(escapeCsv(item.getRoom() != null ? item.getRoom().getRoomNumber() : "")).append(",");
                    csv.append(escapeCsv(item.getItemName())).append(",");
                    csv.append(escapeCsv(item.getFoundLocation() != null ? item.getFoundLocation() : "")).append(",");
                    csv.append(item.getFoundDate() != null ? item.getFoundDate().toString() : "").append(",");
                    csv.append(escapeCsv(item.getStorageLocation() != null ? item.getStorageLocation() : "")).append(",");
                    csv.append(item.getStatus() != null ? item.getStatus().name() : "").append(",");
                    csv.append(escapeCsv(item.getReceiverName() != null ? item.getReceiverName() : "")).append("\n");
                });

            } else if ("room-incidents".equals(targetType) || "room_incidents".equals(targetType)) {
                csv.append("ID,Số phòng,Mức độ sự cố,Mô tả sự cố,Trạng thái,Thời gian báo\n");
                roomIncidentRepository.findAll().forEach(inc -> {
                    csv.append(inc.getId()).append(",");
                    csv.append(escapeCsv(inc.getRoom() != null ? inc.getRoom().getRoomNumber() : "")).append(",");
                    csv.append(inc.getSeverity() != null ? inc.getSeverity().name() : "").append(",");
                    csv.append(escapeCsv(inc.getDescription())).append(",");
                    csv.append(inc.getStatus() != null ? inc.getStatus().name() : "").append(",");
                    csv.append(inc.getReportedAt() != null ? inc.getReportedAt().toString() : "").append("\n");
                });

            } else if ("deposit-policies".equals(targetType) || "deposit_policies".equals(targetType)) {
                csv.append("ID,Loại phòng áp dụng,Tỷ lệ cọc (%),Trạng thái\n");
                depositPolicyRepository.findAll().forEach(dp -> {
                    csv.append(dp.getId()).append(",");
                    csv.append(escapeCsv(dp.getRoomType() != null ? dp.getRoomType().getName() : "Tất cả loại phòng (Mặc định)")).append(",");
                    csv.append(dp.getDepositPercent() != null ? dp.getDepositPercent() : "0").append(",");
                    csv.append(dp.getActive() != null && dp.getActive() ? "Hoạt động" : "Tạm ngưng").append("\n");
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
    public static LocalDate parseLocalDate(String str, LocalDate defaultVal) {
        if (str == null || str.trim().isEmpty()) return defaultVal;
        String s = str.trim();
        if (s.contains("T")) s = s.split("T")[0];
        if (s.contains(" ")) s = s.split(" ")[0];
        try {
            if (s.contains("-")) {
                String[] parts = s.split("-");
                if (parts[0].length() == 4) {
                    return LocalDate.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));
                }
            } else if (s.contains("/")) {
                String[] parts = s.split("/");
                if (parts[2].length() == 4) {
                    return LocalDate.of(Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
                }
            }
        } catch (Exception ignored) {}
        try {
            return LocalDate.parse(s);
        } catch (Exception ignored) {}
        return defaultVal;
    }

    public static BigDecimal parseBigDecimal(String str, BigDecimal defaultVal) {
        if (str == null || str.trim().isEmpty()) return defaultVal;
        try {
            String clean = str.trim().replaceAll("[^0-9.-]", "");
            if (clean.isEmpty() || clean.equals("-") || clean.equals(".")) return defaultVal;
            return new BigDecimal(clean);
        } catch (Exception e) {
            return defaultVal;
        }
    }

    public static Long parseLong(String str, Long defaultVal) {
        if (str == null || str.trim().isEmpty()) return defaultVal;
        try {
            String clean = str.trim().replaceAll("[^0-9]", "");
            return clean.isEmpty() ? defaultVal : Long.parseLong(clean);
        } catch (Exception e) {
            return defaultVal;
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
