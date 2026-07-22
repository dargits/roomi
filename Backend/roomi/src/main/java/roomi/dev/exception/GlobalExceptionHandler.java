package roomi.dev.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import roomi.dev.dto.response.ErrorResponse;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
        log.warn("Business exception: {} - {}", ex.getErrorCode(), ex.getMessage());
        
        ErrorResponse response = ErrorResponse.builder()
                .mess(ex.getMessage())
                .code(ex.getErrorCode())
                .build();
        
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public ResponseEntity<ErrorResponse> handleValidationException(Exception ex) {
        String errorMessage;
        
        if (ex instanceof MethodArgumentNotValidException) {
            MethodArgumentNotValidException validEx = (MethodArgumentNotValidException) ex;
            errorMessage = validEx.getBindingResult().getFieldErrors()
                    .stream()
                    .map(FieldError::getDefaultMessage)
                    .collect(Collectors.joining(", "));
        } else {
            BindException bindEx = (BindException) ex;
            errorMessage = bindEx.getBindingResult().getFieldErrors()
                    .stream()
                    .map(FieldError::getDefaultMessage)
                    .collect(Collectors.joining(", "));
        }
        
        log.warn("Validation error: {}", errorMessage);
        
        ErrorResponse response = ErrorResponse.builder()
                .mess(errorMessage)
                .code(ErrorCode.INVALID_INPUT)
                .build();
        
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Illegal argument: {}", ex.getMessage());
        
        ErrorResponse response = ErrorResponse.builder()
                .mess(ex.getMessage())
                .code(ErrorCode.INVALID_INPUT)
                .build();
        
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex) {
        log.error("Unexpected runtime exception", ex);
        
        ErrorResponse response = ErrorResponse.builder()
                .mess("Đã xảy ra lỗi hệ thống")
                .code(ErrorCode.INTERNAL_ERROR)
                .build();
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("Unexpected exception", ex);
        
        ErrorResponse response = ErrorResponse.builder()
                .mess("Đã xảy ra lỗi hệ thống")
                .code(ErrorCode.INTERNAL_ERROR)
                .build();
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}