package plant.stay.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.AiChatRequest;
import plant.stay.dto.response.AiChatResponse;
import plant.stay.service.impl.AiChatService;

/**
 * AiChatController — Endpoint công khai để khách hàng chat với AI của khách sạn.
 * Không cần xác thực (public endpoint).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/ai/chat")
@CrossOrigin("*")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    /**
     * POST /api/v1/ai/chat
     * Body: { "message": "...", "checkIn": "2026-10-01", "checkOut": "2026-10-03" }
     */
    @PostMapping
    public ResponseEntity<AiChatResponse> chat(@RequestBody AiChatRequest request) {
        if (request.getMessage() == null || request.getMessage().isBlank()) {
            return ResponseEntity.badRequest().body(AiChatResponse.builder()
                    .error(true)
                    .errorMessage("Tin nhắn không được để trống.")
                    .build());
        }

        try {
            String reply = aiChatService.chat(
                    request.getMessage(),
                    request.getCheckIn(),
                    request.getCheckOut()
            );
            return ResponseEntity.ok(AiChatResponse.builder()
                    .reply(reply)
                    .error(false)
                    .build());
        } catch (Exception e) {
            log.error("AI chat error: {}", e.getMessage());
            return ResponseEntity.ok(AiChatResponse.builder()
                    .error(true)
                    .errorMessage(e.getMessage())
                    .reply("Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau hoặc liên hệ trực tiếp với khách sạn. 🙏")
                    .build());
        }
    }
}
