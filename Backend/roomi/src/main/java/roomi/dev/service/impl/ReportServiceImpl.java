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
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

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

    @Override
    public byte[] exportRevenueReportExcel(LocalDate startDate, LocalDate endDate) {
        // 1. Lấy dữ liệu báo cáo từ hàm đã viết sẵn
        RevenueReportResponse report = this.getRevenueReport(startDate, endDate);

        // 2. Tạo một file Excel (Workbook) trong bộ nhớ
        try (Workbook workbook = new XSSFWorkbook(); 
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            // Tạo một trang tính (Sheet)
            Sheet sheet = workbook.createSheet("Báo cáo doanh thu");

            // 3. Ghi phần Tổng quan
            Row row0 = sheet.createRow(0);
            row0.createCell(0).setCellValue("Từ ngày: " + startDate.toString() + " Đến ngày: " + endDate.toString());

            Row row2 = sheet.createRow(2);
            row2.createCell(0).setCellValue("Tổng doanh thu:");
            row2.createCell(1).setCellValue(report.getTotalRevenue().doubleValue());

            Row row3 = sheet.createRow(3);
            row3.createCell(0).setCellValue("Tổng tiền phòng:");
            row3.createCell(1).setCellValue(report.getTotalRoomRevenue().doubleValue());

            Row row4 = sheet.createRow(4);
            row4.createCell(0).setCellValue("Tổng tiền dịch vụ:");
            row4.createCell(1).setCellValue(report.getTotalServiceRevenue().doubleValue());

            // 4. Ghi bảng Chi tiết doanh thu theo loại phòng
            Row row6 = sheet.createRow(6);
            row6.createCell(0).setCellValue("CHI TIẾT THEO LOẠI PHÒNG");

            Row headerRow = sheet.createRow(7);
            headerRow.createCell(0).setCellValue("Tên loại phòng");
            headerRow.createCell(1).setCellValue("Doanh thu");
            headerRow.createCell(2).setCellValue("Số lượng hóa đơn");

            int rowIdx = 8;
            for (RevenueReportResponse.RoomTypeRevenueDetail detail : report.getRoomTypeRevenues()) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(detail.getRoomTypeName());
                row.createCell(1).setCellValue(detail.getRevenue().doubleValue());
                row.createCell(2).setCellValue(detail.getInvoiceCount());
            }

            // (Bạn có thể làm tương tự cho bảng Dịch vụ phụ thu ở bên dưới)

            // Tự động căn chỉnh độ rộng cột
            sheet.autoSizeColumn(0);
            sheet.autoSizeColumn(1);
            sheet.autoSizeColumn(2);

            // 5. Xuất ra mảng byte
            workbook.write(out);
            return out.toByteArray();

        } catch (IOException e) {
            throw new RuntimeException("Lỗi khi tạo file Excel", e);
        }
    }
}