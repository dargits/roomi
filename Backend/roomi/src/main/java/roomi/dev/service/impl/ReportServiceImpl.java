package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.dto.response.RevenueReportResponse;
import roomi.dev.repository.BookingSurchargeUsageRepository;
import roomi.dev.repository.InvoiceRepository;
import roomi.dev.service.ReportService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private final InvoiceRepository invoiceRepository;
    private final BookingSurchargeUsageRepository surchargeUsageRepository;

    @Override
    public RevenueReportResponse getRevenueReport(LocalDate startDate, LocalDate endDate) {
        // 1. Chuẩn hóa thời gian từ đầu ngày bắt đầu đến cuối ngày kết thúc
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);

        // 2. Lấy dữ liệu tổng quan (Tiền phòng, tiền dịch vụ, số lượng hóa đơn)
        List<Object[]> summaryList = invoiceRepository.findRevenueSummary(startDateTime, endDateTime);
        BigDecimal roomRevenue = BigDecimal.ZERO;
        BigDecimal serviceRevenue = BigDecimal.ZERO;
        Long totalInvoices = 0L;

        if (summaryList != null && !summaryList.isEmpty() && summaryList.get(0)[0] != null) {
            Object[] summary = summaryList.get(0);
            roomRevenue = summary[0] != null ? (BigDecimal) summary[0] : BigDecimal.ZERO;
            serviceRevenue = summary[1] != null ? (BigDecimal) summary[1] : BigDecimal.ZERO;
            totalInvoices = summary[2] != null ? (Long) summary[2] : 0L;
        }

        // 3. Lấy chi tiết doanh thu theo từng Loại phòng
        List<RevenueReportResponse.RoomTypeRevenueDetail> roomTypeDetails = 
                invoiceRepository.findRevenueByRoomType(startDateTime, endDateTime);

        // 4. Lấy chi tiết doanh thu theo từng Dịch vụ phụ thu
        List<RevenueReportResponse.ServiceRevenueDetail> serviceDetails = 
                surchargeUsageRepository.findRevenueByService(startDateTime, endDateTime);

        // 5. Tính tổng doanh thu
        BigDecimal totalRevenue = roomRevenue.add(serviceRevenue);

        // 6. Đóng gói và trả về Response DTO
        return RevenueReportResponse.builder()
                .totalRevenue(totalRevenue)
                .totalRoomRevenue(roomRevenue)
                .totalServiceRevenue(serviceRevenue)
                .totalInvoices(totalInvoices)
                .roomTypeRevenues(roomTypeDetails)
                .serviceRevenues(serviceDetails)
                .build();
    }
}