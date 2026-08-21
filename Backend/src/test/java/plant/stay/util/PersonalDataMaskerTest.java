package plant.stay.util;

import org.junit.jupiter.api.Test;
import plant.stay.model.Role;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PersonalDataMaskerTest {

    @Test
    void masksOnlyNonPrivilegedIdentifiersWithoutLeakingShortValues() {
        assertEquals(null, PersonalDataMasker.maskIdentifier(null));
        assertEquals("", PersonalDataMasker.maskIdentifier(""));
        assertEquals("****", PersonalDataMasker.maskIdentifier("123"));
        assertEquals("****", PersonalDataMasker.maskIdentifier("1234"));
        assertEquals("****5678", PersonalDataMasker.maskIdentifier("12345678"));
        assertEquals("12345678", PersonalDataMasker.displayIdentifier("12345678", Role.OWNER));
        assertEquals("12345678", PersonalDataMasker.displayIdentifier("12345678", Role.RECEPTIONIST));
        assertEquals("****5678", PersonalDataMasker.displayIdentifier("12345678", Role.ADMIN));
        assertEquals("****5678", PersonalDataMasker.displayIdentifier("12345678", null));
    }
}