package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.AiPriceAnalysisRequest;
import plant.stay.dto.response.AiChatResponse;
import plant.stay.dto.response.PriceSuggestionResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.PriceSuggestionService;
import plant.stay.service.impl.AiPriceAnalysisService;
import plant.stay.util.AuthUtil;

import java.time.LocalDate;

/**
 * AiPriceController — Endpoint AI phân tích giá dành cho OWNER/ADMIN.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/ai/price-analysis")
@CrossOrigin("*")
@RequiredArgsConstructor
public class AiPriceController {

    private final AiPriceAnalysisService aiPriceAnalysisService;
    private final PriceSuggestionService priceSuggestionService;
    private final AuthUtil authUtil;

    /**
     * POST /api/v1/ai/price-analysis/overall
     * Phân tích tổng thể 30 ngày tới và đưa ra khuyến nghị chiến lược giá.
     */
    @PostMapping("/overall")
    public ResponseEntity<AiChatResponse> analyzeOverall(
            @RequestBody(required = false) AiPriceAnalysisRequest request,
            HttpServletRequest httpRequest) {
        User actor = checkOwnerOrAdmin(httpRequest);
        int days = (request != null && request.getDays() != null && request.getDays() > 0) ? request.getDays() : 30;

        try {
            // Lấy dữ liệu từ rule-based system làm nền tảng
            PriceSuggestionResponse suggestionData = priceSuggestionService.getPriceSuggestions(days, true, actor);
            String analysis = aiPriceAnalysisService.analyzeOverall(suggestionData);
            return ResponseEntity.ok(AiChatResponse.builder()
                    .reply(analysis)
                    .error(false)
                    .build());
        } catch (Exception e) {
            log.error("AI price analysis error: {}", e.getMessage());
            return ResponseEntity.ok(AiChatResponse.builder()
                    .error(true)
                    .errorMessage(e.getMessage())
                    .reply("Không thể thực hiện phân tích AI lúc này. " + e.getMessage())
                    .build());
        }
    }

    /**
     * POST /api/v1/ai/price-analysis/day/{date}
     * Phân tích chi tiết cho một ngày cụ thể.
     */
    @PostMapping("/day/{date}")
    public ResponseEntity<AiChatResponse> analyzeDay(
            @PathVariable String date,
            @RequestBody(required = false) AiPriceAnalysisRequest request,
            HttpServletRequest httpRequest) {
        User actor = checkOwnerOrAdmin(httpRequest);

        try {
            LocalDate targetDate = LocalDate.parse(date);
            // Lấy data từ rule-based system để tìm dto ngày đó
            PriceSuggestionResponse allData = priceSuggestionService.getPriceSuggestions(60, true, actor);
            var dayDto = allData.getSuggestions().stream()
                    .filter(s -> targetDate.equals(s.getTargetDate()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy dữ liệu cho ngày " + date));

            String question = request != null ? request.getQuestion() : null;
            String analysis = aiPriceAnalysisService.analyzeDay(dayDto, question);
            return ResponseEntity.ok(AiChatResponse.builder()
                    .reply(analysis)
                    .error(false)
                    .build());
        } catch (Exception e) {
            log.error("AI day analysis error: {}", e.getMessage());
            return ResponseEntity.ok(AiChatResponse.builder()
                    .error(true)
                    .errorMessage(e.getMessage())
                    .reply("Không thể phân tích ngày này. " + e.getMessage())
                    .build());
        }
    }

    /**
     * POST /api/v1/ai/price-analysis/ask
     * Đặt câu hỏi tùy ý về giá, chiến lược, doanh thu.
     */
    @PostMapping("/ask")
    public ResponseEntity<AiChatResponse> ask(
            @RequestBody AiPriceAnalysisRequest request,
            HttpServletRequest httpRequest) {
        User actor = checkOwnerOrAdmin(httpRequest);

        if (request.getQuestion() == null || request.getQuestion().isBlank()) {
            return ResponseEntity.badRequest().body(AiChatResponse.builder()
                    .error(true)
                    .errorMessage("Câu hỏi không được để trống.")
                    .build());
        }

        try {
            int days = (request.getDays() != null && request.getDays() > 0) ? request.getDays() : 30;
            PriceSuggestionResponse suggestionData = priceSuggestionService.getPriceSuggestions(days, true, actor);
            String analysis = aiPriceAnalysisService.askAboutPricing(request.getQuestion(), suggestionData);
            return ResponseEntity.ok(AiChatResponse.builder()
                    .reply(analysis)
                    .error(false)
                    .build());
        } catch (Exception e) {
            log.error("AI ask error: {}", e.getMessage());
            return ResponseEntity.ok(AiChatResponse.builder()
                    .error(true)
                    .errorMessage(e.getMessage())
                    .reply("Không thể xử lý câu hỏi lúc này. " + e.getMessage())
                    .build());
        }
    }

    private User checkOwnerOrAdmin(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN)) {
            throw new UnauthorizedException("Chỉ OWNER hoặc ADMIN mới có quyền sử dụng tính năng AI phân tích giá.");
        }
        return user;
    }
}
