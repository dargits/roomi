package plant.stay.service;

import plant.stay.dto.request.DebtApprovalCreateRequest;
import plant.stay.dto.request.DebtApprovalRejectRequest;
import plant.stay.dto.request.DebtCollectionLogRequest;
import plant.stay.dto.response.DebtAgingReportResponse;
import plant.stay.dto.response.DebtCollectionLogResponse;
import plant.stay.dto.response.DebtItemResponse;
import plant.stay.model.User;

import java.time.LocalDate;
import java.util.List;

public interface DebtApprovalService {
    DebtItemResponse requestDebtCheckout(DebtApprovalCreateRequest req, User actor);
    DebtItemResponse approveDebtCheckout(Long requestId, User actor);
    DebtItemResponse rejectDebtCheckout(Long requestId, DebtApprovalRejectRequest req, User actor);
    List<DebtItemResponse> getActiveDebts();
    List<DebtItemResponse> getPendingRequests();
    List<DebtItemResponse> getAllRequests();

    /** Nhắc nợ đến hạn ngày mai (scheduler cũ) */
    void sendDueTomorrowReminders();

    // === Báo cáo Tuổi nợ & Nhắc thu ===

    /**
     * Lấy báo cáo tuổi nợ với phân nhóm bucket, tổng hợp theo khách hàng và đối soát doanh thu.
     *
     * @param asOfDate       Ngày chốt tính số ngày quá hạn (mặc định hôm nay nếu null)
     * @param fromCheckout   Lọc theo ngày trả phòng từ (null = chế độ snapshot toàn bộ)
     * @param toCheckout     Lọc theo ngày trả phòng đến (null = chế độ snapshot toàn bộ)
     * @param guestId        Lọc theo khách hàng cụ thể (null = tất cả)
     * @param bucketFilter   Lọc theo nhóm tuổi nợ: CURRENT, OVERDUE_UNDER_15, OVERDUE_15_TO_30, OVERDUE_OVER_30 (null = tất cả)
     * @param reminderFilter Lọc nhắc thu: DUE_TODAY, OVERDUE_REMINDER, UPCOMING, NONE (null = tất cả)
     */
    DebtAgingReportResponse getDebtAgingReport(
            LocalDate asOfDate,
            LocalDate fromCheckout,
            LocalDate toCheckout,
            Long guestId,
            String bucketFilter,
            String reminderFilter);

    /**
     * Ghi nhận một lần liên hệ đòi nợ, cập nhật nextReminderDate cho khoản nợ.
     */
    DebtCollectionLogResponse addCollectionLog(Long debtId, DebtCollectionLogRequest req, User actor);

    /**
     * Xem toàn bộ lịch sử liên hệ đòi nợ của một khoản (mới nhất trước).
     */
    List<DebtCollectionLogResponse> getCollectionLogs(Long debtId);

    /**
     * Xuất báo cáo tuổi nợ dạng CSV UTF-8 BOM (tương thích Excel tiếng Việt).
     */
    byte[] exportDebtAgingCsv(
            LocalDate asOfDate,
            LocalDate fromCheckout,
            LocalDate toCheckout,
            Long guestId,
            String bucketFilter);

    /**
     * Quét và gửi thông báo nhắc đòi nợ cho các khoản có nextReminderDate <= hôm nay.
     * Được gọi tự động bởi DebtReminderScheduler lúc 09:00 sáng hàng ngày.
     */
    void sendDailyDebtReminders();

    /**
     * Gửi email nhắc nợ & đối soát trực tiếp tới khách hàng.
     */
    boolean sendDebtReminderEmail(Long debtId, String recipientEmail, User actor);

    /**
     * Gửi email giấy xác nhận công nợ tới khách hàng.
     */
    boolean sendAcknowledgementEmail(Long debtId, String recipientEmail, User actor);
}
