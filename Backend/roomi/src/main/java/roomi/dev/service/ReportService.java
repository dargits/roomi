package roomi.dev.service;

import roomi.dev.dto.response.OccupancyReportResponse;
import roomi.dev.dto.response.RevenueReportResponse;
import java.time.LocalDate;

public interface ReportService {
    RevenueReportResponse getRevenueReport(LocalDate startDate, LocalDate endDate);
    byte[] exportRevenueReportExcel(LocalDate startDate, LocalDate endDate);
    OccupancyReportResponse getOccupancyReport(LocalDate startDate, LocalDate endDate);
}