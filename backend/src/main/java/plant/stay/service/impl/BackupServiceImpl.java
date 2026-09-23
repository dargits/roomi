package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import plant.stay.dto.request.BackupConfigDto;
import plant.stay.dto.response.BackupHistoryDto;
import plant.stay.dto.response.RestoreSummaryDto;
import plant.stay.exception.BusinessException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.HotelSetting;
import plant.stay.model.Role;
import plant.stay.model.SystemBackup;
import plant.stay.model.User;
import plant.stay.repository.HotelSettingRepository;
import plant.stay.repository.SystemBackupRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.BackupService;

import javax.sql.DataSource;
import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.sql.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class BackupServiceImpl implements BackupService {

    private final DataSource dataSource;
    private final SystemBackupRepository systemBackupRepository;
    private final HotelSettingRepository hotelSettingRepository;
    private final AuditLogService auditLogService;

    private static final Path BACKUP_STORAGE_DIR = Paths.get("backups");
    private static final DateTimeFormatter FILE_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmmss");

    private Path getStorageDirectory() {
        try {
            if (!Files.exists(BACKUP_STORAGE_DIR)) {
                Files.createDirectories(BACKUP_STORAGE_DIR);
            }
            return BACKUP_STORAGE_DIR;
        } catch (IOException e) {
            throw new RuntimeException("Không thể khởi tạo thư mục lưu trữ sao lưu: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public BackupHistoryDto createBackup(User actor, String backupType) {
        String type = (backupType != null && backupType.equalsIgnoreCase("DATABASE_SQL")) ? "DATABASE_SQL" : "FULL_ZIP";
        String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
        String extension = "DATABASE_SQL".equals(type) ? ".sql" : ".zip";
        String fileName = "stayaway_backup_" + timestamp + extension;

        Path targetDir = getStorageDirectory();
        Path targetFile = targetDir.resolve(fileName);

        int tableCount = 0;
        long recordCount = 0;
        String checksum = "";

        try {
            if ("DATABASE_SQL".equals(type)) {
                try (OutputStream os = Files.newOutputStream(targetFile);
                     BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(os, StandardCharsets.UTF_8))) {
                    DumpResult result = generateSqlDump(writer);
                    tableCount = result.tableCount;
                    recordCount = result.recordCount;
                }
            } else {
                // FULL_ZIP (SQL dump + Manifest + CSVs)
                try (OutputStream os = Files.newOutputStream(targetFile)) {
                    DumpResult result = packageFullZip(os, actor, timestamp);
                    tableCount = result.tableCount;
                    recordCount = result.recordCount;
                }
            }

            long fileSize = Files.size(targetFile);
            checksum = calculateSha256(targetFile);

            SystemBackup backup = SystemBackup.builder()
                    .fileName(fileName)
                    .filePath(targetFile.toAbsolutePath().toString())
                    .fileSizeBytes(fileSize)
                    .backupType(type)
                    .status("SUCCESS")
                    .tableCount(tableCount)
                    .recordCount(recordCount)
                    .checksum(checksum)
                    .createdBy(actor)
                    .note(actor != null ? "Sao lưu thủ công bởi " + actor.getName() : "Sao lưu định kỳ tự động hệ thống")
                    .build();

            backup = systemBackupRepository.save(backup);

            // Cập nhật HotelSetting
            updateHotelSettingLastBackup("SUCCESS");

            // Ghi nhận AuditLog
            auditLogService.log("SystemBackup", backup.getId(), "CREATE_BACKUP", actor,
                    String.format("Tạo thành công bản sao lưu %s (%d bảng, %d bản ghi, dung lượng: %s)",
                            fileName, tableCount, recordCount, formatBytes(fileSize)));

            log.info("Sao lưu hệ thống thành công: {} [{} bảng, {} bản ghi, {}]", fileName, tableCount, recordCount, formatBytes(fileSize));
            return mapToDto(backup);

        } catch (Exception e) {
            log.error("Lỗi khi tạo bản sao lưu hệ thống: ", e);
            updateHotelSettingLastBackup("FAILED");

            SystemBackup failedBackup = SystemBackup.builder()
                    .fileName(fileName)
                    .filePath(targetFile.toAbsolutePath().toString())
                    .fileSizeBytes(0L)
                    .backupType(type)
                    .status("FAILED")
                    .tableCount(tableCount)
                    .recordCount(recordCount)
                    .createdBy(actor)
                    .note("Lỗi: " + e.getMessage())
                    .build();
            systemBackupRepository.save(failedBackup);

            throw new RuntimeException("Lỗi tạo bản sao lưu: " + e.getMessage(), e);
        }
    }

    @Override
    public void streamInstantBackup(User actor, OutputStream outputStream) {
        try {
            String timestamp = LocalDateTime.now().format(FILE_DATE_FORMAT);
            packageFullZip(outputStream, actor, timestamp);

            auditLogService.log("SystemBackup", null, "INSTANT_DOWNLOAD", actor,
                    "Tải trực tiếp bản sao lưu toàn bộ hệ thống (.ZIP)");
        } catch (Exception e) {
            log.error("Lỗi khi stream tải bản sao lưu tức thì: ", e);
            throw new RuntimeException("Lỗi khi tải bản sao lưu: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<BackupHistoryDto> listBackups() {
        return systemBackupRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Resource getBackupResource(Long id) {
        SystemBackup backup = systemBackupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bản sao lưu với mã ID: " + id));

        Path path = Paths.get(backup.getFilePath());
        if (!Files.exists(path)) {
            // Fallback to local storage dir
            path = getStorageDirectory().resolve(backup.getFileName());
        }

        if (!Files.exists(path)) {
            throw new ResourceNotFoundException("Tệp tin sao lưu không còn tồn tại trên máy chủ: " + backup.getFileName());
        }

        return new FileSystemResource(path);
    }

    @Override
    @Transactional
    public void deleteBackup(Long id, User actor) {
        SystemBackup backup = systemBackupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bản sao lưu với mã ID: " + id));

        try {
            Path path = Paths.get(backup.getFilePath());
            if (Files.exists(path)) {
                Files.delete(path);
            }
        } catch (IOException e) {
            log.warn("Không thể xóa file vật lý của bản sao lưu {}: {}", backup.getFileName(), e.getMessage());
        }

        systemBackupRepository.delete(backup);

        auditLogService.log("SystemBackup", id, "DELETE_BACKUP", actor,
                "Đã xóa bản sao lưu: " + backup.getFileName());
        log.info("Đã xóa bản sao lưu ID {}: {}", id, backup.getFileName());
    }

    @Override
    public RestoreSummaryDto restoreBackup(Long id, User actor) {
        if (actor == null || (actor.getRole() != Role.OWNER && actor.getRole() != Role.ADMIN)) {
            throw new BusinessException("Chỉ Quản trị viên (ADMIN) hoặc Chủ cơ sở (OWNER) mới có quyền thực hiện khôi phục hệ thống");
        }

        SystemBackup backup = systemBackupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bản sao lưu với mã ID: " + id));

        Path path = Paths.get(backup.getFilePath());
        if (!Files.exists(path)) {
            path = getStorageDirectory().resolve(backup.getFileName());
        }
        if (!Files.exists(path)) {
            throw new ResourceNotFoundException("Tệp sao lưu không tồn tại trên máy chủ: " + backup.getFileName());
        }

        return executeRestoreFromPath(path, backup.getFileName(), actor);
    }

    @Override
    public RestoreSummaryDto restoreFromUpload(MultipartFile file, User actor) {
        if (actor == null || (actor.getRole() != Role.OWNER && actor.getRole() != Role.ADMIN)) {
            throw new BusinessException("Chỉ Quản trị viên (ADMIN) hoặc Chủ cơ sở (OWNER) mới có quyền thực hiện khôi phục hệ thống");
        }

        if (file.isEmpty()) {
            throw new BusinessException("Tệp sao lưu tải lên không được để trống");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || (!originalFilename.toLowerCase().endsWith(".sql") && !originalFilename.toLowerCase().endsWith(".zip"))) {
            throw new BusinessException("Chỉ hỗ trợ tệp sao lưu định dạng .sql hoặc .zip");
        }

        Path tempFile = null;
        try {
            tempFile = Files.createTempFile("restore_upload_", originalFilename);
            file.transferTo(tempFile);
            return executeRestoreFromPath(tempFile, originalFilename, actor);
        } catch (IOException e) {
            throw new RuntimeException("Lỗi lưu tệp tạm để khôi phục: " + e.getMessage(), e);
        } finally {
            if (tempFile != null) {
                try {
                    Files.deleteIfExists(tempFile);
                } catch (IOException ignored) {}
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public BackupConfigDto getConfig() {
        HotelSetting setting = getOrCreateHotelSetting();
        List<SystemBackup> backups = systemBackupRepository.findAll();

        long totalBytes = 0;
        for (SystemBackup b : backups) {
            if (b.getFileSizeBytes() != null) {
                totalBytes += b.getFileSizeBytes();
            }
        }

        String autoTime = setting.getAutoBackupTime() != null
                ? setting.getAutoBackupTime().format(DateTimeFormatter.ofPattern("HH:mm"))
                : "02:00";

        return BackupConfigDto.builder()
                .autoBackupEnabled(setting.getAutoBackupEnabled() != null ? setting.getAutoBackupEnabled() : true)
                .autoBackupTime(autoTime)
                .backupRetentionDays(setting.getBackupRetentionDays() != null ? setting.getBackupRetentionDays() : 30)
                .lastBackupAt(setting.getLastBackupAt())
                .lastBackupStatus(setting.getLastBackupStatus())
                .totalBackups(backups.size())
                .totalStorageBytes(totalBytes)
                .formattedTotalStorage(formatBytes(totalBytes))
                .build();
    }

    @Override
    @Transactional
    public BackupConfigDto updateConfig(BackupConfigDto dto, User actor) {
        HotelSetting setting = getOrCreateHotelSetting();

        if (dto.getAutoBackupEnabled() != null) {
            setting.setAutoBackupEnabled(dto.getAutoBackupEnabled());
        }

        if (dto.getAutoBackupTime() != null && !dto.getAutoBackupTime().isBlank()) {
            try {
                setting.setAutoBackupTime(LocalTime.parse(dto.getAutoBackupTime().trim()));
            } catch (Exception e) {
                throw new BusinessException("Định dạng giờ không hợp lệ (yêu cầu HH:mm, ví dụ: 02:00)");
            }
        }

        if (dto.getBackupRetentionDays() != null) {
            if (dto.getBackupRetentionDays() < 1 || dto.getBackupRetentionDays() > 365) {
                throw new BusinessException("Số ngày lưu trữ phải nằm trong khoảng từ 1 đến 365 ngày");
            }
            setting.setBackupRetentionDays(dto.getBackupRetentionDays());
        }

        setting.setUpdatedBy(actor);
        hotelSettingRepository.save(setting);

        auditLogService.log("HotelSetting", setting.getId(), "UPDATE_BACKUP_CONFIG", actor,
                String.format("Cập nhật cấu hình sao lưu: Bật=%s, Giờ=%s, Lưu trữ=%d ngày",
                        setting.getAutoBackupEnabled(), setting.getAutoBackupTime(), setting.getBackupRetentionDays()));

        return getConfig();
    }

    @Override
    @Transactional
    public int purgeExpiredBackups() {
        HotelSetting setting = getOrCreateHotelSetting();
        int retentionDays = setting.getBackupRetentionDays() != null ? setting.getBackupRetentionDays() : 30;
        LocalDateTime threshold = LocalDateTime.now().minusDays(retentionDays);

        List<SystemBackup> expired = systemBackupRepository.findByCreatedAtBefore(threshold);
        int count = 0;
        for (SystemBackup b : expired) {
            try {
                Path path = Paths.get(b.getFilePath());
                Files.deleteIfExists(path);
            } catch (Exception e) {
                log.warn("Không thể xóa file hết hạn {}: {}", b.getFileName(), e.getMessage());
            }
            systemBackupRepository.delete(b);
            count++;
        }
        if (count > 0) {
            log.info("Đã tự động dọn dẹp {} bản sao lưu quá hạn {} ngày", count, retentionDays);
        }
        return count;
    }

    // ==========================================
    // LẬP LỊCH TỰ ĐỘNG CHẠY HÀNG PHÚT
    // ==========================================
    @Scheduled(cron = "0 * * * * ?")
    public void scheduledBackupWorker() {
        try {
            HotelSetting setting = getOrCreateHotelSetting();
            if (Boolean.FALSE.equals(setting.getAutoBackupEnabled())) {
                return;
            }

            LocalTime scheduledTime = setting.getAutoBackupTime() != null ? setting.getAutoBackupTime() : LocalTime.of(2, 0);
            LocalTime now = LocalTime.now();

            // Kiểm tra khớp giờ và phút
            if (now.getHour() == scheduledTime.getHour() && now.getMinute() == scheduledTime.getMinute()) {
                LocalDateTime lastBackup = setting.getLastBackupAt();
                // Đảm bảo hôm nay chưa chạy
                if (lastBackup == null || lastBackup.toLocalDate().isBefore(LocalDate.now())) {
                    log.info("Bắt đầu thực thi sao lưu tự động định kỳ theo lịch [{}:{}]...", scheduledTime.getHour(), scheduledTime.getMinute());
                    createBackup(null, "FULL_ZIP");
                    purgeExpiredBackups();
                }
            }
        } catch (Exception e) {
            log.error("Lỗi trong quá trình chạy tác vụ sao lưu tự động: ", e);
        }
    }

    // ==========================================
    // CÁC HÀM XỬ LÝ NỘI BỘ (JDBC ENGINE & ZIP)
    // ==========================================

    private static class DumpResult {
        int tableCount;
        long recordCount;
        List<TableSummary> tableSummaries = new ArrayList<>();
    }

    private static class TableSummary {
        String name;
        long recordCount;
        TableSummary(String name, long recordCount) {
            this.name = name;
            this.recordCount = recordCount;
        }
    }

    /**
     * Xuất SQL dump hoàn chỉnh độc lập không cần mysqldump
     */
    private DumpResult generateSqlDump(Writer writer) throws Exception {
        DumpResult result = new DumpResult();

        writer.write("-- ========================================================\n");
        writer.write("-- StayAway Hotel PMS - Full Database Backup\n");
        writer.write("-- Server Date Time: " + LocalDateTime.now() + "\n");
        writer.write("-- Built with Pure JDBC Database Engine (No external CLI needed)\n");
        writer.write("-- ========================================================\n\n");
        writer.write("/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;\n");
        writer.write("/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;\n");
        writer.write("/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;\n");
        writer.write("/*!40101 SET NAMES utf8mb4 */;\n");
        writer.write("/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;\n");
        writer.write("/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;\n");
        writer.write("/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;\n");
        writer.write("/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;\n\n");

        try (Connection conn = dataSource.getConnection()) {
            String catalog = conn.getCatalog();
            List<String> tables = getTableNames(conn, catalog);
            result.tableCount = tables.size();

            for (String tableName : tables) {
                // Đọc DDL: SHOW CREATE TABLE
                writer.write("-- --------------------------------------------------------\n");
                writer.write("-- Table structure for table `" + tableName + "`\n");
                writer.write("-- --------------------------------------------------------\n");
                writer.write("DROP TABLE IF EXISTS `" + tableName + "`;\n");

                try (Statement stmt = conn.createStatement();
                     ResultSet rs = stmt.executeQuery("SHOW CREATE TABLE `" + tableName + "`")) {
                    if (rs.next()) {
                        String createSql = rs.getString(2);
                        writer.write(createSql + ";\n\n");
                    }
                } catch (SQLException ex) {
                    log.warn("Không thể lấy DDL cho bảng {}: {}", tableName, ex.getMessage());
                    continue;
                }

                // Đọc dữ liệu: SELECT * FROM table
                writer.write("--\n-- Dumping data for table `" + tableName + "`\n--\n");
                long tableRows = 0;

                try (Statement stmt = conn.createStatement();
                     ResultSet rs = stmt.executeQuery("SELECT * FROM `" + tableName + "`")) {
                    ResultSetMetaData rsmd = rs.getMetaData();
                    int colCount = rsmd.getColumnCount();

                    StringBuilder insertBuffer = new StringBuilder();
                    int batchCount = 0;

                    while (rs.next()) {
                        tableRows++;
                        result.recordCount++;

                        if (batchCount == 0) {
                            insertBuffer.append("INSERT INTO `").append(tableName).append("` VALUES ");
                        } else {
                            insertBuffer.append(",\n");
                        }

                        insertBuffer.append("(");
                        for (int i = 1; i <= colCount; i++) {
                            if (i > 1) insertBuffer.append(", ");
                            Object val = rs.getObject(i);
                            if (val == null) {
                                insertBuffer.append("NULL");
                            } else {
                                int colType = rsmd.getColumnType(i);
                                if (colType == Types.BOOLEAN || colType == Types.BIT) {
                                    insertBuffer.append(rs.getBoolean(i) ? "1" : "0");
                                } else if (colType == Types.INTEGER || colType == Types.BIGINT ||
                                           colType == Types.SMALLINT || colType == Types.TINYINT) {
                                    insertBuffer.append(rs.getLong(i));
                                } else if (colType == Types.DECIMAL || colType == Types.NUMERIC ||
                                           colType == Types.FLOAT || colType == Types.DOUBLE) {
                                    insertBuffer.append(rs.getBigDecimal(i).toPlainString());
                                } else if (colType == Types.BINARY || colType == Types.VARBINARY || colType == Types.LONGVARBINARY) {
                                    byte[] bytes = rs.getBytes(i);
                                    insertBuffer.append("0x").append(bytesToHex(bytes));
                                } else {
                                    String str = rs.getString(i);
                                    insertBuffer.append("'").append(escapeSql(str)).append("'");
                                }
                            }
                        }
                        insertBuffer.append(")");
                        batchCount++;

                        // Ghi theo khối 50 dòng
                        if (batchCount >= 50) {
                            insertBuffer.append(";\n");
                            writer.write(insertBuffer.toString());
                            insertBuffer.setLength(0);
                            batchCount = 0;
                        }
                    }

                    if (batchCount > 0) {
                        insertBuffer.append(";\n\n");
                        writer.write(insertBuffer.toString());
                    } else {
                        writer.write("\n");
                    }
                }

                result.tableSummaries.add(new TableSummary(tableName, tableRows));
            }
        }

        writer.write("/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;\n");
        writer.write("/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;\n");
        writer.write("/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;\n");
        writer.write("/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\n");
        writer.write("/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;\n");
        writer.write("/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;\n");
        writer.write("/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;\n");
        writer.write("-- Dump completed on " + LocalDateTime.now() + "\n");
        writer.flush();

        return result;
    }

    /**
     * Đóng gói toàn bộ hệ thống vào file ZIP (SQL dump + Manifest JSON + thư mục CSV UTF-8)
     */
    private DumpResult packageFullZip(OutputStream outputStream, User actor, String timestamp) throws Exception {
        DumpResult result;
        ByteArrayOutputStream sqlBaos = new ByteArrayOutputStream();

        // 1. Tạo SQL Dump trong bộ nhớ
        try (BufferedWriter sqlWriter = new BufferedWriter(new OutputStreamWriter(sqlBaos, StandardCharsets.UTF_8))) {
            result = generateSqlDump(sqlWriter);
        }

        byte[] sqlBytes = sqlBaos.toByteArray();

        try (ZipOutputStream zos = new ZipOutputStream(outputStream, StandardCharsets.UTF_8)) {
            // A. Thêm database_dump.sql
            ZipEntry sqlEntry = new ZipEntry("database_dump.sql");
            zos.putNextEntry(sqlEntry);
            zos.write(sqlBytes);
            zos.closeEntry();

            // B. Thêm manifest.json
            String manifestJson = buildManifestJson(actor, timestamp, result);
            ZipEntry manifestEntry = new ZipEntry("manifest.json");
            zos.putNextEntry(manifestEntry);
            zos.write(manifestJson.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // C. Thêm từng bảng dữ liệu dạng CSV vào thư mục csv/
            Set<String> addedCsvEntries = new HashSet<>();
            try (Connection conn = dataSource.getConnection()) {
                String catalog = conn.getCatalog();
                List<String> tables = getTableNames(conn, catalog);

                for (String tableName : tables) {
                    String entryName = "csv/" + tableName.toLowerCase() + ".csv";
                    if (!addedCsvEntries.add(entryName.toLowerCase())) {
                        continue;
                    }
                    ZipEntry csvEntry = new ZipEntry(entryName);
                    zos.putNextEntry(csvEntry);
                    // UTF-8 BOM
                    zos.write(0xEF);
                    zos.write(0xBB);
                    zos.write(0xBF);

                    try (Statement stmt = conn.createStatement();
                         ResultSet rs = stmt.executeQuery("SELECT * FROM `" + tableName + "`")) {
                        ResultSetMetaData rsmd = rs.getMetaData();
                        int colCount = rsmd.getColumnCount();

                        StringBuilder header = new StringBuilder();
                        for (int i = 1; i <= colCount; i++) {
                            if (i > 1) header.append(",");
                            header.append(escapeCsv(rsmd.getColumnName(i)));
                        }
                        header.append("\n");
                        zos.write(header.toString().getBytes(StandardCharsets.UTF_8));

                        while (rs.next()) {
                            StringBuilder row = new StringBuilder();
                            for (int i = 1; i <= colCount; i++) {
                                if (i > 1) row.append(",");
                                String val = rs.getString(i);
                                row.append(escapeCsv(val));
                            }
                            row.append("\n");
                            zos.write(row.toString().getBytes(StandardCharsets.UTF_8));
                        }
                    } catch (Exception ex) {
                        log.warn("Không thể xuất CSV cho bảng {}: {}", tableName, ex.getMessage());
                    }
                    zos.closeEntry();
                }
            }
            zos.finish();
        }

        return result;
    }

    private String buildManifestJson(User actor, String timestamp, DumpResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        sb.append("  \"systemName\": \"StayAway PMS\",\n");
        sb.append("  \"version\": \"1.0.0\",\n");
        sb.append("  \"backupType\": \"FULL_SYSTEM_ARCHIVE\",\n");
        sb.append("  \"timestamp\": \"").append(timestamp).append("\",\n");
        sb.append("  \"createdAt\": \"").append(LocalDateTime.now()).append("\",\n");
        String creatorName = (actor != null) ? (actor.getName() + " (" + actor.getEmail() + ")") : "Hệ thống tự động";
        sb.append("  \"createdBy\": \"").append(escapeJson(creatorName)).append("\",\n");
        sb.append("  \"totalTables\": ").append(result.tableCount).append(",\n");
        sb.append("  \"totalRecords\": ").append(result.recordCount).append(",\n");
        sb.append("  \"tables\": [\n");
        for (int i = 0; i < result.tableSummaries.size(); i++) {
            TableSummary ts = result.tableSummaries.get(i);
            sb.append("    { \"tableName\": \"").append(escapeJson(ts.name))
              .append("\", \"recordCount\": ").append(ts.recordCount).append(" }");
            if (i < result.tableSummaries.size() - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append("  ]\n");
        sb.append("}\n");
        return sb.toString();
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    /**
     * Khôi phục cơ sở dữ liệu từ file .sql hoặc .zip
     */
    private RestoreSummaryDto executeRestoreFromPath(Path filePath, String originalName, User actor) {
        long startTime = System.currentTimeMillis();
        int statementsExecuted = 0;
        int tablesRestored = 0;

        try {
            String sqlContent;
            if (originalName.toLowerCase().endsWith(".zip")) {
                sqlContent = extractSqlFromZip(filePath);
            } else {
                sqlContent = Files.readString(filePath, StandardCharsets.UTF_8);
            }

            if (sqlContent == null || sqlContent.isBlank()) {
                throw new BusinessException("Không tìm thấy nội dung mã SQL trong tệp sao lưu để khôi phục");
            }

            List<String> statements = parseSqlStatements(sqlContent);

            try (Connection conn = dataSource.getConnection()) {
                // Cấu hình session để việc khôi phục chạy trơn tru, không bị lock wait timeout
                try (Statement initStmt = conn.createStatement()) {
                    initStmt.execute("SET SESSION lock_wait_timeout = 60;");
                    initStmt.execute("SET FOREIGN_KEY_CHECKS = 0;");
                    initStmt.execute("SET UNIQUE_CHECKS = 0;");
                    initStmt.execute("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';");
                }

                try (Statement stmt = conn.createStatement()) {
                    for (String sql : statements) {
                        String trimmed = sql.trim();
                        if (!trimmed.isEmpty()) {
                            try {
                                stmt.execute(trimmed);
                                statementsExecuted++;
                                if (trimmed.toUpperCase().startsWith("CREATE TABLE")) {
                                    tablesRestored++;
                                }
                            } catch (SQLException ex) {
                                log.warn("Cảnh báo khi chạy lệnh SQL khôi phục: {} - Lỗi: {}",
                                        trimmed.length() > 100 ? trimmed.substring(0, 100) + "..." : trimmed, ex.getMessage());
                                if (!trimmed.toUpperCase().startsWith("DROP TABLE")) {
                                    throw ex;
                                }
                            }
                        }
                    }

                    stmt.execute("SET FOREIGN_KEY_CHECKS = 1;");
                    stmt.execute("SET UNIQUE_CHECKS = 1;");
                }
            }

            long duration = System.currentTimeMillis() - startTime;

            try {
                auditLogService.log("SystemBackup", null, "RESTORE_DATABASE", actor,
                        String.format("Khôi phục CSDL thành công từ tệp %s (%d câu lệnh, %d bảng, %d ms)",
                                originalName, statementsExecuted, tablesRestored, duration));
            } catch (Exception auditEx) {
                log.warn("Không thể ghi audit log sau khi khôi phục CSDL: {}", auditEx.getMessage());
            }

            log.info("Khôi phục hệ thống thành công từ tệp {}: {} câu lệnh thực thi trong {} ms",
                    originalName, statementsExecuted, duration);

            return RestoreSummaryDto.builder()
                    .success(true)
                    .message("Khôi phục toàn bộ hệ thống thành công!")
                    .statementsExecuted(statementsExecuted)
                    .tablesRestored(tablesRestored)
                    .durationMs(duration)
                    .restoredAt(LocalDateTime.now())
                    .fileName(originalName)
                    .build();

        } catch (Exception e) {
            log.error("Lỗi trong quá trình khôi phục cơ sở dữ liệu: ", e);
            throw new RuntimeException("Lỗi khôi phục cơ sở dữ liệu: " + e.getMessage(), e);
        }
    }

    private String extractSqlFromZip(Path zipPath) throws IOException {
        try (InputStream is = Files.newInputStream(zipPath);
             ZipInputStream zis = new ZipInputStream(is, StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if ("database_dump.sql".equalsIgnoreCase(entry.getName()) || entry.getName().endsWith(".sql")) {
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    byte[] buffer = new byte[8192];
                    int len;
                    while ((len = zis.read(buffer)) > 0) {
                        baos.write(buffer, 0, len);
                    }
                    return baos.toString(StandardCharsets.UTF_8);
                }
            }
        }
        throw new BusinessException("Tệp ZIP không chứa tệp mã nguồn database_dump.sql hoặc .sql");
    }

    private List<String> parseSqlStatements(String sqlScript) {
        List<String> statements = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inSingleQuote = false;
        boolean inDoubleQuote = false;
        boolean inBacktick = false;

        String[] lines = sqlScript.split("\n");
        for (String line : lines) {
            String trimmedLine = line.trim();
            if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
                if (trimmedLine.startsWith("--") || trimmedLine.startsWith("/*") && trimmedLine.endsWith("*/")) {
                    continue; // Skip full line comments
                }
            }

            char[] chars = line.toCharArray();
            for (int i = 0; i < chars.length; i++) {
                char c = chars[i];
                char prev = (i > 0) ? chars[i - 1] : '\0';

                if (c == '\'' && prev != '\\') {
                    if (!inDoubleQuote && !inBacktick) inSingleQuote = !inSingleQuote;
                } else if (c == '"' && prev != '\\') {
                    if (!inSingleQuote && !inBacktick) inDoubleQuote = !inDoubleQuote;
                } else if (c == '`') {
                    if (!inSingleQuote && !inDoubleQuote) inBacktick = !inBacktick;
                }

                if (c == ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) {
                    current.append(c);
                    statements.add(current.toString().trim());
                    current.setLength(0);
                } else {
                    current.append(c);
                }
            }
            current.append("\n");
        }

        if (current.length() > 0 && !current.toString().trim().isEmpty()) {
            statements.add(current.toString().trim());
        }

        return statements;
    }

    private List<String> getTableNames(Connection conn, String catalog) throws SQLException {
        Set<String> tables = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        DatabaseMetaData meta = conn.getMetaData();
        String schema = null;
        try {
            schema = conn.getSchema();
        } catch (Throwable ignored) {}
        try (ResultSet rs = meta.getTables(catalog, schema, "%", new String[]{"TABLE"})) {
            while (rs.next()) {
                String tableType = rs.getString("TABLE_TYPE");
                if (tableType != null && !tableType.equalsIgnoreCase("TABLE")) {
                    continue;
                }
                String t = rs.getString("TABLE_NAME");
                if (t != null && !t.isBlank() && !t.startsWith("SYSTEM_") && !t.startsWith("INDEX_")) {
                    tables.add(t);
                }
            }
        }
        return new ArrayList<>(tables);
    }

    private String escapeSql(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            switch (c) {
                case '\\': sb.append("\\\\"); break;
                case '\'': sb.append("\\'"); break;
                case '\r': sb.append("\\r"); break;
                case '\n': sb.append("\\n"); break;
                case '\0': sb.append("\\0"); break;
                default: sb.append(c); break;
            }
        }
        return sb.toString();
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n") || val.contains("\r")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }

    private String bytesToHex(byte[] bytes) {
        if (bytes == null) return "";
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private String calculateSha256(Path file) {
        try (InputStream is = Files.newInputStream(file)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int n;
            while ((n = is.read(buffer)) > 0) {
                digest.update(buffer, 0, n);
            }
            return bytesToHex(digest.digest());
        } catch (Exception e) {
            return "N/A";
        }
    }

    private String formatBytes(Long bytes) {
        if (bytes == null || bytes == 0) return "0 KB";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        return String.format("%.2f MB", bytes / (1024.0 * 1024.0));
    }

    private BackupHistoryDto mapToDto(SystemBackup b) {
        return BackupHistoryDto.builder()
                .id(b.getId())
                .fileName(b.getFileName())
                .fileSizeBytes(b.getFileSizeBytes())
                .formattedSize(formatBytes(b.getFileSizeBytes()))
                .backupType(b.getBackupType())
                .status(b.getStatus())
                .tableCount(b.getTableCount())
                .recordCount(b.getRecordCount())
                .checksum(b.getChecksum())
                .createdAt(b.getCreatedAt())
                .createdByName(b.getCreatedBy() != null ? b.getCreatedBy().getName() : "Hệ thống tự động")
                .note(b.getNote())
                .build();
    }

    private HotelSetting getOrCreateHotelSetting() {
        return hotelSettingRepository.findAll().stream().findFirst().orElseGet(() ->
                hotelSettingRepository.save(HotelSetting.builder()
                        .propertyName("StayAway Hotel")
                        .address("Việt Nam")
                        .defaultCheckinTime(LocalTime.of(14, 0))
                        .defaultCheckoutTime(LocalTime.of(12, 0))
                        .autoBackupEnabled(true)
                        .autoBackupTime(LocalTime.of(2, 0))
                        .backupRetentionDays(30)
                        .build()));
    }

    private void updateHotelSettingLastBackup(String status) {
        try {
            HotelSetting setting = getOrCreateHotelSetting();
            setting.setLastBackupAt(LocalDateTime.now());
            setting.setLastBackupStatus(status);
            hotelSettingRepository.save(setting);
        } catch (Exception e) {
            log.warn("Không thể cập nhật lastBackupAt trong HotelSetting: {}", e.getMessage());
        }
    }
}
