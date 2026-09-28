package plant.stay.service.impl;

import lombok.extern.slf4j.Slf4j;
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
import plant.stay.service.TelegramBackupService;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

@Slf4j
@Service
public class TelegramBackupServiceImpl implements TelegramBackupService {

    private final String botToken;
    private final String chatId;
    private final boolean enabled;
    private final RestTemplate restTemplate;
    private final HttpClient httpClient;

    public TelegramBackupServiceImpl(
            @Value("${telegram.bot.token:8227232435:AAHe99DiTOKHxGXsNvC_DJObIsvIHvgmzes}") String botToken,
            @Value("${telegram.bot.chat-id:6865922651}") String chatId,
            @Value("${telegram.bot.enabled:true}") boolean enabled) {
        this.botToken = botToken != null ? botToken.trim() : "";
        this.chatId = chatId != null ? chatId.trim() : "";
        this.enabled = enabled;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30_000);
        factory.setReadTimeout(180_000);
        this.restTemplate = new RestTemplate(factory);

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();
    }

    @Override
    public boolean isConfigured() {
        return enabled && !botToken.isBlank() && !chatId.isBlank();
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

        try {
            long fileSize = Files.size(filePath);
            log.info("Bắt đầu gửi tệp sao lưu [{}] ({} bytes) đến Telegram Bot (Chat ID: {})...", fileName, fileSize, chatId);

            byte[] fileBytes = Files.readAllBytes(filePath);
            ByteArrayResource fileResource = new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return fileName != null ? fileName : "stayaway_backup.zip";
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("chat_id", chatId);
            body.add("caption", caption != null ? caption : "📦 Bản sao lưu hệ thống StayAway PMS");
            body.add("parse_mode", "HTML");
            body.add("document", fileResource);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            String sendUrl = String.format("https://api.telegram.org/bot%s/sendDocument", botToken);

            ResponseEntity<String> response = restTemplate.postForEntity(sendUrl, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String bodyStr = response.getBody();
                if (bodyStr.contains("\"ok\":true")) {
                    String fileId = extractJsonString(bodyStr, "file_id");
                    log.info("Đã gửi tệp sao lưu thành công đến Telegram Bot! File ID: {}", fileId);

                    // Lấy đường dẫn file trực tiếp từ Telegram
                    String downloadUrl = resolveDirectDownloadUrl(fileId);
                    log.info("Đường dẫn tải trực tiếp Telegram Cloud: {}", downloadUrl);
                    return downloadUrl;
                } else {
                    String desc = extractJsonString(bodyStr, "description");
                    log.error("Telegram API trả về lỗi: {}", desc);
                    throw new BusinessException("Lỗi từ Telegram API: " + (desc != null ? desc : bodyStr));
                }
            } else {
                throw new BusinessException("Không thể kết nối đến Telegram API. Mã HTTP: " + response.getStatusCode());
            }

        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("Lỗi khi gửi tệp sao lưu qua Telegram Bot: ", e);
            throw new RuntimeException("Lỗi gửi tệp sao lưu qua Telegram: " + e.getMessage(), e);
        }
    }

    private String resolveDirectDownloadUrl(String fileId) {
        if (fileId == null) {
            return "https://t.me/ohhwsbot";
        }
        try {
            String getFileUrl = String.format("https://api.telegram.org/bot%s/getFile?file_id=%s", botToken, fileId);
            ResponseEntity<String> res = restTemplate.getForEntity(getFileUrl, String.class);
            if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
                String bodyStr = res.getBody();
                if (bodyStr.contains("\"ok\":true")) {
                    String filePath = extractJsonString(bodyStr, "file_path");
                    if (filePath != null && !filePath.isBlank()) {
                        return String.format("https://api.telegram.org/file/bot%s/%s", botToken, filePath);
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
