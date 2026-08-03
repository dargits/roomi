package roomi.dev.service.impl;
import java.util.Set;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import roomi.dev.dto.response.RevenueReportResponse;
import roomi.dev.model.Booking;
import roomi.dev.repository.BookingSurchargeUsageRepository;
import roomi.dev.repository.InvoiceRepository;
import roomi.dev.service.ReportService;
import roomi.dev.dto.response.OccupancyReportResponse;
import roomi.dev.repository.RoomRepository;
import roomi.dev.repository.BookingRepository;
import java.util.ArrayList;
import java.util.Arrays;
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
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;

    @Override
    public RevenueReportResponse getRevenueReport(LocalDate startDate, LocalDate endDate) {
        
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);

        
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

        
        List<RevenueReportResponse.RoomTypeRevenueDetail> roomTypeDetails = 
                invoiceRepository.findRevenueByRoomType(startDateTime, endDateTime);

       
        List<RevenueReportResponse.ServiceRevenueDetail> serviceDetails = 
                surchargeUsageRepository.findRevenueByService(startDateTime, endDateTime);

        BigDecimal totalRevenue = roomRevenue.add(serviceRevenue);

        // Build daily revenue: lấy từ DB rồi fill đủ từng ngày (ngày không có invoice → 0)
        List<Object[]> rawDaily = invoiceRepository.findDailyRevenue(startDateTime, endDateTime);
        Map<String, BigDecimal> dailyMap = new java.util.HashMap<>();
        for (Object[] row : rawDaily) {
            if (row[0] != null && row[1] != null) {
                String dateKey = row[0].toString(); // "2026-07-01" hoặc java.sql.Date
                if (dateKey.length() > 10) dateKey = dateKey.substring(0, 10); // trim time nếu có
                dailyMap.put(dateKey, (BigDecimal) row[1]);
            }
        }

        List<RevenueReportResponse.DailyRevenue> dailyRevenues = new ArrayList<>();
        LocalDate current = startDate;
        while (!current.isAfter(endDate)) {
            String key = current.toString(); // "2026-07-01"
            dailyRevenues.add(RevenueReportResponse.DailyRevenue.builder()
                    .date(key)
                    .revenue(dailyMap.getOrDefault(key, BigDecimal.ZERO))
                    .build());
            current = current.plusDays(1);
        }

        return RevenueReportResponse.builder()
                .totalRevenue(totalRevenue)
                .totalRoomRevenue(roomRevenue)
                .totalServiceRevenue(serviceRevenue)
                .totalInvoices(totalInvoices)
                .roomTypeRevenues(roomTypeDetails)
                .serviceRevenues(serviceDetails)
                .dailyRevenues(dailyRevenues)
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

//   @Override
//     public OccupancyReportResponse getOccupancyReport(LocalDate startDate, LocalDate endDate) {
//         List<OccupancyReportResponse.DailyOccupancy> dailyList = new ArrayList<>();
        
//         // Lấy tổng số phòng
//         long totalRooms = roomRepository.count(); 
//         if (totalRooms == 0) totalRooms = 1; // Tránh lỗi chia cho 0

//         double totalOccupancyRate = 0;
//         long totalDays = 0;

//         // CHỈ LẤY TRẠNG THÁI OCCUPIED THEO YÊU CẦU CỦA BẠN
//         List<Booking.Status> validStatuses = Arrays.asList(Booking.Status.OCCUPIED);
        
//         LocalDate currentDate = startDate;

//         // Lặp qua từng ngày từ startDate đến endDate
//         while (!currentDate.isAfter(endDate)) {
//             LocalDateTime startOfDay = currentDate.atStartOfDay();
//             LocalDateTime endOfDay = currentDate.atTime(23, 59, 59);

//             // 1. Đếm số phòng OCCUPIED trong ngày
//             Long occupiedCount = bookingRepository.countOccupiedRoomsByDate(startOfDay.toLocalDate(), endOfDay.toLocalDate(), validStatuses);
//             if (occupiedCount == null) occupiedCount = 0L;

//             // 2. Tính tỷ lệ %
//             double occupancyRate = ((double) occupiedCount / totalRooms) * 100.0;
//             totalOccupancyRate += occupancyRate;
//             totalDays++;

//             // 3. Sử dụng builder tạo DailyOccupancy
//             OccupancyReportResponse.DailyOccupancy daily = OccupancyReportResponse.DailyOccupancy.builder()
//                     .date(currentDate.toString())
//                     .occupancyRate(Math.round(occupancyRate * 100.0) / 100.0) // Làm tròn 2 chữ số
//                     .build();
            
//             dailyList.add(daily);

//             // Chuyển sang ngày tiếp theo
//             currentDate = currentDate.plusDays(1);
//         }

//         // 4. Tính trung bình
//         double averageOccupancy = (totalDays > 0) ? (totalOccupancyRate / totalDays) : 0;

//         // 5. Trả về Response
//         return OccupancyReportResponse.builder()
//                 .averageOccupancy(Math.round(averageOccupancy * 100.0) / 100.0)
//                 .dailyOccupancies(dailyList)
//                 .build();
// }

@Override
public OccupancyReportResponse getOccupancyReport(LocalDate startDate, LocalDate endDate) {
    // 1. Lấy tất cả phòng trong hệ thống
    List<roomi.dev.model.Room> allRooms = roomRepository.findAll();
    if (allRooms.isEmpty()) {
        return OccupancyReportResponse.builder()
                .averageOccupancy(0.0)
                .dailyOccupancies(new ArrayList<>())
                .build();
    }

    // Nhóm danh sách phòng theo Loại phòng (RoomType)
    Map<Long, List<roomi.dev.model.Room>> roomsByRoomType = allRooms.stream()
            .collect(Collectors.groupingBy(room -> room.getRoomType().getId()));

    // 2. Lấy tất cả Booking trùng khoảng thời gian báo cáo trong 1 câu truy vấn SQL
    List<Booking.Status> validStatuses = List.of(Booking.Status.CONFIRMED, Booking.Status.CHECKED_IN, Booking.Status.CHECKED_OUT);
    List<Booking> activeBookings = bookingRepository.findOverlappingBookings(startDate, endDate, validStatuses);

    List<OccupancyReportResponse.DailyOccupancy> dailyList = new ArrayList<>();
    double totalOccupancySum = 0;
    long totalDays = 0;

    LocalDate currentDate = startDate;

    // 3. Vòng lặp từng ngày từ startDate đến endDate
    while (!currentDate.isAfter(endDate)) {
        final LocalDate date = currentDate;

        // Lọc danh sách booking có khách ở trong ngày date
        List<Booking> bookingsOnDate = activeBookings.stream()
                .filter(b -> b.getRoom() != null)
                .filter(b -> !b.getCheckInDate().isAfter(date) && (b.getCheckOutDate().isAfter(date) || (b.getCheckInDate().equals(b.getCheckOutDate()) && b.getCheckInDate().equals(date))))
                .collect(Collectors.toList());

        // Lấy tập hợp ID các phòng đã được thuê trong ngày date
        Set<Long> occupiedRoomIds = bookingsOnDate.stream()
                .map(b -> b.getRoom().getId())
                .collect(Collectors.toSet());

        // A. Trạng thái chi tiết từng phòng cụ thể
        List<OccupancyReportResponse.RoomOccupancyDetail> roomDetails = allRooms.stream()
                .map(room -> OccupancyReportResponse.RoomOccupancyDetail.builder()
                        .roomId(room.getId())
                        .roomNumber(room.getRoomNumber())
                        .roomTypeName(room.getRoomType() != null ? room.getRoomType().getName() : "N/A")
                        .isOccupied(occupiedRoomIds.contains(room.getId()))
                        .build())
                .collect(Collectors.toList());

        // B. Báo cáo công suất cho từng Loại phòng
        List<OccupancyReportResponse.RoomTypeOccupancy> roomTypeOccupancies = new ArrayList<>();
        for (Map.Entry<Long, List<roomi.dev.model.Room>> entry : roomsByRoomType.entrySet()) {
            List<roomi.dev.model.Room> roomsInType = entry.getValue();
            String typeName = roomsInType.get(0).getRoomType().getName();
            long totalInType = roomsInType.size();

            long occupiedInType = roomsInType.stream()
                    .filter(r -> occupiedRoomIds.contains(r.getId()))
            .count();

            double typeRate = totalInType > 0 ? ((double) occupiedInType / totalInType) * 100.0 : 0.0;

            roomTypeOccupancies.add(OccupancyReportResponse.RoomTypeOccupancy.builder()
                    .roomTypeId(entry.getKey())
                    .roomTypeName(typeName)
                    .totalRooms(totalInType)
                    .occupiedRooms(occupiedInType)
                    .occupancyRate(Math.round(typeRate * 100.0) / 100.0)
                    .build());
        }

        // C. Tính công suất tổng thể ngày hôm đó
        long totalRooms = allRooms.size();
        long totalOccupied = occupiedRoomIds.size();
        double dailyRate = totalRooms > 0 ? ((double) totalOccupied / totalRooms) * 100.0 : 0.0;

        totalOccupancySum += dailyRate;
        totalDays++;

        // D. Đưa vào danh sách báo cáo ngày
        dailyList.add(OccupancyReportResponse.DailyOccupancy.builder()
                .date(currentDate.toString())
                .totalRooms(totalRooms)
                .occupiedRooms(totalOccupied)
                .occupancyRate(Math.round(dailyRate * 100.0) / 100.0)
                .roomTypeOccupancies(roomTypeOccupancies)
                .roomDetails(roomDetails)
                .build());

        currentDate = currentDate.plusDays(1);
    }

    // 4. Tính trung bình công suất của cả đợt
    double averageOccupancy = totalDays > 0 ? (totalOccupancySum / totalDays) : 0.0;

    return OccupancyReportResponse.builder()
            .averageOccupancy(Math.round(averageOccupancy * 100.0) / 100.0)
            .dailyOccupancies(dailyList)
            .build();
}

}