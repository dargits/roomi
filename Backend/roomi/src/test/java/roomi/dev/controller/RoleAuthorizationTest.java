package roomi.dev.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import roomi.dev.dto.response.PropertySettingsResponse;
import roomi.dev.dto.response.InvoiceResponse;
import roomi.dev.dto.response.PaymentResponse;
import roomi.dev.dto.response.BookingResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.User;
import roomi.dev.model.Invoice;
import roomi.dev.service.*;
import roomi.dev.util.AuthUtil;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("RoleAuthorizationTest - Kiểm thử phân quyền hệ thống Roomi")
public class RoleAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthUtil authUtil;

    @MockitoBean
    private PropertySettingsService propertySettingsService;

    @MockitoBean
    private BookingSurchargeUsageService bookingSurchargeUsageService;

    @MockitoBean
    private PaymentService paymentService;

    @MockitoBean
    private CalendarService calendarService;

    @MockitoBean
    private RoomService roomService;

    @MockitoBean
    private BookingService bookingService;

    private User adminUser;
    private User accountantUser;

    @BeforeEach
    public void setUp() {
        adminUser = User.builder()
                .id(999L)
                .username("admin_test")
                .fullName("Test Admin")
                .role(User.Role.ADMIN)
                .active(true)
                .build();

        accountantUser = User.builder()
                .id(888L)
                .username("accountant_test")
                .fullName("Test Accountant")
                .role(User.Role.ACCOUNTANT)
                .active(true)
                .build();

        User receptionistA = User.builder()
                .id(701L)
                .username("receptionist_a")
                .fullName("Receptionist A")
                .role(User.Role.RECEPTIONIST)
                .active(true)
                .build();

        User receptionistB = User.builder()
                .id(702L)
                .username("receptionist_b")
                .fullName("Receptionist B")
                .role(User.Role.RECEPTIONIST)
                .active(true)
                .build();

        // Simulate requireRoles checking logic dynamically based on token value
        lenient().when(authUtil.requireRoles(anyString(), any(User.Role[].class))).thenAnswer(invocation -> {
            Object[] rawArgs = invocation.getRawArguments();
            String token = (String) rawArgs[0];
            User.Role[] allowedRoles = (User.Role[]) rawArgs[1];
            
            User user;
            if ("mock-admin-token".equals(token)) {
                user = adminUser;
            } else if ("mock-accountant-token".equals(token)) {
                user = accountantUser;
            } else if ("mock-receptionist-a-token".equals(token)) {
                user = receptionistA;
            } else if ("mock-receptionist-b-token".equals(token)) {
                user = receptionistB;
            } else {
                user = User.builder()
                        .id(777L)
                        .username("other_test")
                        .role(User.Role.RECEPTIONIST)
                        .active(true)
                        .build();
            }

            boolean hasRole = false;
            for (User.Role r : allowedRoles) {
                if (r == user.getRole()) {
                    hasRole = true;
                    break;
                }
            }
            if (!hasRole) {
                throw new BusinessException("Bạn không có quyền thực hiện hành động này", ErrorCode.INSUFFICIENT_PRIVILEGES);
            }
            return user;
        });

        // Simulate requireAuth
        lenient().when(authUtil.requireAuth(anyString())).thenAnswer(invocation -> {
            String token = invocation.getArgument(0);
            if ("mock-admin-token".equals(token)) {
                return adminUser;
            } else if ("mock-accountant-token".equals(token)) {
                return accountantUser;
            } else if ("mock-receptionist-a-token".equals(token)) {
                return receptionistA;
            } else if ("mock-receptionist-b-token".equals(token)) {
                return receptionistB;
            }
            return User.builder().role(User.Role.RECEPTIONIST).build();
        });

        // Simulate getUserFromToken
        lenient().when(authUtil.getUserFromToken(anyString())).thenAnswer(invocation -> {
            String token = invocation.getArgument(0);
            if ("mock-admin-token".equals(token)) {
                return adminUser;
            } else if ("mock-accountant-token".equals(token)) {
                return accountantUser;
            } else if ("mock-receptionist-a-token".equals(token)) {
                return receptionistA;
            } else if ("mock-receptionist-b-token".equals(token)) {
                return receptionistB;
            }
            return User.builder().role(User.Role.RECEPTIONIST).build();
        });

        // Mock PropertySettingsService behavior
        PropertySettingsResponse mockSettings = PropertySettingsResponse.builder()
                .propertyName("Default Hotel")
                .address("123 Street")
                .phone("1234567")
                .defaultCheckinTime(LocalTime.of(14, 0))
                .defaultCheckoutTime(LocalTime.of(12, 0))
                .freeCancelHours(24)
                .cancelFeePercent(BigDecimal.TEN)
                .build();
        lenient().when(propertySettingsService.getSettings()).thenReturn(mockSettings);
        lenient().when(propertySettingsService.updateSettings(any())).thenReturn(mockSettings);

        // Mock BookingService behavior
        BookingResponse mockBooking1 = BookingResponse.builder()
                .id(1L)
                .guestName("Khách A")
                .build();
        lenient().when(bookingService.getBookingById(eq(1L), any())).thenReturn(mockBooking1);
        
        lenient().when(bookingService.getBookingById(eq(2L), any())).thenAnswer(invocation -> {
            User user = invocation.getArgument(1);
            if (user.getRole() == User.Role.RECEPTIONIST) {
                throw new BusinessException("Không có quyền thao tác ngoài ca làm việc", ErrorCode.INSUFFICIENT_PRIVILEGES);
            }
            return BookingResponse.builder().id(2L).guestName("Khách B").build();
        });

        // Mock BookingSurchargeUsageService responses
        InvoiceResponse mockInvoice = InvoiceResponse.builder()
                .id(1L)
                .status(Invoice.Status.PENDING.name())
                .roomCharge(BigDecimal.valueOf(1000000))
                .serviceCharge(BigDecimal.ZERO)
                .discount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.valueOf(1000000))
                .serviceUsages(new ArrayList<>())
                .payments(new ArrayList<>())
                .build();

        lenient().when(bookingSurchargeUsageService.getInvoice(eq(1L), any())).thenReturn(mockInvoice);
        lenient().when(bookingSurchargeUsageService.getInvoice(eq(2L), any())).thenAnswer(invocation -> {
            User user = invocation.getArgument(1);
            if (user.getRole() == User.Role.RECEPTIONIST) {
                throw new BusinessException("Không có quyền xem hóa đơn ngoài ca làm việc", ErrorCode.INSUFFICIENT_PRIVILEGES);
            }
            return mockInvoice;
        });

        lenient().when(bookingSurchargeUsageService.createAdjustmentInvoice(any(), any(), any())).thenReturn(mockInvoice);
        lenient().when(bookingSurchargeUsageService.updateInvoice(eq(1L), any(), any())).thenReturn(mockInvoice);
        lenient().when(bookingSurchargeUsageService.updateInvoice(eq(2L), any(), any()))
                .thenThrow(new BusinessException("Hóa đơn đã thanh toán, không thể chỉnh sửa trực tiếp", ErrorCode.INVOICE_PAID));

        // Mock PaymentService responses
        lenient().when(paymentService.getPaymentsByBookingId(any(), any())).thenReturn(new ArrayList<>());
        lenient().when(paymentService.addPayment(any(), any(), any())).thenReturn(PaymentResponse.builder().id(1L).amount(BigDecimal.valueOf(500000)).build());

        // Mock CalendarService responses
        lenient().when(calendarService.getAllRoomsCalendar(any(), any())).thenReturn(new ArrayList<>());

        // Mock RoomService responses
        lenient().when(roomService.syncRoomStatuses()).thenReturn(5);
    }

    @Test
    @DisplayName("ADMIN không được truy cập API truy vấn danh sách đặt phòng")
    public void admin_cannotAccessBookingQueries() throws Exception {
        mockMvc.perform(get("/api/v1/bookings")
                        .header("Authorization", "mock-admin-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("ADMIN không được truy cập API xóa đặt phòng")
    public void admin_cannotAccessBookingDeletion() throws Exception {
        mockMvc.perform(delete("/api/v1/bookings/1")
                        .header("Authorization", "mock-admin-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("ADMIN không được truy cập API khách hàng")
    public void admin_cannotAccessGuestQueries() throws Exception {
        mockMvc.perform(get("/api/v1/guests")
                        .header("Authorization", "mock-admin-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("ADMIN không được truy cập API báo cáo doanh thu")
    public void admin_cannotAccessReports() throws Exception {
        mockMvc.perform(get("/api/v1/reports/revenue")
                        .param("startDate", "2026-08-01")
                        .param("endDate", "2026-08-31")
                        .header("Authorization", "mock-admin-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("ADMIN không được truy cập API báo cáo công suất phòng")
    public void admin_cannotAccessOccupancyReport() throws Exception {
        mockMvc.perform(get("/api/v1/reports/occupancy")
                        .param("startDate", "2026-08-01")
                        .param("endDate", "2026-08-31")
                        .header("Authorization", "mock-admin-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("ADMIN không được truy cập API tạo phòng")
    public void admin_cannotAccessRoomModification() throws Exception {
        mockMvc.perform(post("/api/v1/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roomNumber\":\"999\",\"roomTypeId\":1,\"floor\":\"1\"}")
                        .header("Authorization", "mock-admin-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("ADMIN không được truy cập API tạo loại phòng")
    public void admin_cannotAccessRoomTypeModification() throws Exception {
        mockMvc.perform(post("/api/v1/room-types")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Suite Deluxe\",\"basePrice\":1000000,\"capacity\":2}")
                        .header("Authorization", "mock-admin-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("ADMIN không được truy cập API giá theo mùa")
    public void admin_cannotAccessSeasonalRates() throws Exception {
        mockMvc.perform(get("/api/v1/seasonal-rates")
                        .header("Authorization", "mock-admin-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("ADMIN được phép truy cập API quản lý nhân viên")
    public void admin_canAccessUserManagement() throws Exception {
        mockMvc.perform(get("/api/v1/users/")
                        .header("Authorization", "mock-admin-token"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN được phép truy cập API nhật ký hoạt động")
    public void admin_canAccessActivityLogs() throws Exception {
        mockMvc.perform(get("/api/v1/activity-logs")
                        .header("Authorization", "mock-admin-token"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN được phép cập nhật cấu hình chung của khách sạn")
    public void admin_canAccessGeneralSettings() throws Exception {
        mockMvc.perform(put("/api/v1/settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"propertyName\":\"New Hotel Name\",\"address\":\"123 Main St\",\"phone\":\"123456\"}")
                        .header("Authorization", "mock-admin-token"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN không được phép cập nhật chính sách/giờ giấc hoạt động (cấu hình nghiệp vụ)")
    public void admin_cannotModifyBusinessSettings() throws Exception {
        mockMvc.perform(put("/api/v1/settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"propertyName\":\"New Hotel Name\",\"defaultCheckinTime\":\"13:00:00\"}")
                        .header("Authorization", "mock-admin-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    // ========================================================================= ACCOUNTANT (Kế toán - VT-04) TESTS

    @Test
    @DisplayName("KẾ TOÁN không được truy cập API tạo đặt phòng")
    public void accountant_cannotCreateBooking() throws Exception {
        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Nguyen A\",\"phone\":\"0901234567\",\"idNumber\":\"123456789\",\"roomTypeId\":1,\"checkInDate\":\"2026-08-01\",\"checkOutDate\":\"2026-08-03\"}")
                        .header("Authorization", "mock-accountant-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("KẾ TOÁN không được truy cập API sửa giá theo mùa")
    public void accountant_cannotModifySeasonalRate() throws Exception {
        mockMvc.perform(put("/api/v1/seasonal-rates/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roomTypeId\":1,\"startDate\":\"2026-08-01\",\"endDate\":\"2026-08-03\",\"price\":100000}")
                        .header("Authorization", "mock-accountant-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("KẾ TOÁN không được truy cập API sửa cấu hình loại phòng")
    public void accountant_cannotModifyRoomType() throws Exception {
        mockMvc.perform(put("/api/v1/room-types/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Deluxe Suite\",\"capacity\":2,\"basePrice\":1200000}")
                        .header("Authorization", "mock-accountant-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("KẾ TOÁN được truy cập API xem hóa đơn")
    public void accountant_canAccessInvoiceQuery() throws Exception {
        mockMvc.perform(get("/api/v1/bookings/1/invoice")
                        .header("Authorization", "mock-accountant-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1L));
    }

    @Test
    @DisplayName("KẾ TOÁN được truy cập API xem lịch sử thanh toán")
    public void accountant_canAccessPaymentsQuery() throws Exception {
        mockMvc.perform(get("/api/v1/bookings/1/payments")
                        .header("Authorization", "mock-accountant-token"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("KẾ TOÁN được truy cập API ghi nhận thanh toán")
    public void accountant_canRecordPayment() throws Exception {
        mockMvc.perform(post("/api/v1/bookings/1/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":500000,\"method\":\"CASH\"}")
                        .header("Authorization", "mock-accountant-token"))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("KẾ TOÁN được truy cập API lập hóa đơn điều chỉnh")
    public void accountant_canCreateAdjustmentInvoice() throws Exception {
        mockMvc.perform(post("/api/v1/bookings/1/invoice/adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roomChargeAdjustment\":100000,\"serviceChargeAdjustment\":0,\"discountAdjustment\":0,\"adjustmentReason\":\"Sửa sai sót\"}")
                        .header("Authorization", "mock-accountant-token"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").value(1L));
    }

    @Test
    @DisplayName("KẾ TOÁN được sửa chiết khấu trực tiếp cho hóa đơn chưa thanh toán")
    public void accountant_canUpdateUnpaidInvoice() throws Exception {
        mockMvc.perform(put("/api/v1/bookings/1/invoice")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"discount\":50000}")
                        .header("Authorization", "mock-accountant-token"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("KẾ TOÁN bị chặn sửa trực tiếp hóa đơn đã thanh toán")
    public void accountant_cannotUpdatePaidInvoice() throws Exception {
        mockMvc.perform(put("/api/v1/bookings/2/invoice")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"discount\":50000}")
                        .header("Authorization", "mock-accountant-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INV_001"));
    }

    @Test
    @DisplayName("KẾ TOÁN được phép truy cập xem sơ đồ phòng")
    public void accountant_canAccessCalendar() throws Exception {
        mockMvc.perform(get("/api/v1/calendar/rooms")
                        .param("checkIn", "2026-08-01")
                        .param("checkOut", "2026-08-15")
                        .header("Authorization", "mock-accountant-token"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("KẾ TOÁN được phép đồng bộ trạng thái phòng khi xem sơ đồ phòng")
    public void accountant_canSyncRoomStatus() throws Exception {
        mockMvc.perform(post("/api/v1/rooms/sync-status")
                        .header("Authorization", "mock-accountant-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("Đã cập nhật 5 phòng"));
    }

    // ========================================================================= RECEPTIONIST (Lễ tân - VT-02) TESTS

    @Test
    @DisplayName("LỄ TÂN được phép xem hóa đơn thuộc ca làm việc")
    public void receptionist_canAccessInvoiceInShift() throws Exception {
        mockMvc.perform(get("/api/v1/bookings/1/invoice")
                        .header("Authorization", "mock-receptionist-a-token"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("LỄ TÂN bị chặn xem hóa đơn ngoài ca làm việc")
    public void receptionist_cannotAccessInvoiceOutOfShift() throws Exception {
        mockMvc.perform(get("/api/v1/bookings/2/invoice")
                        .header("Authorization", "mock-receptionist-a-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("LỄ TÂN bị chặn tạo hóa đơn điều chỉnh")
    public void receptionist_cannotCreateAdjustmentInvoice() throws Exception {
        mockMvc.perform(post("/api/v1/bookings/1/invoice/adjust")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roomChargeAdjustment\":100000,\"serviceChargeAdjustment\":0,\"discountAdjustment\":0,\"adjustmentReason\":\"Lễ tân sửa\"}")
                        .header("Authorization", "mock-receptionist-a-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("LỄ TÂN bị chặn thay đổi giá theo mùa")
    public void receptionist_cannotModifySeasonalRate() throws Exception {
        mockMvc.perform(put("/api/v1/seasonal-rates/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roomTypeId\":1,\"startDate\":\"2026-08-01\",\"endDate\":\"2026-08-03\",\"price\":100000}")
                        .header("Authorization", "mock-receptionist-a-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }

    @Test
    @DisplayName("LỄ TÂN bị chặn xem báo cáo doanh thu tổng hợp")
    public void receptionist_cannotAccessRevenueReport() throws Exception {
        mockMvc.perform(get("/api/v1/reports/revenue")
                        .param("startDate", "2026-07-01")
                        .param("endDate", "2026-07-31")
                        .header("Authorization", "mock-receptionist-a-token"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PERM_002"));
    }
}
