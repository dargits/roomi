package plant.stay.service;

import plant.stay.dto.request.ChannelRequest;
import plant.stay.dto.response.ChannelCalendarSyncLogResponse;
import plant.stay.dto.response.ChannelResponse;
import plant.stay.model.User;

import java.util.List;

public interface ChannelCalendarSyncService {

    List<ChannelResponse> getAllChannels();

    ChannelResponse getChannelById(Long id);

    ChannelResponse createChannel(ChannelRequest request, User actor);

    ChannelResponse updateChannel(Long id, ChannelRequest request, User actor);

    void deleteChannel(Long id, User actor);

    /**
     * Bật hoặc tắt trạng thái đồng bộ của kênh.
     * Tắt kênh không xóa dữ liệu hay lịch sử đã đồng bộ trước đó.
     * Kênh chưa ánh xạ đủ loại phòng thì bị chặn không cho bật.
     */
    ChannelResponse toggleActive(Long id, User actor);

    /**
     * Làm mới token đường dẫn tệp lịch khi Chủ cơ sở nghi ngờ bị lộ.
     * Token cũ bị vô hiệu hóa ngay lập tức và sinh ra token bảo mật mới.
     */
    ChannelResponse refreshToken(Long id, User actor);

    /**
     * Đồng bộ thủ công 1 kênh cụ thể.
     */
    ChannelResponse syncChannel(Long id, String reason);

    /**
     * Kích hoạt cập nhật tức thì tất cả các kênh liên kết với loại phòng này
     * ngay sau khi có: đặt phòng mới, hủy phòng, đổi ngày, hoặc khóa phòng bảo trì.
     */
    void syncFeedsForRoomType(Long roomTypeId, String reason);

    /**
     * Quét và cập nhật các kênh đã đến hạn chu kỳ cấu hình.
     */
    void syncAllDueChannels();

    /**
     * Kiểm tra kết nối kênh OTA (kiểm tra tính khả dụng của feed nội bộ và kiểm tra kết nối tới externalCalendarUrl).
     */
    ChannelResponse testConnection(Long id, User actor);

    /**
     * Đồng bộ lại toàn bộ các kênh phân phối đang hoạt động ngay lập tức.
     */
    List<ChannelResponse> syncAllChannels(String reason, User actor);

    /**
     * Lấy thống kê tổng quan về cảnh báo mất kết nối và tình trạng đồng bộ 24h qua.
     */
    plant.stay.dto.response.ChannelWarningSummaryResponse getWarningSummary();

    /**
     * Lấy nhật ký đồng bộ có hỗ trợ lọc theo kênh, trạng thái (SUCCESS/ERROR), và loại kích hoạt.
     */
    List<ChannelCalendarSyncLogResponse> getLogs(Long channelId, String status, String triggeredBy);

    /**
     * Lấy nội dung tệp .ics công khai bằng feedToken (chuẩn RFC 5545).
     */
    String getIcsFeedContent(String feedToken);

    /**
     * Lấy lịch sử nhật ký sinh tệp của 1 kênh.
     */
    List<ChannelCalendarSyncLogResponse> getLogsByChannelId(Long channelId);

    /**
     * Lấy 50 bản ghi nhật ký sinh tệp gần nhất toàn hệ thống.
     */
    List<ChannelCalendarSyncLogResponse> getRecentLogs();

    /**
     * Kiểm tra xem loại phòng mà khách muốn đặt ở kênh đặt phòng đã hết phòng hay chưa
     * dựa theo thời gian nhận / trả phòng mà người dùng nhập.
     */
    plant.stay.dto.response.ChannelAvailabilityCheckResponse checkAvailability(
            Long channelId,
            Long roomTypeId,
            String externalRoomTypeCode,
            java.time.LocalDate checkInDate,
            java.time.LocalDate checkOutDate);

    /**
     * Chuyển một lượt chặn phòng từ kênh OTA thành đặt phòng chính thức khi có thông tin khách.
     * Giữ nguyên liên kết tới kênh nguồn để phục vụ báo cáo.
     */
    plant.stay.dto.response.BookingResponse convertBlockToBooking(
            Long blockId,
            plant.stay.dto.request.ConvertBlockToBookingRequest req,
            User actor);

    /**
     * Lấy danh sách lượt chặn phòng theo kênh và trạng thái.
     */
    List<plant.stay.dto.response.ChannelRoomBlockResponse> getBlocks(Long channelId, String status);

    /**
     * Lấy danh sách lượt chặn phòng đang hoạt động trong khoảng thời gian (phục vụ lịch phòng).
     */
    List<plant.stay.dto.response.ChannelRoomBlockResponse> getActiveBlocks(java.time.LocalDate from, java.time.LocalDate to);
}
