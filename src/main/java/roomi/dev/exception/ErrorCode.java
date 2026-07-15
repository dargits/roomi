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
}