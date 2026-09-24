package plant.stay.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import plant.stay.repository.HotelSettingRepository;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * GeminiService — Engine gọi Google Gemini API với cơ chế xoay vòng model và API key.
 * <p>
 * Thứ tự ưu tiên model (giảm dần):
 *   1. gemini-3.8-flash
 *   2. gemini-3.5-flash
 *   3. gemini-3.5-flash-lite
 *   4. gemini-3.1-flash-lite
 * <p>
 * Logic fallback:
 *   - Khi 1 model trả 429 (rate limit) → thử model tiếp theo.
 *   - Khi hết tất cả model của key hiện tại → chuyển sang key tiếp theo.
 *   - Khi hết tất cả key → trả exception.
 */
@Slf4j
@Service
public class GeminiService {

    private static final List<String> MODEL_PRIORITY = List.of(
            "gemini-3.8-flash",
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
    );

    private static final String GEMINI_BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}";

    @Autowired
    private HotelSettingRepository hotelSettingRepository;

    @Autowired
    private RestTemplate restTemplate;

    /**
     * Gọi Gemini API với systemPrompt + userMessage, tự động xoay vòng key/model.
     *
     * @param systemPrompt Ngữ cảnh hệ thống (context khách sạn, hướng dẫn AI)
     * @param userMessage  Câu hỏi/yêu cầu của người dùng
     * @return Nội dung phản hồi từ AI
     * @throws RuntimeException khi tất cả key và model đều thất bại
     */
    public String chat(String systemPrompt, String userMessage) {
        List<String> keys = getApiKeys();
        if (keys.isEmpty()) {
            throw new RuntimeException("Chưa cấu hình Google API Key. Vui lòng vào Cài đặt Khách sạn để cấu hình API Key.");
        }

        for (int i = 0; i < keys.size(); i++) {
            String key = keys.get(i);
            String keyDisplay = "Key #" + (i + 1) + " (" + key.substring(0, Math.min(8, key.length())) + "...)";
            boolean keyInvalid = false;

            for (String model : MODEL_PRIORITY) {
                try {
                    String result = callGemini(key, model, systemPrompt, userMessage);
                    log.info("Gemini OK — model={}, {}", model, keyDisplay);
                    return result;
                } catch (HttpClientErrorException e) {
                    int status = e.getStatusCode().value();
                    if (status == 429 || status == 503) {
                        log.warn("Gemini rate-limit/overloaded (status={}) — model={} on {}, chuyển model tiếp theo...", status, model, keyDisplay);
                        // Hết limit model -> thử model tiếp theo
                    } else if (status == 404 || status == 400) {
                        log.warn("Gemini model không khả dụng/không tồn tại (status={}) — model={} on {}, thử model tiếp theo...", status, model, keyDisplay);
                        // Model không hỗ trợ hoặc chưa ra mắt -> thử model tiếp theo
                    } else if (status == 401 || status == 403) {
                        log.warn("Gemini key không hợp lệ hoặc hết hạn ngạch project (status={}) — on {}, đổi sang key tiếp theo...", status, keyDisplay);
                        keyInvalid = true;
                        break; // Đổi key mới
                    } else {
                        log.warn("Gemini lỗi (status={}) — model={} on {}: {}", status, model, keyDisplay, e.getResponseBodyAsString());
                    }
                } catch (Exception e) {
                    log.warn("Gemini ngoại lệ — model={} on {}: {}", model, keyDisplay, e.getMessage());
                }
            }

            if (keyInvalid) {
                log.info("Chuyển sang key tiếp theo vì key hiện tại gặp lỗi xác thực/hạn ngạch.");
            } else {
                log.warn("Tất cả model thất bại với {}, thử key tiếp theo...", keyDisplay);
            }
        }

        throw new RuntimeException("Tất cả Google API Key và model đều không khả dụng lúc này. Vui lòng kiểm tra lại danh sách API Key.");
    }

    /**
     * Thực hiện HTTP call tới Gemini REST API.
     */
    @SuppressWarnings("unchecked")
    private String callGemini(String apiKey, String model, String systemPrompt, String userMessage) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Build request body theo Gemini API format
        Map<String, Object> body = new LinkedHashMap<>();

        // System instruction (context)
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            Map<String, Object> systemInstruction = new LinkedHashMap<>();
            Map<String, String> sysPart = new LinkedHashMap<>();
            sysPart.put("text", systemPrompt);
            systemInstruction.put("parts", List.of(sysPart));
            body.put("system_instruction", systemInstruction);
        }

        // User message
        Map<String, Object> userContent = new LinkedHashMap<>();
        Map<String, String> userPart = new LinkedHashMap<>();
        userPart.put("text", userMessage);
        userContent.put("role", "user");
        userContent.put("parts", List.of(userPart));
        body.put("contents", List.of(userContent));

        // Generation config
        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("temperature", 0.7);
        generationConfig.put("maxOutputTokens", 2048);
        generationConfig.put("topP", 0.9);
        body.put("generationConfig", generationConfig);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        Map<String, String> uriVars = new HashMap<>();
        uriVars.put("model", model);
        uriVars.put("key", apiKey);

        ResponseEntity<Map> response = restTemplate.exchange(
                GEMINI_BASE_URL,
                HttpMethod.POST,
                entity,
                Map.class,
                uriVars
        );

        // Parse response
        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null) {
            throw new RuntimeException("Gemini trả về response rỗng.");
        }

        List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseBody.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new RuntimeException("Gemini không trả về kết quả nào.");
        }

        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        if (content == null) {
            throw new RuntimeException("Gemini response không có content.");
        }

        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        if (parts == null || parts.isEmpty()) {
            throw new RuntimeException("Gemini response không có parts.");
        }

        return (String) parts.get(0).get("text");
    }

    /**
     * Đọc danh sách API key từ HotelSetting (mỗi key 1 dòng).
     */
    private List<String> getApiKeys() {
        return hotelSettingRepository.findById(1L)
                .map(s -> {
                    String raw = s.getGoogleApiKeys();
                    if (raw == null || raw.isBlank()) return List.<String>of();
                    return Arrays.stream(raw.split("\n"))
                            .map(String::trim)
                            .filter(k -> !k.isEmpty())
                            .toList();
                })
                .orElse(List.of());
    }
}
