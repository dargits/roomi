package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.BestSellingServicesReportResponse;
import plant.stay.dto.response.BestSellingServicesReportResponse.*;
import plant.stay.model.Booking;
import plant.stay.model.BookingServiceUsage;
import plant.stay.model.ExtraService;
import plant.stay.model.Invoice;
import plant.stay.model.InvoiceStatus;
import plant.stay.model.RoomType;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.BookingServiceUsageRepository;
import plant.stay.repository.ExtraServiceRepository;
import plant.stay.repository.InvoiceRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.service.BestSellingServicesReportService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BestSellingServicesReportServiceImpl implements BestSellingServicesReportService {

    private final BookingRepository bookingRepository;
    private final BookingServiceUsageRepository bookingServiceUsageRepository;
    private final ExtraServiceRepository extraServiceRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final InvoiceRepository invoiceRepository;

    @Override
    public BestSellingServicesReportResponse getReport(LocalDate from, LocalDate to, Long roomTypeId) {
        // 1. Lấy danh sách booking CHECKED_OUT trong kỳ
        List<Booking> checkedOutBookings = bookingRepository.findCheckedOutBetween(from, to);
        if (checkedOutBookings == null) {
            checkedOutBookings = Collections.emptyList();
        }

        // 2. Chỉ tính booking đã lập hóa đơn hợp lệ (status != CANCELLED) để khớp với Báo cáo Doanh thu
        List<Booking> validInvoicedBookings = new ArrayList<>();
        Map<Long, Invoice> bookingInvoiceMap = new HashMap<>();

        if (!checkedOutBookings.isEmpty()) {
            List<Long> allBookingIds = checkedOutBookings.stream().map(Booking::getId).toList();
            List<Invoice> allInvoices = invoiceRepository.findInvoicesCoveringBookingIds(allBookingIds);
            for (Invoice inv : allInvoices) {
                if (inv.getStatus() != InvoiceStatus.CANCELLED) {
                    if (inv.getBooking() != null) {
                        bookingInvoiceMap.putIfAbsent(inv.getBooking().getId(), inv);
                    }
                    if (inv.getGroupBooking() != null) {
                        for (Booking b : checkedOutBookings) {
                            if (b.getGroupBooking() != null && b.getGroupBooking().getId().equals(inv.getGroupBooking().getId())) {
                                bookingInvoiceMap.putIfAbsent(b.getId(), inv);
                            }
                        }
                    }
                }
            }
            for (Booking b : checkedOutBookings) {
                if (bookingInvoiceMap.containsKey(b.getId())) {
                    validInvoicedBookings.add(b);
                }
            }
        }

        // 3. Lấy tất cả dịch vụ phụ thu (usages) thuộc các booking đã có hóa đơn
        List<BookingServiceUsage> usages = Collections.emptyList();
        if (!validInvoicedBookings.isEmpty()) {
            List<Long> bookingIds = validInvoicedBookings.stream().map(Booking::getId).collect(Collectors.toList());
            usages = bookingServiceUsageRepository.findByBookingIdInWithDetails(bookingIds);
        }

        // Lọc theo loại phòng nếu được chọn
        String selectedRoomTypeName = null;
        if (roomTypeId != null) {
            RoomType rt = roomTypeRepository.findById(roomTypeId).orElse(null);
            if (rt != null) {
                selectedRoomTypeName = rt.getName();
            }
            usages = usages.stream()
                    .filter(u -> u.getBooking() != null && u.getBooking().getRoomType() != null &&
                            u.getBooking().getRoomType().getId().equals(roomTypeId))
                    .collect(Collectors.toList());
        }

        // 4. Phân loại usages thành:
        //    - Dịch vụ do khách chủ động mua (Catalog Services)
        //    - Dòng phụ thu sinh tự động (Auto Surcharges: thêm người, lệch giờ,...)
        List<BookingServiceUsage> catalogUsages = new ArrayList<>();
        List<BookingServiceUsage> autoUsages = new ArrayList<>();

        for (BookingServiceUsage u : usages) {
            if (isAutoSurcharge(u)) {
                autoUsages.add(u);
            } else {
                catalogUsages.add(u);
            }
        }

        // 5. Xử lý nhóm Dịch vụ trong danh mục (Catalog Services)
        // Lấy tất cả ExtraService trong danh mục
        List<ExtraService> allCatalogServices = extraServiceRepository.findAll().stream()
                .filter(s -> !isAutoSurchargeServiceTemplate(s))
                .collect(Collectors.toList());

        // Nhóm usage theo ExtraService ID
        Map<Long, List<BookingServiceUsage>> catalogByServiceId = catalogUsages.stream()
                .filter(u -> u.getExtraService() != null)
                .collect(Collectors.groupingBy(u -> u.getExtraService().getId()));

        List<CatalogServiceItem> catalogServiceItems = new ArrayList<>();
        BigDecimal totalCatalogRevenue = BigDecimal.ZERO;
        long totalCatalogSalesCount = 0;
        long totalCatalogQuantity = 0;
        int zeroSalesCount = 0;

        for (ExtraService service : allCatalogServices) {
            List<BookingServiceUsage> sUsages = catalogByServiceId.getOrDefault(service.getId(), Collections.emptyList());
            long salesCount = sUsages.size();
            long totalQuantity = sUsages.stream().mapToLong(BookingServiceUsage::getQuantity).sum();
            BigDecimal revenue = sUsages.stream()
                    .map(u -> (u.getUnitPriceSnapshot() != null ? u.getUnitPriceSnapshot() : BigDecimal.ZERO)
                            .multiply(BigDecimal.valueOf(u.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            if (salesCount == 0) {
                zeroSalesCount++;
            }

            totalCatalogRevenue = totalCatalogRevenue.add(revenue);
            totalCatalogSalesCount += salesCount;
            totalCatalogQuantity += totalQuantity;

            // Phân bổ theo loại phòng cho dịch vụ này
            List<RoomTypeBreakdownItem> roomTypeBreakdown = buildRoomTypeBreakdown(sUsages, revenue);

            catalogServiceItems.add(CatalogServiceItem.builder()
                    .serviceId(service.getId())
                    .serviceName(service.getName())
                    .unitPrice(service.getUnitPrice() != null ? service.getUnitPrice() : BigDecimal.ZERO)
                    .unit(service.getUnit() != null ? service.getUnit() : "")
                    .active(Boolean.TRUE.equals(service.getActive()))
                    .salesCount(salesCount)
                    .totalQuantity(totalQuantity)
                    .revenue(revenue)
                    .revenueShare(BigDecimal.ZERO) // Sẽ tính sau khi có tổng doanh thu phụ thu
                    .roomTypeBreakdown(roomTypeBreakdown)
                    .build());
        }

        // Sắp xếp: Dịch vụ doanh thu cao lên đầu, sau đó theo lượt bán, cuối cùng là dịch vụ 0 lượt
        catalogServiceItems.sort((a, b) -> {
            int cmp = b.getRevenue().compareTo(a.getRevenue());
            if (cmp != 0) return cmp;
            int cmpCount = Long.compare(b.getSalesCount(), a.getSalesCount());
            if (cmpCount != 0) return cmpCount;
            return a.getServiceName().compareToIgnoreCase(b.getServiceName());
        });

        // 6. Xử lý nhóm Phụ thu sinh tự động (Auto Surcharges)
        Map<String, List<BookingServiceUsage>> autoByCategory = new LinkedHashMap<>();
        for (BookingServiceUsage u : autoUsages) {
            String category = detectAutoCategory(u);
            autoByCategory.computeIfAbsent(category, k -> new ArrayList<>()).add(u);
        }

        List<AutoSurchargeItem> autoSurchargeItems = new ArrayList<>();
        BigDecimal totalAutoRevenue = BigDecimal.ZERO;
        long totalAutoSalesCount = 0;
        long totalAutoQuantity = 0;

        for (Map.Entry<String, List<BookingServiceUsage>> entry : autoByCategory.entrySet()) {
            String code = entry.getKey();
            List<BookingServiceUsage> uList = entry.getValue();
            long salesCount = uList.size();
            long totalQuantity = uList.stream().mapToLong(BookingServiceUsage::getQuantity).sum();
            BigDecimal revenue = uList.stream()
                    .map(u -> (u.getUnitPriceSnapshot() != null ? u.getUnitPriceSnapshot() : BigDecimal.ZERO)
                            .multiply(BigDecimal.valueOf(u.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            totalAutoRevenue = totalAutoRevenue.add(revenue);
            totalAutoSalesCount += salesCount;
            totalAutoQuantity += totalQuantity;

            String name = getAutoCategoryDisplayName(code);
            List<RoomTypeBreakdownItem> roomTypeBreakdown = buildRoomTypeBreakdown(uList, revenue);

            autoSurchargeItems.add(AutoSurchargeItem.builder()
                    .code(code)
                    .name(name)
                    .salesCount(salesCount)
                    .totalQuantity(totalQuantity)
                    .revenue(revenue)
                    .revenueShare(BigDecimal.ZERO)
                    .roomTypeBreakdown(roomTypeBreakdown)
                    .build());
        }

        autoSurchargeItems.sort((a, b) -> b.getRevenue().compareTo(a.getRevenue()));

        // 7. Tổng doanh thu phụ thu toàn kỳ (chủ động + tự động)
        BigDecimal totalSurchargeRevenue = totalCatalogRevenue.add(totalAutoRevenue);

        // Tính tỷ trọng (%) cho từng dịch vụ chủ động
        for (CatalogServiceItem item : catalogServiceItems) {
            if (totalSurchargeRevenue.compareTo(BigDecimal.ZERO) > 0 && item.getRevenue().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal share = item.getRevenue().multiply(BigDecimal.valueOf(100))
                        .divide(totalSurchargeRevenue, 2, RoundingMode.HALF_UP);
                item.setRevenueShare(share);
            } else {
                item.setRevenueShare(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            }
        }

        // Tính tỷ trọng (%) cho từng dòng phụ thu tự động
        for (AutoSurchargeItem item : autoSurchargeItems) {
            if (totalSurchargeRevenue.compareTo(BigDecimal.ZERO) > 0 && item.getRevenue().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal share = item.getRevenue().multiply(BigDecimal.valueOf(100))
                        .divide(totalSurchargeRevenue, 2, RoundingMode.HALF_UP);
                item.setRevenueShare(share);
            } else {
                item.setRevenueShare(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            }
        }

        // 8. So sánh giữa các loại phòng (Room Type Comparison)
        List<RoomType> allRoomTypes = roomTypeRepository.findAll();
        List<RoomTypeComparisonItem> roomTypeComparisons = new ArrayList<>();

        // Nhóm tất cả usages theo RoomType ID
        Map<Long, List<BookingServiceUsage>> usagesByRoomTypeId = usages.stream()
                .filter(u -> u.getBooking() != null && u.getBooking().getRoomType() != null)
                .collect(Collectors.groupingBy(u -> u.getBooking().getRoomType().getId()));

        for (RoomType rt : allRoomTypes) {
            List<BookingServiceUsage> rtUsages = usagesByRoomTypeId.getOrDefault(rt.getId(), Collections.emptyList());
            long rtSalesCount = rtUsages.size();
            long rtTotalQuantity = rtUsages.stream().mapToLong(BookingServiceUsage::getQuantity).sum();
            BigDecimal rtRevenue = rtUsages.stream()
                    .map(u -> (u.getUnitPriceSnapshot() != null ? u.getUnitPriceSnapshot() : BigDecimal.ZERO)
                            .multiply(BigDecimal.valueOf(u.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal rtShare = totalSurchargeRevenue.compareTo(BigDecimal.ZERO) > 0
                    ? rtRevenue.multiply(BigDecimal.valueOf(100)).divide(totalSurchargeRevenue, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

            // Tìm top services của loại phòng này
            Map<String, List<BookingServiceUsage>> byServiceName = rtUsages.stream()
                    .collect(Collectors.groupingBy(u -> u.getExtraService() != null ? u.getExtraService().getName() : "Khác"));

            List<SimpleServiceStat> topServices = byServiceName.entrySet().stream()
                    .map(e -> {
                        BigDecimal sRev = e.getValue().stream()
                                .map(u -> (u.getUnitPriceSnapshot() != null ? u.getUnitPriceSnapshot() : BigDecimal.ZERO)
                                        .multiply(BigDecimal.valueOf(u.getQuantity())))
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        long sQty = e.getValue().stream().mapToLong(BookingServiceUsage::getQuantity).sum();
                        return SimpleServiceStat.builder()
                                .name(e.getKey())
                                .revenue(sRev)
                                .quantity(sQty)
                                .build();
                    })
                    .sorted((a, b) -> b.getRevenue().compareTo(a.getRevenue()))
                    .limit(5)
                    .collect(Collectors.toList());

            roomTypeComparisons.add(RoomTypeComparisonItem.builder()
                    .roomTypeId(rt.getId())
                    .roomTypeName(rt.getName())
                    .totalRevenue(rtRevenue)
                    .totalQuantity(rtTotalQuantity)
                    .salesCount(rtSalesCount)
                    .revenueShare(rtShare)
                    .topServices(topServices)
                    .build());
        }

        roomTypeComparisons.sort((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()));

        // 9. Dịch vụ bán chạy nhất
        CatalogServiceItem topItem = catalogServiceItems.stream()
                .filter(i -> i.getRevenue().compareTo(BigDecimal.ZERO) > 0)
                .findFirst()
                .orElse(null);

        SurchargeReportSummary summary = SurchargeReportSummary.builder()
                .totalSurchargeRevenue(totalSurchargeRevenue)
                .catalogServicesRevenue(totalCatalogRevenue)
                .autoSurchargeRevenue(totalAutoRevenue)
                .totalSalesCount(totalCatalogSalesCount + totalAutoSalesCount)
                .totalQuantity(totalCatalogQuantity + totalAutoQuantity)
                .totalCatalogServices(allCatalogServices.size())
                .activeCatalogServices((int) allCatalogServices.stream().filter(s -> Boolean.TRUE.equals(s.getActive())).count())
                .zeroSalesCatalogServices(zeroSalesCount)
                .topServiceName(topItem != null ? topItem.getServiceName() : "Chưa có")
                .topServiceRevenue(topItem != null ? topItem.getRevenue() : BigDecimal.ZERO)
                .build();

        return BestSellingServicesReportResponse.builder()
                .from(from.toString())
                .to(to.toString())
                .selectedRoomTypeId(roomTypeId)
                .selectedRoomTypeName(selectedRoomTypeName)
                .summary(summary)
                .catalogServices(catalogServiceItems)
                .autoSurcharges(autoSurchargeItems)
                .roomTypeComparisons(roomTypeComparisons)
                .build();
    }

    @Override
    public byte[] exportCsv(LocalDate from, LocalDate to) {
        BestSellingServicesReportResponse report = getReport(from, to, null);

        StringBuilder sb = new StringBuilder();
        // UTF-8 BOM
        sb.append('\ufeff');

        sb.append("BÁO CÁO DỊCH VỤ PHỤ THU BÁN CHẠY\n");
        sb.append(String.format("Khoảng thời gian: %s đến %s\n\n", from, to));

        // 1. Tổng quan KPI
        sb.append("1. TỔNG QUAN DOANH THU PHỤ THU\n");
        sb.append("Chỉ số,Giá trị\n");
        sb.append(String.format("Tổng doanh thu phụ thu,%s đ\n", report.getSummary().getTotalSurchargeRevenue()));
        sb.append(String.format("Doanh thu dịch vụ khách chủ động mua,%s đ\n", report.getSummary().getCatalogServicesRevenue()));
        sb.append(String.format("Doanh thu phụ thu tự động,%s đ\n", report.getSummary().getAutoSurchargeRevenue()));
        sb.append(String.format("Tổng số lượt sử dụng,%d\n", report.getSummary().getTotalSalesCount()));
        sb.append(String.format("Tổng số lượng dịch vụ cung cấp,%d\n", report.getSummary().getTotalQuantity()));
        sb.append(String.format("Số dịch vụ trong danh mục,%d\n", report.getSummary().getTotalCatalogServices()));
        sb.append(String.format("Số dịch vụ không ai dùng (0 lượt),%d\n", report.getSummary().getZeroSalesCatalogServices()));
        sb.append(String.format("Dịch vụ bán chạy nhất,%s (%s đ)\n\n",
                report.getSummary().getTopServiceName(), report.getSummary().getTopServiceRevenue()));

        // 2. Dịch vụ chủ động mua
        sb.append("2. DANH MỤC DỊCH VỤ PHỤ THU (KHÁCH CHỦ ĐỘNG MUA)\n");
        sb.append("Mã DV,Tên dịch vụ,Đơn giá (đ),Đơn vị,Lượt bán,Tổng số lượng,Doanh thu (đ),Tỷ trọng (%),Trạng thái,Đánh giá\n");
        for (CatalogServiceItem item : report.getCatalogServices()) {
            String evaluation = item.getSalesCount() == 0 ? "Không ai dùng - Cân nhắc bỏ" :
                    (item.getRevenueShare().compareTo(BigDecimal.valueOf(20)) >= 0 ? "Bán rất chạy - Đẩy mạnh" : "Bình thường");
            sb.append(String.format("%d,\"%s\",%s,\"%s\",%d,%d,%s,%.2f%%,\"%s\",\"%s\"\n",
                    item.getServiceId(),
                    item.getServiceName().replace("\"", "\"\""),
                    item.getUnitPrice(),
                    item.getUnit(),
                    item.getSalesCount(),
                    item.getTotalQuantity(),
                    item.getRevenue(),
                    item.getRevenueShare(),
                    item.getActive() ? "Đang bán" : "Ngưng bán",
                    evaluation));
        }
        sb.append("\n");

        // 3. Phụ thu tự động
        sb.append("3. DÒNG PHỤ THU SINH TỰ ĐỘNG (HỆ THỐNG)\n");
        sb.append("Mã loại,Khoản phụ thu,Số lượt phát sinh,Tổng số lượng,Doanh thu (đ),Tỷ trọng (%)\n");
        for (AutoSurchargeItem item : report.getAutoSurcharges()) {
            sb.append(String.format("\"%s\",\"%s\",%d,%d,%s,%.2f%%\n",
                    item.getCode(),
                    item.getName().replace("\"", "\"\""),
                    item.getSalesCount(),
                    item.getTotalQuantity(),
                    item.getRevenue(),
                    item.getRevenueShare()));
        }
        sb.append("\n");

        // 4. So sánh loại phòng
        sb.append("4. SO SÁNH TIÊU THỤ DỊCH VỤ GIỮA CÁC LOẠI PHÒNG\n");
        sb.append("Mã loại phòng,Tên loại phòng,Số lượt,Tổng số lượng,Doanh thu phụ thu (đ),Tỷ trọng (%)\n");
        for (RoomTypeComparisonItem item : report.getRoomTypeComparisons()) {
            sb.append(String.format("%d,\"%s\",%d,%d,%s,%.2f%%\n",
                    item.getRoomTypeId(),
                    item.getRoomTypeName().replace("\"", "\"\""),
                    item.getSalesCount(),
                    item.getTotalQuantity(),
                    item.getTotalRevenue(),
                    item.getRevenueShare()));
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private boolean isAutoSurcharge(BookingServiceUsage u) {
        if (Boolean.TRUE.equals(u.getIsSystemMandatory())) {
            return true;
        }
        if (u.getExtraService() != null && isAutoSurchargeServiceTemplate(u.getExtraService())) {
            return true;
        }
        if (u.getNote() != null) {
            String noteLower = u.getNote().toLowerCase();
            if (noteLower.contains("[phụ thu") || noteLower.contains("phụ thu vượt tiêu chuẩn")
                    || noteLower.contains("phụ thu người ở ghép") || noteLower.contains("phụ thu thêm người")
                    || noteLower.contains("phụ thu lệch giờ")) {
                return true;
            }
        }
        return false;
    }

    private boolean isAutoSurchargeServiceTemplate(ExtraService s) {
        if (s == null || s.getName() == null) return false;
        String name = s.getName().toLowerCase();
        return name.contains("ở ghép") || name.contains("vượt tiêu chuẩn")
                || name.contains("lệch giờ") || name.contains("nhận phòng sớm")
                || name.contains("trả phòng muộn") || name.contains("thêm người vượt");
    }

    private String detectAutoCategory(BookingServiceUsage u) {
        String serviceName = (u.getExtraService() != null && u.getExtraService().getName() != null)
                ? u.getExtraService().getName().toLowerCase() : "";
        String note = u.getNote() != null ? u.getNote().toLowerCase() : "";

        if (serviceName.contains("ở ghép") || serviceName.contains("vượt tiêu chuẩn") || serviceName.contains("thêm người")
                || note.contains("ở ghép") || note.contains("vượt tiêu chuẩn") || note.contains("thêm người")) {
            return "EXTRA_PERSON";
        }
        if (serviceName.contains("lệch giờ") || serviceName.contains("sớm") || serviceName.contains("muộn") || serviceName.contains("trễ")
                || note.contains("lệch giờ") || note.contains("sớm") || note.contains("muộn") || note.contains("trễ")) {
            return "TIME_DIFF";
        }
        return "OTHER_AUTO";
    }

    private String getAutoCategoryDisplayName(String code) {
        switch (code) {
            case "EXTRA_PERSON":
                return "Phụ thu thêm người / ở ghép vượt tiêu chuẩn";
            case "TIME_DIFF":
                return "Phụ thu lệch giờ (nhận phòng sớm / trả phòng muộn)";
            case "OTHER_AUTO":
            default:
                return "Phụ thu tự động hệ thống khác";
        }
    }

    private List<RoomTypeBreakdownItem> buildRoomTypeBreakdown(List<BookingServiceUsage> usages, BigDecimal totalServiceRevenue) {
        Map<Long, List<BookingServiceUsage>> byRoomType = usages.stream()
                .filter(u -> u.getBooking() != null && u.getBooking().getRoomType() != null)
                .collect(Collectors.groupingBy(u -> u.getBooking().getRoomType().getId()));

        List<RoomTypeBreakdownItem> list = new ArrayList<>();
        for (Map.Entry<Long, List<BookingServiceUsage>> e : byRoomType.entrySet()) {
            List<BookingServiceUsage> rtUsages = e.getValue();
            long count = rtUsages.size();
            long qty = rtUsages.stream().mapToLong(BookingServiceUsage::getQuantity).sum();
            BigDecimal rev = rtUsages.stream()
                    .map(u -> (u.getUnitPriceSnapshot() != null ? u.getUnitPriceSnapshot() : BigDecimal.ZERO)
                            .multiply(BigDecimal.valueOf(u.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal share = (totalServiceRevenue.compareTo(BigDecimal.ZERO) > 0 && rev.compareTo(BigDecimal.ZERO) > 0)
                    ? rev.multiply(BigDecimal.valueOf(100)).divide(totalServiceRevenue, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

            String rtName = rtUsages.get(0).getBooking().getRoomType().getName();

            list.add(RoomTypeBreakdownItem.builder()
                    .roomTypeId(e.getKey())
                    .roomTypeName(rtName)
                    .salesCount(count)
                    .totalQuantity(qty)
                    .revenue(rev)
                    .shareInService(share)
                    .build());
        }

        list.sort((a, b) -> b.getRevenue().compareTo(a.getRevenue()));
        return list;
    }
}
