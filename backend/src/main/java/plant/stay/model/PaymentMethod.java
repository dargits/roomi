package plant.stay.model;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum PaymentMethod {
    CASH,         // Tiền mặt
    TRANSFER,     // Chuyển khoản
    CREDIT_CARD;  // Thẻ POS / Thẻ tín dụng

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
        if ("CREDIT_CARD".equals(val) || "CARD".equals(val) || "POS".equals(val) || "CREDIT".equals(val)) {
            return CREDIT_CARD;
        }
        try {
            return PaymentMethod.valueOf(val);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}

