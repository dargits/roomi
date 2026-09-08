package plant.stay.util;

import plant.stay.model.Role;

public final class PersonalDataMasker {

    private static final String MASK = "****";

    private PersonalDataMasker() {
    }

    public static boolean canViewFullIdentifier(Role role) {
        return canViewFull(role);
    }

    public static boolean canViewFull(Role role) {
        return role == Role.OWNER || role == Role.RECEPTIONIST;
    }

    public static String displayIdentifier(String value, Role role) {
        return canViewFull(role) ? value : maskIdentifier(value);
    }

    public static String maskIdentifier(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        if (value.length() <= 4) {
            return MASK;
        }
        return MASK + value.substring(value.length() - 4);
    }

    public static String displayName(String value, Role role) {
        return value;
    }

    public static String maskName(String value) {
        return value;
    }

    public static String displayPhone(String value, Role role) {
        return canViewFull(role) ? value : maskPhone(value);
    }

    public static String maskPhone(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        String trimmed = value.trim();
        if (trimmed.contains("*")) {
            return trimmed;
        }
        if (trimmed.length() <= 6) {
            return MASK;
        }
        int startLen = 3;
        int endLen = 3;
        int middleLen = trimmed.length() - startLen - endLen;
        return trimmed.substring(0, startLen) + "*".repeat(middleLen) + trimmed.substring(trimmed.length() - endLen);
    }

    public static String displayEmail(String value, Role role) {
        return canViewFull(role) ? value : maskEmail(value);
    }

    public static String maskEmail(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        String trimmed = value.trim();
        int atIndex = trimmed.indexOf('@');
        if (atIndex < 0) {
            return trimmed.charAt(0) + "***";
        }
        if (atIndex == 0) {
            return trimmed;
        }
        String username = trimmed.substring(0, atIndex);
        String domain = trimmed.substring(atIndex);
        if (username.contains("*")) {
            return trimmed;
        }
        return username.charAt(0) + "***" + domain;
    }
}