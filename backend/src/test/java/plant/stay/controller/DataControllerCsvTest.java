package plant.stay.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class DataControllerCsvTest {

    @Test
    @DisplayName("parseCsvLine: Xử lý chuỗi thông thường phân tách bằng dấu phẩy")
    void testParseSimpleCsvLine() {
        String line = "101,Phòng Đơn,1,AVAILABLE";
        List<String> cols = DataController.parseCsvLine(line);
        assertEquals(4, cols.size());
        assertEquals("101", cols.get(0));
        assertEquals("Phòng Đơn", cols.get(1));
        assertEquals("1", cols.get(2));
        assertEquals("AVAILABLE", cols.get(3));
    }

    @Test
    @DisplayName("parseCsvLine: Xử lý trường có dấu phẩy bên trong dấu ngoặc kép")
    void testParseQuotedCsvWithCommas() {
        String line = "Phòng VIP,1500000,4,\"Giường đôi, TV, Điều hòa, Bồn tắm\"";
        List<String> cols = DataController.parseCsvLine(line);
        assertEquals(4, cols.size());
        assertEquals("Phòng VIP", cols.get(0));
        assertEquals("1500000", cols.get(1));
        assertEquals("4", cols.get(2));
        assertEquals("Giường đôi, TV, Điều hòa, Bồn tắm", cols.get(3));
    }

    @Test
    @DisplayName("parseCsvLine: Xử lý dấu ngoặc kép được escape (\"\") và BOM UTF-8")
    void testParseEscapedQuotesAndBom() {
        String line = "\uFEFF\"Nguyễn \"\"Đại\"\" Dương\",0912345678,001234567890,\"duong.nguyen@test.com\"";
        List<String> cols = DataController.parseCsvLine(line);
        assertEquals(4, cols.size());
        assertEquals("Nguyễn \"Đại\" Dương", cols.get(0));
        assertEquals("0912345678", cols.get(1));
        assertEquals("001234567890", cols.get(2));
        assertEquals("duong.nguyen@test.com", cols.get(3));
    }

    @Test
    @DisplayName("parseCsvLine: Xử lý trường rỗng ở giữa và cuối dòng")
    void testParseEmptyFields() {
        String line = "101,,";
        List<String> cols = DataController.parseCsvLine(line);
        assertEquals(3, cols.size());
        assertEquals("101", cols.get(0));
        assertEquals("", cols.get(1));
        assertEquals("", cols.get(2));
    }

    @Test
    @DisplayName("parseCsvLine: Xử lý dòng nhân sự (staff) với vai trò và số điện thoại")
    void testParseStaffCsvLine() {
        String line = "\"Trần Văn Hoàng\",staff_hoang,0912888999,hoang.tran@stayaway.vn,RECEPTIONIST";
        List<String> cols = DataController.parseCsvLine(line);
        assertEquals(5, cols.size());
        assertEquals("Trần Văn Hoàng", cols.get(0));
        assertEquals("staff_hoang", cols.get(1));
        assertEquals("0912888999", cols.get(2));
        assertEquals("hoang.tran@stayaway.vn", cols.get(3));
        assertEquals("RECEPTIONIST", cols.get(4));
    }

    @Test
    @DisplayName("parseCsvLine: Xử lý dấu chấm phẩy phân tách chuẩn Excel Việt Nam (;)")
    void testParseSemicolonDelimiter() {
        String line = "101;Phòng Tiêu Chuẩn;1;AVAILABLE";
        List<String> cols = DataController.parseCsvLine(line, ';');
        assertEquals(4, cols.size());
        assertEquals("101", cols.get(0));
        assertEquals("Phòng Tiêu Chuẩn", cols.get(1));
        assertEquals("1", cols.get(2));
        assertEquals("AVAILABLE", cols.get(3));
    }

    @Test
    @DisplayName("parseCsvLine: Xử lý dấu tab phân tách (\\t)")
    void testParseTabDelimiter() {
        String line = "Dịch vụ giặt\t50000\tKg";
        List<String> cols = DataController.parseCsvLine(line, '\t');
        assertEquals(3, cols.size());
        assertEquals("Dịch vụ giặt", cols.get(0));
        assertEquals("50000", cols.get(1));
        assertEquals("Kg", cols.get(2));
    }
}
