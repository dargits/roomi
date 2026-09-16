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
}
