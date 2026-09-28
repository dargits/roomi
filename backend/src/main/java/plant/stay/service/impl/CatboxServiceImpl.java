package plant.stay.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import plant.stay.exception.BusinessException;
import plant.stay.service.CatboxService;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

@Slf4j
@Service
public class CatboxServiceImpl implements CatboxService {

    private static final String CATBOX_API_URL = "https://catbox.moe/user/api.php";
    private final RestTemplate restTemplate;
    private final HttpClient httpClient;

    public CatboxServiceImpl() {
        // Cấu hình RestTemplate với timeout rộng rãi cho tệp backup
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30_000); // 30s
        factory.setReadTimeout(180_000);   // 3 phút
        this.restTemplate = new RestTemplate(factory);

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();
    }

    @Override
    public String uploadFile(Path filePath, String fileName) {
        if (!Files.exists(filePath)) {
            throw new BusinessException("Tệp tin sao lưu không tồn tại: " + filePath);
        }

        try {
            log.info("Bắt đầu tải tệp [{}] ({} bytes) lên Catbox.moe...", fileName, Files.size(filePath));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
            headers.set("Accept", "*/*");

            byte[] fileBytes = Files.readAllBytes(filePath);
            org.springframework.core.io.ByteArrayResource fileResource = new org.springframework.core.io.ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return fileName != null ? fileName : "stayaway_backup.zip";
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("reqtype", "fileupload");
            body.add("fileToUpload", fileResource);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(CATBOX_API_URL, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String responseBody = response.getBody().trim();
                if (responseBody.startsWith("https://files.catbox.moe/")) {
                    log.info("Tải lên Catbox.moe thành công: {}", responseBody);
                    return responseBody;
                }
                log.error("Catbox.moe trả về thông báo lỗi: {}", responseBody);
                throw new BusinessException("Lỗi từ Catbox.moe: " + responseBody);
            } else {
                throw new BusinessException("Không thể kết nối đến Catbox.moe. Mã lỗi HTTP: " + response.getStatusCode());
            }

        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("Lỗi khi tải tệp lên Catbox.moe: ", e);
            throw new RuntimeException("Lỗi tải tệp sao lưu lên Catbox Cloud: " + e.getMessage(), e);
        }
    }

    @Override
    public void downloadFile(String fileUrl, Path destination) {
        if (fileUrl == null || fileUrl.isBlank()) {
            throw new BusinessException("URL tệp sao lưu trên đám mây không hợp lệ");
        }

        try {
            log.info("Đang tải tệp sao lưu từ Catbox Cloud [{}] về [{}]...", fileUrl, destination);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fileUrl))
                    .timeout(Duration.ofMinutes(5))
                    .header("User-Agent", "StayAway-PMS/1.0")
                    .GET()
                    .build();

            HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                try (InputStream is = response.body()) {
                    Files.copy(is, destination, StandardCopyOption.REPLACE_EXISTING);
                }
                long downloadedSize = Files.size(destination);
                log.info("Tải tệp từ Catbox thành công ({} bytes): {}", downloadedSize, destination);
            } else {
                throw new BusinessException("Tải tệp từ Catbox thất bại. Mã HTTP: " + response.statusCode());
            }

        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("Lỗi khi tải tệp từ Catbox.moe: ", e);
            throw new RuntimeException("Lỗi tải bản sao lưu từ Catbox: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] downloadFileBytes(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            throw new BusinessException("URL tệp sao lưu trên đám mây không hợp lệ");
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fileUrl))
                    .timeout(Duration.ofMinutes(5))
                    .header("User-Agent", "StayAway-PMS/1.0")
                    .GET()
                    .build();

            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return response.body();
            } else {
                throw new BusinessException("Tải tệp từ Catbox thất bại. Mã HTTP: " + response.statusCode());
            }

        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("Lỗi khi đọc tệp từ Catbox.moe: ", e);
            throw new RuntimeException("Lỗi đọc tệp sao lưu từ Catbox: " + e.getMessage(), e);
        }
    }
}
