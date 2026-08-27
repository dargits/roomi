package plant.stay.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception cho các lỗi nghiệp vụ (Business Logic).
 * Ví dụ: vi phạm QTN-11 (giảm giá trên hóa đơn PAID),
 *         vi phạm QTN-12 (giảm giá vượt tổng tiền hóa đơn),
 *         v.v.
 *
 * Sử dụng HTTP status code phù hợp với từng loại lỗi nghiệp vụ.
 * Mặc định là 400 BAD_REQUEST.
 */
public class BusinessException extends RuntimeException {

    private final HttpStatus httpStatus;

    /** Mặc định trả về 400 BAD_REQUEST */
    public BusinessException(String message) {
        super(message);
        this.httpStatus = HttpStatus.BAD_REQUEST;
    }

    /** Cho phép chỉ định HTTP status code cụ thể */
    public BusinessException(String message, HttpStatus httpStatus) {
        super(message);
        this.httpStatus = httpStatus;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }
}
