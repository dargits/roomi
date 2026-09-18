package plant.stay.model;

import java.util.Set;

/**
 * Các loại thông báo trong hệ thống.
 * mandatory = true  -> Khong the bi nguoi dung tat.
 * defaultRoles      -> Cac vai tro mac dinh nhan loai thong bao nay.
 */
public enum NotificationType {

    CHECKIN_TODAY(false, Set.of(Role.OWNER, Role.RECEPTIONIST, Role.ADMIN)),
    CHECKOUT_TODAY(false, Set.of(Role.OWNER, Role.RECEPTIONIST, Role.ADMIN)),
    ROOM_DIRTY(false, Set.of(Role.HOUSEKEEPER, Role.RECEPTIONIST)),
    ROOM_INCIDENT_LIGHT(false, Set.of(Role.OWNER, Role.RECEPTIONIST)),
    ROOM_INCIDENT_HEAVY(true, Set.of(Role.OWNER, Role.RECEPTIONIST, Role.HOUSEKEEPER)),
    STAY_MILESTONE(false, Set.of(Role.OWNER, Role.RECEPTIONIST)),
    INVOICE_DISCOUNT_APPROVAL(true, Set.of(Role.OWNER)),
    /** Nhắc kế toán đến hạn liên hệ đòi nợ theo lịch hẹn ghi nhận trước đó */
    DEBT_REMINDER(false, Set.of(Role.ACCOUNTANT, Role.OWNER, Role.ADMIN)),
    /** Cảnh báo kênh phân phối OTA bị mất kết nối hoặc ngừng cập nhật */
    CHANNEL_DISCONNECT_WARNING(true, Set.of(Role.OWNER, Role.ADMIN)),
    /** Cảnh báo trùng phòng phát hiện khi đồng bộ lịch kênh OTA với đặt phòng hiện có */
    CHANNEL_OVERBOOKING_CONFLICT(true, Set.of(Role.RECEPTIONIST, Role.OWNER, Role.ADMIN));


    private final boolean mandatory;
    private final Set<Role> defaultRoles;

    NotificationType(boolean mandatory, Set<Role> defaultRoles) {
        this.mandatory = mandatory;
        this.defaultRoles = defaultRoles;
    }

    public boolean isMandatory() { return mandatory; }
    public Set<Role> getDefaultRoles() { return defaultRoles; }
}
