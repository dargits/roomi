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

    @Test
    void doesNotMaskName() {
        assertEquals(null, PersonalDataMasker.maskName(null));
        assertEquals("", PersonalDataMasker.maskName(""));
        assertEquals("Nguyễn Văn Nam", PersonalDataMasker.maskName("Nguyễn Văn Nam"));
        assertEquals("Nguyễn Văn Nam", PersonalDataMasker.displayName("Nguyễn Văn Nam", Role.OWNER));
        assertEquals("Nguyễn Văn Nam", PersonalDataMasker.displayName("Nguyễn Văn Nam", Role.ADMIN));
    }

    @Test
    void masksPhonePreservingOnly3FirstAnd3LastDigits() {
        assertEquals(null, PersonalDataMasker.maskPhone(null));
        assertEquals("", PersonalDataMasker.maskPhone(""));
        assertEquals("****", PersonalDataMasker.maskPhone("123"));
        assertEquals("****", PersonalDataMasker.maskPhone("1234"));
        assertEquals("****", PersonalDataMasker.maskPhone("123456"));
        assertEquals("091****678", PersonalDataMasker.maskPhone("0912345678"));
        assertEquals("083****953", PersonalDataMasker.maskPhone("0834554953"));
        assertEquals("026*****999", PersonalDataMasker.maskPhone("02633888999"));
        assertEquals("024***456", PersonalDataMasker.maskPhone("024123456"));
        assertEquals("091****678", PersonalDataMasker.maskPhone("091****678"));

        assertEquals("0912345678", PersonalDataMasker.displayPhone("0912345678", Role.OWNER));
        assertEquals("0912345678", PersonalDataMasker.displayPhone("0912345678", Role.RECEPTIONIST));
        assertEquals("091****678", PersonalDataMasker.displayPhone("0912345678", Role.ADMIN));
        assertEquals("091****678", PersonalDataMasker.displayPhone("0912345678", Role.ACCOUNTANT));
        assertEquals("091****678", PersonalDataMasker.displayPhone("0912345678", null));
    }

    @Test
    void masksEmailPreservingFirstCharAndDomain() {
        assertEquals(null, PersonalDataMasker.maskEmail(null));
        assertEquals("", PersonalDataMasker.maskEmail(""));
        assertEquals("n***@gmail.com", PersonalDataMasker.maskEmail("nguyenvana@gmail.com"));
        assertEquals("a***@roomi.vn", PersonalDataMasker.maskEmail("admin@roomi.vn"));
        assertEquals("x***@yahoo.com", PersonalDataMasker.maskEmail("x@yahoo.com"));
        assertEquals("n***@gmail.com", PersonalDataMasker.maskEmail("n***@gmail.com"));

        assertEquals("nguyenvana@gmail.com", PersonalDataMasker.displayEmail("nguyenvana@gmail.com", Role.OWNER));
        assertEquals("nguyenvana@gmail.com", PersonalDataMasker.displayEmail("nguyenvana@gmail.com", Role.RECEPTIONIST));
        assertEquals("n***@gmail.com", PersonalDataMasker.displayEmail("nguyenvana@gmail.com", Role.ADMIN));
        assertEquals("n***@gmail.com", PersonalDataMasker.displayEmail("nguyenvana@gmail.com", Role.ACCOUNTANT));
        assertEquals("n***@gmail.com", PersonalDataMasker.displayEmail("nguyenvana@gmail.com", null));
    }
}