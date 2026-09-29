package plant.stay.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import plant.stay.dto.response.MessageResponse;

import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        String firstErrorMessage = null;
        for (org.springframework.validation.ObjectError error : ex.getBindingResult().getAllErrors()) {
            String fieldName = error instanceof FieldError ? ((FieldError) error).getField() : error.getObjectName();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
            if (firstErrorMessage == null && errorMessage != null) {
                firstErrorMessage = errorMessage;
            }
        }
        if (firstErrorMessage != null) {
            errors.put("message", firstErrorMessage);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<MessageResponse> handleDuplicateResourceException(DuplicateResourceException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new MessageResponse(ex.getMessage()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<MessageResponse> handleUnauthorizedException(UnauthorizedException ex) {
        String msg = ex.getMessage();
        // Nếu là lỗi phân quyền theo vai trò (Role/Permission denied) -> HTTP 403 FORBIDDEN
        if (msg != null) {
            String lower = msg.toLowerCase();
            boolean isPermissionDenied = lower.contains("quyền") ||
                                         lower.contains("chỉ chủ sở hữu") ||
                                         lower.contains("chỉ owner") ||
                                         lower.contains("chỉ admin") ||
                                         lower.contains("chỉ lễ tân") ||
                                         lower.contains("chỉ quản trị viên") ||
                                         lower.contains("dành cho") ||
                                         lower.contains("không có quyền");
            boolean isSessionExpired = lower.contains("hết hạn") ||
                                       lower.contains("đăng nhập lại") ||
                                       lower.contains("vui lòng đăng nhập") ||
                                       lower.contains("bị khóa") ||
                                       lower.contains("không chính xác");

            if (isPermissionDenied && !isSessionExpired) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new MessageResponse(msg));
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse(msg));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<MessageResponse> handleResourceNotFoundException(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new MessageResponse(ex.getMessage()));
    }

    /**
     * Xử lý BusinessException – lỗi nghiệp vụ (QTN-11, QTN-12, v.v.).
     * HTTP status được lấy từ chính exception (mặc định 400 BAD_REQUEST).
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<MessageResponse> handleBusinessException(BusinessException ex) {
        log.warn("Business rule violation: {}", ex.getMessage());
        return ResponseEntity.status(ex.getHttpStatus()).body(new MessageResponse(ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<MessageResponse> handleIllegalArgumentException(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new MessageResponse(ex.getMessage()));
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<MessageResponse> handleMaxUploadSizeExceededException(org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        log.warn("Max upload size exceeded: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE)
                .body(new MessageResponse("Kích thước tệp tải lên vượt quá giới hạn cho phép (tối đa 50MB)."));
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<MessageResponse> handleDataIntegrityViolationException(org.springframework.dao.DataIntegrityViolationException ex) {
        log.warn("Database constraint violation: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new MessageResponse("Không thể xóa dữ liệu này do đang được liên kết với các thông tin khác trong hệ thống (như đặt phòng hoặc hóa đơn)."));
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    public ResponseEntity<MessageResponse> handleConstraintViolationException(jakarta.validation.ConstraintViolationException ex) {
        log.warn("Validation constraint violation: {}", ex.getMessage());
        String msg = ex.getConstraintViolations().stream()
                .map(jakarta.validation.ConstraintViolation::getMessage)
                .findFirst().orElse("Dữ liệu đầu vào không hợp lệ.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new MessageResponse(msg));
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<MessageResponse> handleHttpMessageNotReadableException(org.springframework.http.converter.HttpMessageNotReadableException ex) {
        log.warn("Malformed JSON request: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new MessageResponse("Dữ liệu gửi lên không đúng định dạng JSON hoặc giá trị không hợp lệ."));
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<MessageResponse> handleMethodArgumentTypeMismatchException(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        log.warn("Type mismatch for param {}: {}", ex.getName(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new MessageResponse("Tham số '" + ex.getName() + "' không đúng kiểu dữ liệu yêu cầu."));
    }

    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<MessageResponse> handleMissingServletRequestParameterException(org.springframework.web.bind.MissingServletRequestParameterException ex) {
        log.warn("Missing request parameter: {}", ex.getParameterName());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new MessageResponse("Thiếu tham số bắt buộc: " + ex.getParameterName()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<MessageResponse> handleGlobalException(Exception ex) {
        log.error("Unhandled Exception: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new MessageResponse("Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."));
    }
}

