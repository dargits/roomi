package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import plant.stay.controller.DataController;
import plant.stay.dto.response.DataTaskDto;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.DataQueueService;
import plant.stay.util.HashUtil;
import plant.stay.util.PersonalDataMasker;

import jakarta.annotation.PreDestroy;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataQueueServiceImpl implements DataQueueService {

    private final BookingRepository bookingRepository;
    private final GuestRepository guestRepository;
    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final ExtraServiceRepository extraServiceRepository;
    private final InvoiceRepository invoiceRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    // Hàng đợi và ThreadPool xử lý ngầm
    private final ExecutorService queueExecutor = Executors.newFixedThreadPool(2, new ThreadFactory() {
        private int count = 1;
        @Override
        public Thread newThread(Runnable r) {
            Thread t = new Thread(r, "data-worker-" + count++);
            t.setDaemon(true);
            return t;
        }
    });

    // Lưu trữ trạng thái tiến trình và kết quả tạm thời
    private final Map<String, DataTaskDto> taskRegistry = new ConcurrentHashMap<>();
    private final Map<String, byte[]> exportStorage = new ConcurrentHashMap<>();
    private final Map<String, String> exportFileNames = new ConcurrentHashMap<>();

    @PreDestroy
    public void cleanup() {
        queueExecutor.shutdownNow();
    }

    @Override
    public DataTaskDto submitImportTask(String type, byte[] fileBytes, String originalFileName, User actor) {
        String taskId = UUID.randomUUID().toString();
        String normalizedType = type != null ? type.trim().toLowerCase(Locale.ROOT) : "unknown";

        DataTaskDto initialTask = DataTaskDto.builder()
                .taskId(taskId)
                .taskType("IMPORT")
                .dataType(normalizedType)
                .status("QUEUED")
                .progressPercent(5)
                .statusMessage("Yêu cầu đã được tiếp nhận và xếp vào hàng đợi xử lý ngầm. Tiến trình sẽ bắt đầu trong giây lát...")
                .subMessage("Tệp: " + (originalFileName != null ? originalFileName : "upload.csv") + " | " + (fileBytes.length / 1024) + " KB")
                .fileName(originalFileName)
                .createdAt(LocalDateTime.now())
                .details(new ArrayList<>())
                .build();

        taskRegistry.put(taskId, initialTask);

        // Đưa vào hàng đợi xử lý ngầm (Asynchronous Worker)
        queueExecutor.submit(() -> executeImportJob(taskId, normalizedType, fileBytes, originalFileName, actor));

        return initialTask;
    }

    @Override
    public DataTaskDto submitExportTask(String type, User actor) {
        String taskId = UUID.randomUUID().toString();
        String normalizedType = type != null ? type.trim().toLowerCase(Locale.ROOT) : "bookings";

        DataTaskDto initialTask = DataTaskDto.builder()
                .taskId(taskId)
                .taskType("EXPORT")
                .dataType(normalizedType)
                .status("QUEUED")
                .progressPercent(10)
                .statusMessage("Yêu cầu trích xuất dữ liệu đã được đưa vào hàng đợi. Quá trình xuất có thể mất từ 30 giây đến 1 phút đối với bảng có nhiều bản ghi...")
                .subMessage("Đang chuẩn bị phiên kết nối cơ sở dữ liệu...")
                .createdAt(LocalDateTime.now())
                .details(new ArrayList<>())
                .build();

        taskRegistry.put(taskId, initialTask);

        // Đưa vào hàng đợi xử lý ngầm
        queueExecutor.submit(() -> executeExportJob(taskId, normalizedType, actor));

        return initialTask;
    }

    @Override
    public DataTaskDto getTaskStatus(String taskId) {
        DataTaskDto task = taskRegistry.get(taskId);
        if (task == null) {
            return DataTaskDto.builder()
                    .taskId(taskId)
                    .status("FAILED")
                    .progressPercent(0)
                    .statusMessage("Không tìm thấy tác vụ xử lý với mã: " + taskId)
                    .build();
        }
        return task;
    }

    @Override
    public byte[] getExportFile(String taskId) {
        return exportStorage.get(taskId);
    }

    @Override
    public String getExportFileName(String taskId) {
        return exportFileNames.getOrDefault(taskId, "stayaway_export_" + taskId + ".csv");
    }

    // =========================================================================
    // WORKER XỬ LÝ IMPORT NGẦM
    // =========================================================================
    private void executeImportJob(String taskId, String targetType, byte[] fileBytes, String originalFileName, User actor) {
        long startTime = System.currentTimeMillis();
        DataTaskDto task = taskRegistry.get(taskId);
        if (task == null) return;

        try {
            task.setStatus("PROCESSING");
            task.setProgressPercent(15);
            task.setStatusMessage("Đang đọc và phân tích cấu trúc tệp dữ liệu CSV...");
            task.setSubMessage("Đang kiểm tra bảng mã ký tự UTF-8 BOM và định dạng các cột...");

            List<String> details = new ArrayList<>();
            int importedCount = 0;
            int skippedCount = 0;
            int errorCount = 0;
            int totalRows = 0;

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(new ByteArrayInputStream(fileBytes), StandardCharsets.UTF_8))) {
                String headerLine = reader.readLine();
                if (headerLine == null) {
                    task.setStatus("FAILED");
                    task.setProgressPercent(100);
                    task.setStatusMessage("Tệp tải lên hoàn toàn rỗng, không có dữ liệu để xử lý.");
                    return;
                }

                if (headerLine.startsWith("\uFEFF")) {
                    headerLine = headerLine.substring(1);
                }

                char delimiter = detectDelimiter(headerLine);
                List<String> headerCols = DataController.parseCsvLine(headerLine, delimiter);
                boolean firstLineIsData = isDataRow(headerCols);
                List<String> currentLineCols = firstLineIsData ? headerCols : null;
                if (firstLineIsData) {
                    headerCols = new ArrayList<>();
                }

                // Cấu hình chỉ số cột tương ứng
                int col0 = -1, col1 = -1, col2 = -1, col3 = -1, col4 = -1;
                boolean hasIdCol = !headerCols.isEmpty() && (headerCols.get(0).equalsIgnoreCase("id") || headerCols.get(0).equalsIgnoreCase("mã"));

                if ("rooms".equalsIgnoreCase(targetType)) {
                    col0 = findColumnIndex(headerCols, "sophong", "phong", "roomnumber", "room", "so");
                    col1 = findColumnIndex(headerCols, "idloaiphong", "loaiphong", "roomtype", "roomtypeid", "loai");
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
                        cols = DataController.parseCsvLine(trimmed, delimiter);
                    }

                    lineNum++;
                    totalRows++;

                    // Định kỳ cập nhật tiến trình cho người dùng
                    if (totalRows % 20 == 0 || totalRows < 10) {
                        int progress = Math.min(88, 20 + (totalRows / 5));
                        task.setProgressPercent(progress);
                        task.setStatusMessage("Đang đối soát và ghi nhận dữ liệu vào CSDL (Đã xử lý " + totalRows + " dòng)...");
                        task.setSubMessage("Quá trình có thể mất từ 1 - 2 phút tùy theo khối lượng bản ghi. Hệ thống sẽ hoàn tất ngay...");
                    }

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
                        }

                    } catch (Exception ex) {
                        errorCount++;
                        details.add(String.format("Dòng %d: Lỗi không xác định - %s", lineNum, ex.getMessage()));
                    }
                }
            }

            long durationMs = System.currentTimeMillis() - startTime;

            task.setStatus("COMPLETED");
            task.setProgressPercent(100);
            task.setTotalRows(totalRows);
            task.setProcessedRows(totalRows);
            task.setImportedCount(importedCount);
            task.setSkippedCount(skippedCount);
            task.setErrorCount(errorCount);
            task.setDurationMs(durationMs);
            task.setCompletedAt(LocalDateTime.now());
            task.setDetails(details);

            String summaryMessage = String.format("Nhập dữ liệu %s hoàn tất: %d bản ghi thành công (Bỏ qua: %d, Lỗi: %d) trong %d ms.",
                    targetType, importedCount, skippedCount, errorCount, durationMs);
            task.setStatusMessage(summaryMessage);
            task.setSubMessage("Đã cập nhật đồng bộ CSDL.");

            if (actor != null) {
                auditLogService.log("Data", null, "ASYNC_IMPORT_" + targetType.toUpperCase(Locale.ROOT), actor, summaryMessage);
            }

        } catch (Exception e) {
            log.error("Lỗi trong hàng đợi import taskId {}: ", taskId, e);
            task.setStatus("FAILED");
            task.setProgressPercent(100);
            task.setStatusMessage("Quá trình xử lý tệp gặp lỗi: " + e.getMessage());
            task.setSubMessage("Vui lòng kiểm tra lại cấu trúc tệp hoặc liên hệ quản trị viên.");
        }
    }

    // =========================================================================
    // WORKER XỬ LÝ EXPORT NGẦM
    // =========================================================================
    private void executeExportJob(String taskId, String targetType, User actor) {
        long startTime = System.currentTimeMillis();
        DataTaskDto task = taskRegistry.get(taskId);
        if (task == null) return;

        try {
            task.setStatus("PROCESSING");
            task.setProgressPercent(30);
            task.setStatusMessage("Đang kết nối CSDL và trích xuất dữ liệu bảng " + targetType + "...");
            task.setSubMessage("Hệ thống đang chuẩn bị tệp CSV chuẩn mã hóa UTF-8 BOM cho Excel...");

            StringBuilder csv = new StringBuilder();
            csv.append('\uFEFF'); // UTF-8 BOM

            Role actorRole = actor != null ? actor.getRole() : Role.OWNER;

            if ("bookings".equals(targetType)) {
                csv.append("Mã Booking,Khách hàng,Số điện thoại,Phòng,Loại phòng,Ngày nhận,Ngày trả,Trạng thái,Giá dự kiến,Giá thực tế,Nguồn,Ghi chú\n");
                List<Booking> list = bookingRepository.findAll();
                int total = list.size();
                int current = 0;
                for (Booking b : list) {
                    current++;
                    csv.append(b.getId()).append(",");
                    csv.append(escapeCsv(b.getGuest() != null ? b.getGuest().getName() : "")).append(",");
                    csv.append(escapeCsv(b.getGuest() != null && b.getGuest().getPhone() != null ? PersonalDataMasker.displayPhone(b.getGuest().getPhone(), actorRole) : "")).append(",");
                    csv.append(escapeCsv(b.getRoom() != null ? b.getRoom().getRoomNumber() : "Chưa xếp")).append(",");
                    csv.append(escapeCsv(b.getRoomType() != null ? b.getRoomType().getName() : "")).append(",");
                    csv.append(b.getCheckInDate() != null ? b.getCheckInDate() : "").append(",");
                    csv.append(b.getCheckOutDate() != null ? b.getCheckOutDate() : "").append(",");
                    csv.append(b.getStatus() != null ? b.getStatus() : "").append(",");
                    csv.append(b.getExpectedPrice() != null ? b.getExpectedPrice() : "").append(",");
                    csv.append(b.getActualPrice() != null ? b.getActualPrice() : "").append(",");
                    csv.append(escapeCsv(b.getSource() != null ? b.getSource() : "")).append(",");
                    csv.append(escapeCsv(b.getNote() != null ? b.getNote() : "")).append("\n");

                    if (current % 50 == 0 || current == total) {
                        task.setProgressPercent(Math.min(90, 30 + (int)((current / (double)total) * 60)));
                        task.setStatusMessage(String.format("Đang trích xuất %d/%d bản ghi đặt phòng...", current, total));
                    }
                }
                task.setTotalRows(total);

            } else if ("guests".equals(targetType)) {
                csv.append("ID,Tên khách hàng,Số điện thoại,CCCD/CMND,Email,Điểm tích lũy\n");
                List<Guest> list = guestRepository.findAll();
                for (Guest g : list) {
                    csv.append(g.getId()).append(",");
                    csv.append(escapeCsv(g.getName())).append(",");
                    csv.append(escapeCsv(PersonalDataMasker.displayPhone(g.getPhone(), actorRole))).append(",");
                    csv.append(escapeCsv(PersonalDataMasker.displayIdentifier(g.getIdNumber(), actorRole))).append(",");
                    csv.append(escapeCsv(PersonalDataMasker.displayEmail(g.getEmail(), actorRole))).append(",");
                    csv.append(g.getLoyaltyPoints() != null ? g.getLoyaltyPoints() : 0).append("\n");
                }
                task.setTotalRows(list.size());

            } else if ("rooms".equals(targetType)) {
                csv.append("ID,Số phòng,ID Loại phòng,Tên Loại phòng,Tầng,Trạng thái\n");
                List<Room> list = roomRepository.findAll();
                for (Room r : list) {
                    csv.append(r.getId()).append(",");
                    csv.append(escapeCsv(r.getRoomNumber())).append(",");
                    csv.append(r.getRoomType() != null ? r.getRoomType().getId() : 0).append(",");
                    csv.append(escapeCsv(r.getRoomType() != null ? r.getRoomType().getName() : "")).append(",");
                    csv.append(escapeCsv(r.getFloor() != null ? r.getFloor() : "")).append(",");
                    csv.append(r.getStatus() != null ? r.getStatus() : "").append("\n");
                }
                task.setTotalRows(list.size());

            } else if ("room-types".equals(targetType) || "roomtypes".equals(targetType)) {
                csv.append("ID,Tên loại phòng,Giá cơ bản (VNĐ),Sức chứa tối đa,Trạng thái,Mô tả tiện nghi\n");
                List<RoomType> list = roomTypeRepository.findAll();
                for (RoomType rt : list) {
                    csv.append(rt.getId()).append(",");
                    csv.append(escapeCsv(rt.getName())).append(",");
                    csv.append(rt.getBasePrice() != null ? rt.getBasePrice() : "").append(",");
                    csv.append(rt.getMaxCapacity()).append(",");
                    csv.append(rt.isActive() ? "Hoạt động" : "Tạm ẩn").append(",");
                    csv.append(escapeCsv(rt.getAmenitiesDescription() != null ? rt.getAmenitiesDescription() : "")).append("\n");
                }
                task.setTotalRows(list.size());

            } else if ("extra-services".equals(targetType) || "extraservices".equals(targetType)) {
                csv.append("ID,Tên dịch vụ,Đơn giá (VNĐ),Đơn vị tính,Trạng thái\n");
                List<ExtraService> list = extraServiceRepository.findAll();
                for (ExtraService es : list) {
                    csv.append(es.getId()).append(",");
                    csv.append(escapeCsv(es.getName())).append(",");
                    csv.append(es.getUnitPrice() != null ? es.getUnitPrice() : "").append(",");
                    csv.append(escapeCsv(es.getUnit() != null ? es.getUnit() : "")).append(",");
                    csv.append(es.isActive() ? "Hoạt động" : "Tạm ẩn").append("\n");
                }
                task.setTotalRows(list.size());

            } else if ("invoices".equals(targetType)) {
                csv.append("Mã Hóa đơn,Mã Booking,Tiền phòng,Tiền dịch vụ,Giảm giá,Tổng tiền,Trạng thái,Ngày tạo\n");
                List<Invoice> list = invoiceRepository.findAll();
                for (Invoice inv : list) {
                    csv.append(inv.getId()).append(",");
                    csv.append(inv.getBooking() != null ? inv.getBooking().getId() : 0).append(",");
                    csv.append(inv.getRoomAmount() != null ? inv.getRoomAmount() : 0).append(",");
                    csv.append(inv.getServiceAmount() != null ? inv.getServiceAmount() : 0).append(",");
                    csv.append(inv.getDiscountAmount() != null ? inv.getDiscountAmount() : 0).append(",");
                    csv.append(inv.getTotalAmount() != null ? inv.getTotalAmount() : 0).append(",");
                    csv.append(inv.getStatus() != null ? inv.getStatus() : "").append(",");
                    csv.append(inv.getCreatedAt() != null ? inv.getCreatedAt() : "").append("\n");
                }
                task.setTotalRows(list.size());

            } else {
                task.setStatus("FAILED");
                task.setProgressPercent(100);
                task.setStatusMessage("Loại dữ liệu xuất không hợp lệ: " + targetType);
                return;
            }

            byte[] csvBytes = csv.toString().getBytes(StandardCharsets.UTF_8);
            String exportFileName = String.format("stayaway_%s_%s.csv", targetType,
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")));

            exportStorage.put(taskId, csvBytes);
            exportFileNames.put(taskId, exportFileName);

            long durationMs = System.currentTimeMillis() - startTime;
            task.setStatus("COMPLETED");
            task.setProgressPercent(100);
            task.setDurationMs(durationMs);
            task.setFileName(exportFileName);
            task.setDownloadUrl("/api/v1/data/task/" + taskId + "/download");
            task.setStatusMessage("Trích xuất dữ liệu thành công! Tệp đã sẵn sàng tải xuống.");
            task.setSubMessage(String.format("Tệp: %s (%d KB, %d ms)", exportFileName, csvBytes.length / 1024, durationMs));
            task.setCompletedAt(LocalDateTime.now());

            if (actor != null) {
                auditLogService.log("Data", null, "ASYNC_EXPORT_" + targetType.toUpperCase(Locale.ROOT), actor,
                        String.format("Xuất dữ liệu %s hoàn tất (%d bytes, %d ms)", targetType, csvBytes.length, durationMs));
            }

        } catch (Exception e) {
            log.error("Lỗi trong hàng đợi export taskId {}: ", taskId, e);
            task.setStatus("FAILED");
            task.setProgressPercent(100);
            task.setStatusMessage("Quá trình xuất tệp gặp sự cố: " + e.getMessage());
            task.setSubMessage("Vui lòng thử lại sau giây lát.");
        }
    }

    // =========================================================================
    // HÀM TIỆN ÍCH HỖ TRỢ XỬ LÝ CSV
    // =========================================================================
    private char detectDelimiter(String headerLine) {
        int commas = 0, semicolons = 0, tabs = 0;
        boolean inQuotes = false;
        for (char c : headerLine.toCharArray()) {
            if (c == '"') inQuotes = !inQuotes;
            if (!inQuotes) {
                if (c == ',') commas++;
                else if (c == ';') semicolons++;
                else if (c == '\t') tabs++;
            }
        }
        if (semicolons > commas && semicolons > tabs) return ';';
        if (tabs > commas && tabs > semicolons) return '\t';
        return ',';
    }

    private boolean isDataRow(List<String> cols) {
        if (cols == null || cols.isEmpty()) return false;
        try {
            Long.parseLong(cols.get(0).trim());
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    private int findColumnIndex(List<String> headerCols, String... keywords) {
        if (headerCols == null) return -1;
        for (int i = 0; i < headerCols.size(); i++) {
            String norm = normalizeHeader(headerCols.get(i));
            for (String kw : keywords) {
                if (norm.equals(kw) || norm.contains(kw)) {
                    return i;
                }
            }
        }
        return -1;
    }

    private String normalizeHeader(String str) {
        if (str == null) return "";
        return str.toLowerCase(Locale.ROOT)
                .replace(" ", "")
                .replace("_", "")
                .replace("-", "")
                .replace("đ", "d")
                .replace("đ", "d");
    }

    private String getColValue(List<String> cols, int index, String defaultValue) {
        if (index >= 0 && index < cols.size()) {
            String val = cols.get(index).trim();
            return val.isEmpty() ? defaultValue : val;
        }
        return defaultValue;
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
