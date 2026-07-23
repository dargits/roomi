package roomi.dev.exception;

public class ErrorCode {
    // Auth errors
    public static final String USERNAME_ALREADY_EXISTS = "AUTH_001";
    public static final String PHONE_ALREADY_EXISTS = "AUTH_002";
    public static final String INVALID_CREDENTIALS = "AUTH_003";
    public static final String SESSION_EXPIRED = "AUTH_004";
    public static final String SESSION_INVALID = "AUTH_005";
    
    // Validation errors
    public static final String INVALID_INPUT = "VAL_001";
    public static final String MISSING_REQUIRED_FIELD = "VAL_002";
    
    // Business logic errors
    public static final String ROOM_NOT_AVAILABLE = "ROOM_001";
    public static final String BOOKING_NOT_FOUND = "BOOK_001";
    public static final String INVALID_DATE_RANGE = "BOOK_002";
    
    // System errors
    public static final String INTERNAL_ERROR = "SYS_001";
    public static final String DATABASE_ERROR = "SYS_002";
    
    // Permission errors
    public static final String ACCESS_DENIED = "PERM_001";
    public static final String INSUFFICIENT_PRIVILEGES = "PERM_002";

    // User management errors
    public static final String USER_NOT_FOUND = "USER_001";
    public static final String CANNOT_LOCK_ADMIN = "USER_002";
    public static final String USER_ALREADY_LOCKED = "USER_003";
    public static final String USER_ALREADY_ACTIVE = "USER_004";

    // Guest errors
    public static final String GUEST_NOT_FOUND = "GUEST_001";

    // Booking errors
    public static final String BOOKING_CONFLICT       = "BOOK_003";  // phòng đã bị đặt trong khoảng thời gian đó
    public static final String BOOKING_ALREADY_ASSIGNED = "BOOK_004"; // booking đã được gán phòng rồi
    public static final String BOOKING_INVALID_STATUS = "BOOK_005";  // trạng thái không cho phép thao tác
    public static final String ROOM_TYPE_MISMATCH     = "BOOK_006";  // roomType của phòng không khớp booking
    public static final String ROOM_SAME_AS_CURRENT   = "BOOK_007";  // phòng mới trùng phòng hiện tại
    public static final String BOOKING_NO_ROOM        = "BOOK_008";  // booking chưa có phòng, không thể đổi

    // Surcharge service and invoice errors
    public static final String SURCHARGE_SERVICE_NOT_FOUND = "SUR_001";
    public static final String SURCHARGE_SERVICE_INACTIVE = "SUR_002";
    public static final String SURCHARGE_SERVICE_IN_USE = "SUR_003";
    public static final String SURCHARGE_USAGE_NOT_FOUND = "SUR_004";
    public static final String INVOICE_PAID = "INV_001";
}