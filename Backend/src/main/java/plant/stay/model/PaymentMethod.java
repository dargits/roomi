package plant.stay.model;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum PaymentMethod {
    CASH,      // Tiền mặt
    TRANSFER;  // Chuyển khoản

    @JsonCreator
    public static PaymentMethod fromString(String value) {
        if (value == null) return null;
        String val = value.trim().toUpperCase();
        if ("BANK_TRANSFER".equals(val) || "TRANSFER".equals(val)) {
            return TRANSFER;
        }
        if ("CASH".equals(val)) {
            return CASH;
        }
        try {
            return PaymentMethod.valueOf(val);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}

