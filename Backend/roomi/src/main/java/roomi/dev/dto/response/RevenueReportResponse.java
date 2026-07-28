package roomi.dev.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueReportResponse {
private BigDecimal totalRevenue;        
    private BigDecimal totalRoomRevenue;   
    private BigDecimal totalServiceRevenue; 
    private Long totalInvoices;             

    private List<RoomTypeRevenueDetail> roomTypeRevenues; 
    private List<ServiceRevenueDetail> serviceRevenues;   

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RoomTypeRevenueDetail {
        private String roomTypeName;
        private BigDecimal revenue;
        private Long invoiceCount;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ServiceRevenueDetail {
        private String serviceName;
        private BigDecimal revenue;
        private Long usageCount;
    }
}
