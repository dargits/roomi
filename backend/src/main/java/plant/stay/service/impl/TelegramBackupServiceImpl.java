package plant.stay.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import plant.stay.exception.BusinessException;
import plant.stay.model.HotelSetting;
import plant.stay.repository.HotelSettingRepository;
import plant.stay.service.TelegramBackupService;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
public class TelegramBackupServiceImpl implements TelegramBackupService {

    private final String defaultBotToken;
    private final String defaultChatId;
    private final boolean defaultEnabled;
    private final RestTemplate restTemplate;
    private final HttpClient httpClient;

    @Autowired
    private HotelSettingRepository hotelSettingRepository;

    public TelegramBackupServiceImpl(
            @Value("${telegram.bot.token:}") String defaultBotToken,
            @Value("${telegram.bot.chat-id:}") String defaultChatId,
            @Value("${telegram.bot.enabled:true}") boolean defaultEnabled) {
        this.defaultBotToken = defaultBotToken != null ? defaultBotToken.trim() : "";
        this.defaultChatId = defaultChatId != null ? defaultChatId.trim() : "";
        this.defaultEnabled = defaultEnabled;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30_000);
        factory.setReadTimeout(180_000);
        this.restTemplate = new RestTemplate(factory);

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();
    }

    private String resolveBotToken() {
        try {
            HotelSetting setting = hotelSettingRepository.findById(1L).orElse(null);
            if (setting != null && setting.getTelegramBotToken() != null && !setting.getTelegramBotToken().isBlank()) {
                return setting.getTelegramBotToken().trim();
            }
        } catch (Exception ignored) {}
        return this.defaultBotToken;
    }

    private boolean isFeatureEnabled() {
        try {
            HotelSetting setting = hotelSettingRepository.findById(1L).orElse(null);
            if (setting != null && setting.getTelegramBackupEnabled() != null) {
                return setting.getTelegramBackupEnabled();
            }
        } catch (Exception ignored) {}
        return this.defaultEnabled;
    }

    @Override
    public List<String> getAllowedChatIds() {
        Set<String> uniqueIds = new LinkedHashSet<>();
        try {
            HotelSetting setting = hotelSettingRepository.findById(1L).orElse(null);
            if (setting != null && setting.getTelegramChatIds() != null && !setting.getTelegramChatIds().isBlank()) {
                String[] tokens = setting.getTelegramChatIds().split("[\\r\\n,;]+");
                for (String t : tokens) {
                    String clean = t.trim();
                    if (!clean.isEmpty()) {
                        uniqueIds.add(clean);
                    }
                }
            }
        } catch (Exception ignored) {}

        if (uniqueIds.isEmpty() && this.defaultChatId != null && !this.defaultChatId.isBlank()) {
            uniqueIds.add(this.defaultChatId.trim());
        }
        return new ArrayList<>(uniqueIds);
    }

    @Override
    public boolean isConfigured() {
        String token = resolveBotToken();
        List<String> chatIds = getAllowedChatIds();
        return isFeatureEnabled() && !token.isBlank() && !chatIds.isEmpty();
    }

    @Override
    public String sendBackupDocument(Path filePath, String fileName, String caption) {
        if (!isConfigured()) {
            log.warn("Telegram Bot chưa được kích hoạt hoặc thiếu cấu hình (token/chatId)");
            return null;
        }

        if (!Files.exists(filePath)) {
            throw new BusinessException("Tệp tin sao lưu không tồn tại: " + filePath);
        }

        List<String> targetChatIds = getAllowedChatIds();
        String currentToken = resolveBotToken();
        String firstDownloadUrl = null;
        int successCount = 0;
        List<String> errors = new ArrayList<>();

        try {
            long fileSize = Files.size(filePath);
            byte[] fileBytes = Files.readAllBytes(filePath);

            for (String targetChatId : targetChatIds) {
                try {
                    log.info("Bắt đầu gửi tệp sao lưu [{}] ({} bytes) đến Telegram Bot (Chat ID: {})...", fileName, fileSize, targetChatId);

                    ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
                        @Override
                        public String getFilename() {
                            return fileName != null ? fileName : "stayaway_backup.zip";
                        }
                    };

                    MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
                    body.add("chat_id", targetChatId);
                    body.add("caption", caption != null ? caption : "📦 Bản sao lưu hệ thống StayAway PMS");
                    body.add("parse_mode", "HTML");
                    body.add("document", fileResource);

                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.MULTIPART_FORM_DATA);

                    HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
                    String sendUrl = String.format("https://api.telegram.org/bot%s/sendDocument", currentToken);

                    ResponseEntity<String> response = restTemplate.postForEntity(sendUrl, requestEntity, String.class);

                    if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                        String bodyStr = response.getBody();
                        if (bodyStr.contains("\"ok\":true")) {
                            String fileId = extractJsonString(bodyStr, "file_id");
                            log.info("Đã gửi tệp sao lưu thành công đến Telegram Chat ID: {}! File ID: {}", targetChatId, fileId);
                            if (firstDownloadUrl == null) {
                                firstDownloadUrl = resolveDirectDownloadUrl(fileId, currentToken);
                            }
                            successCount++;
                        } else {
                            String desc = extractJsonString(bodyStr, "description");
                            log.warn("Telegram API trả về lỗi cho Chat ID {}: {}", targetChatId, desc);
                            errors.add("Chat " + targetChatId + ": " + desc);
                        }
                    }
                } catch (Exception ex) {
                    log.error("Lỗi khi gửi tệp sao lưu đến Chat ID {}: {}", targetChatId, ex.getMessage());
                    errors.add("Chat " + targetChatId + ": " + ex.getMessage());
                }
            }

            if (successCount == 0 && !errors.isEmpty()) {
                throw new BusinessException("Không thể gửi tệp sao lưu tới bất kỳ tài khoản Telegram nào: " + String.join(", ", errors));
            }

            log.info("Hoàn tất gửi sao lưu qua Telegram: thành công {}/{} tài khoản.", successCount, targetChatIds.size());
            return firstDownloadUrl;

        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("Lỗi khi gửi tệp sao lưu qua Telegram Bot: ", e);
            throw new RuntimeException("Lỗi gửi tệp sao lưu qua Telegram: " + e.getMessage(), e);
        }
    }

    @Override
    public String testSendToAll(String customMessage) {
        String token = resolveBotToken();
        List<String> chatIds = getAllowedChatIds();
        if (token.isBlank() || chatIds.isEmpty()) {
            throw new BusinessException("Chưa cấu hình Telegram Bot Token hoặc danh sách Chat ID.");
        }

        String msg = customMessage != null && !customMessage.isBlank() ? customMessage :
                "🤖 <b>[StayAway PMS] Thông báo kiểm tra kết nối Telegram Bot</b>\n\n" +
                "✅ Tài khoản Telegram của bạn đã được ủy quyền nhận dữ liệu sao lưu & thông báo hệ thống.\n" +
                "⏰ Thời gian: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));

        int success = 0;
        List<String> fails = new ArrayList<>();

        for (String cId : chatIds) {
            try {
                MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
                body.add("chat_id", cId);
                body.add("text", msg);
                body.add("parse_mode", "HTML");

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

                HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
                String sendUrl = String.format("https://api.telegram.org/bot%s/sendMessage", token);

                ResponseEntity<String> res = restTemplate.postForEntity(sendUrl, request, String.class);
                if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null && res.getBody().contains("\"ok\":true")) {
                    success++;
                } else {
                    String desc = extractJsonString(res.getBody(), "description");
                    fails.add(cId + " (" + (desc != null ? desc : "Lỗi không xác định") + ")");
                }
            } catch (Exception e) {
                fails.add(cId + " (" + e.getMessage() + ")");
            }
        }

        if (success == 0) {
            String errorMsg = String.format("Gửi tin nhắn Telegram thất bại tới 0/%d tài khoản.", chatIds.size());
            if (!fails.isEmpty()) {
                errorMsg += " Thất bại: " + String.join(", ", fails);
            }
            throw new BusinessException(errorMsg);
        }

        String summary = String.format("Đã gửi thông báo thử nghiệm thành công tới %d/%d tài khoản.", success, chatIds.size());
        if (!fails.isEmpty()) {
            summary += " Thất bại: " + String.join(", ", fails);
        }
        return summary;
    }

    private String resolveDirectDownloadUrl(String fileId, String token) {
        if (fileId == null) {
            return "https://t.me/ohhwsbot";
        }
        try {
            String getFileUrl = String.format("https://api.telegram.org/bot%s/getFile?file_id=%s", token, fileId);
            ResponseEntity<String> res = restTemplate.getForEntity(getFileUrl, String.class);
            if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
                String bodyStr = res.getBody();
                if (bodyStr.contains("\"ok\":true")) {
                    String filePath = extractJsonString(bodyStr, "file_path");
                    if (filePath != null && !filePath.isBlank()) {
                        return String.format("https://api.telegram.org/file/bot%s/%s", token, filePath);
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Không thể lấy file_path trực tiếp từ Telegram: {}", ex.getMessage());
        }
        return "https://t.me/ohhwsbot";
    }

    private String extractJsonString(String json, String key) {
        if (json == null) return null;
        String pattern = "\"" + key + "\":\"";
        int start = json.indexOf(pattern);
        if (start != -1) {
            start += pattern.length();
            int end = json.indexOf("\"", start);
            if (end != -1) {
                return json.substring(start, end).replace("\\/", "/");
            }
        }
        return null;
    }

    @Override
    public byte[] downloadFileBytes(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            throw new BusinessException("URL tệp tin Telegram không hợp lệ");
        }

        try {
            log.info("Đang tải dữ liệu tệp sao lưu từ Telegram Cloud [{}]...", fileUrl);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fileUrl))
                    .timeout(Duration.ofMinutes(5))
                    .header("User-Agent", "StayAway-PMS/1.0")
                    .GET()
                    .build();

            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Tải thành công {} bytes từ Telegram Cloud", response.body().length);
                return response.body();
            } else {
                throw new BusinessException("Tải tệp từ Telegram thất bại. Mã HTTP: " + response.statusCode());
            }
        } catch (Exception e) {
            log.error("Lỗi khi tải tệp từ Telegram: ", e);
            throw new RuntimeException("Lỗi tải tệp sao lưu từ Telegram: " + e.getMessage(), e);
        }
    }
}

