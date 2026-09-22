package plant.stay.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BestSellingServicesReportResponse {

    private String from;
    private String to;
    private Long selectedRoomTypeId;
    private String selectedRoomTypeName;

    private SurchargeReportSummary summary;

    @Builder.Default
    private List<CatalogServiceItem> catalogServices = new ArrayList<>();

    @Builder.Default
    private List<AutoSurchargeItem> autoSurcharges = new ArrayList<>();

    @Builder.Default
    private List<RoomTypeComparisonItem> roomTypeComparisons = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SurchargeReportSummary {
        private BigDecimal totalSurchargeRevenue;      // Tổng doanh thu phụ thu (chủ động + tự động)
        private BigDecimal catalogServicesRevenue;     // Doanh thu dịch vụ danh mục chủ động
        private BigDecimal autoSurchargeRevenue;        // Doanh thu phụ thu tự động
        private long totalSalesCount;                  // Tổng số lượt bán/ghi nhận
        private long totalQuantity;                    // Tổng số lượng
        private int totalCatalogServices;              // Tổng số dịch vụ trong danh mục
        private int activeCatalogServices;             // Số dịch vụ đang hoạt động
        private int zeroSalesCatalogServices;          // Số dịch vụ không ai dùng (0 lượt)
        private String topServiceName;                 // Tên dịch vụ bán chạy nhất
        private BigDecimal topServiceRevenue;          // Doanh thu dịch vụ bán chạy nhất
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CatalogServiceItem {
        private Long serviceId;
        private String serviceName;
        private BigDecimal unitPrice;
        private String unit;
        private Boolean active;
        private long salesCount;                       // Số lượt bán
        private long totalQuantity;                    // Tổng số lượng bán
        private BigDecimal revenue;                    // Doanh thu mang lại
        private BigDecimal revenueShare;               // Tỷ trọng (%) trong tổng doanh thu phụ thu
        @Builder.Default
        private List<RoomTypeBreakdownItem> roomTypeBreakdown = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AutoSurchargeItem {
        private String code;                           // EXTRA_PERSON, TIME_DIFF, OTHER
        private String name;                           // Tên phụ thu tự động
        private long salesCount;                       // Số lượt phát sinh
        private long totalQuantity;                    // Tổng số lượng
        private BigDecimal revenue;                    // Doanh thu
        private BigDecimal revenueShare;               // Tỷ trọng (%) trong tổng doanh thu phụ thu
        @Builder.Default
        private List<RoomTypeBreakdownItem> roomTypeBreakdown = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomTypeBreakdownItem {
        private Long roomTypeId;
        private String roomTypeName;
        private long salesCount;
        private long totalQuantity;
        private BigDecimal revenue;
        private BigDecimal shareInService;             // Tỷ trọng % trong doanh thu dịch vụ này
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomTypeComparisonItem {
        private Long roomTypeId;
        private String roomTypeName;
        private BigDecimal totalRevenue;
        private long totalQuantity;
        private long salesCount;
        private BigDecimal revenueShare;               // Tỷ trọng trong tổng phụ thu
        @Builder.Default
        private List<SimpleServiceStat> topServices = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimpleServiceStat {
        private String name;
        private BigDecimal revenue;
        private long quantity;
    }
}
