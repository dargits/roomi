package roomi.dev.service;

import roomi.dev.dto.response.RevenueReportResponse;
import java.time.LocalDate;

public interface ReportService {
    RevenueReportResponse getRevenueReport(LocalDate startDate, LocalDate endDate);
}