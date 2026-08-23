package plant.stay.util;

import plant.stay.model.Role;

public final class PersonalDataMasker {

    private static final String MASK = "****";

    private PersonalDataMasker() {
    }

    public static boolean canViewFullIdentifier(Role role) {
        return role == Role.OWNER || role == Role.RECEPTIONIST;
    }

    public static String displayIdentifier(String value, Role role) {
        return canViewFullIdentifier(role) ? value : maskIdentifier(value);
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
}