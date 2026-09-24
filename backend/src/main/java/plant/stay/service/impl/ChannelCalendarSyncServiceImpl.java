package plant.stay.service.impl;

import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import plant.stay.dto.request.ChannelRequest;
import plant.stay.dto.request.ChannelRoomMappingRequest;
import plant.stay.dto.response.ChannelCalendarSyncLogResponse;
import plant.stay.dto.response.ChannelResponse;
import plant.stay.dto.response.ChannelRoomMappingResponse;
import plant.stay.dto.response.ChannelAvailabilityCheckResponse;
import plant.stay.dto.response.ChannelWarningSummaryResponse;
import plant.stay.event.CalendarSyncEvent;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.dto.request.ConvertBlockToBookingRequest;
import plant.stay.dto.response.BookingResponse;
import plant.stay.dto.response.ChannelRoomBlockResponse;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.ChannelCalendarSyncService;
import plant.stay.service.NotificationService;
import plant.stay.service.PricingService;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ChannelCalendarSyncServiceImpl implements ChannelCalendarSyncService {

    private final ChannelRepository channelRepository;
    private final ChannelRoomMappingRepository channelRoomMappingRepository;
    private final ChannelCalendarSyncLogRepository syncLogRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final ChannelRoomBlockRepository channelRoomBlockRepository;
    private final GuestRepository guestRepository;
    private final PricingService pricingService;
    private final ApplicationEventPublisher eventPublisher;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.domain:https://stayaway.io.vn}")
    private String appDomain;

    @Override
    @Transactional(readOnly = true)
    public List<ChannelResponse> getAllChannels() {
        return channelRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ChannelResponse getChannelById(Long id) {
        return toResponse(findChannel(id));
    }

    @Override
    @Transactional
    public ChannelResponse createChannel(ChannelRequest request, User actor) {
        boolean willBeActive = request.getIsActive() != null ? request.getIsActive() : true;
        List<ChannelRoomMappingRequest> mappingRequests = normalizeAndValidateMappings(
                request.getMappings(), request.getRoomTypeId(), request.getAllocatedRooms(),
                request.getChannelCode(), null, willBeActive);

        String feedToken = generateSecureToken();

        Channel channel = Channel.builder()
                .name(request.getName().trim())
                .channelCode(request.getChannelCode() != null ? request.getChannelCode().trim().toUpperCase() : "AIRBNB")
                .externalCalendarUrl(request.getExternalCalendarUrl() != null && !request.getExternalCalendarUrl().isBlank()
                        ? request.getExternalCalendarUrl().trim() : null)
                .feedToken(feedToken)
                .syncIntervalMinutes(request.getSyncIntervalMinutes() != null ? request.getSyncIntervalMinutes() : 15)
                .isActive(willBeActive)
                .createdBy(actor)
                .build();

        // Tương thích ngược: gán loại phòng và phân bổ từ mapping đầu tiên
        if (!mappingRequests.isEmpty()) {
            RoomType firstRt = roomTypeRepository.findById(mappingRequests.get(0).getRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
            channel.setRoomType(firstRt);
            channel.setAllocatedRooms(mappingRequests.get(0).getAllocatedRooms());
        }

        channel = channelRepository.save(channel);

        // Lưu danh sách mapping loại phòng
        saveChannelMappings(channel, mappingRequests);

        if (Boolean.TRUE.equals(channel.getIsActive())) {
            // Sinh tệp lịch ban đầu ngay khi tạo kênh nếu kênh được bật
            syncChannelInternal(channel, "INITIAL_CREATION");
        }

        auditLogService.log("Channel", channel.getId(), "CREATE", actor,
                "Tạo mới kênh phân phối " + channel.getName() + " (" + channel.getChannelCode() + ") với "
                        + mappingRequests.size() + " loại phòng được phân bổ");

        return toResponse(channel);
    }

    @Override
    @Transactional
    public ChannelResponse updateChannel(Long id, ChannelRequest request, User actor) {
        Channel channel = findChannel(id);
        boolean willBeActive = request.getIsActive() != null ? request.getIsActive() : Boolean.TRUE.equals(channel.getIsActive());

        List<ChannelRoomMappingRequest> mappingRequests = normalizeAndValidateMappings(
                request.getMappings(), request.getRoomTypeId(), request.getAllocatedRooms(),
                request.getChannelCode() != null ? request.getChannelCode() : channel.getChannelCode(),
                channel.getId(), willBeActive);

        channel.setName(request.getName().trim());
        if (request.getChannelCode() != null) {
            channel.setChannelCode(request.getChannelCode().trim().toUpperCase());
        }
        channel.setExternalCalendarUrl(request.getExternalCalendarUrl() != null && !request.getExternalCalendarUrl().isBlank()
                ? request.getExternalCalendarUrl().trim() : null);
        if (request.getSyncIntervalMinutes() != null) {
            channel.setSyncIntervalMinutes(request.getSyncIntervalMinutes());
        }
        channel.setIsActive(willBeActive);

        if (!mappingRequests.isEmpty()) {
            RoomType firstRt = roomTypeRepository.findById(mappingRequests.get(0).getRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
            channel.setRoomType(firstRt);
            channel.setAllocatedRooms(mappingRequests.get(0).getAllocatedRooms());
        }

        channel = channelRepository.save(channel);

        // Cập nhật lại các mappings
        channelRoomMappingRepository.deleteByChannelId(channel.getId());
        saveChannelMappings(channel, mappingRequests);

        if (Boolean.TRUE.equals(channel.getIsActive())) {
            // Sinh lại tệp lịch sau khi cập nhật cấu hình
            syncChannelInternal(channel, "CONFIG_UPDATED");
        }

        auditLogService.log("Channel", channel.getId(), "UPDATE", actor,
                "Cập nhật cấu hình kênh phân phối " + channel.getName() + " (" + mappingRequests.size() + " loại phòng ánh xạ)");

        return toResponse(channel);
    }

    @Override
    @Transactional
    public ChannelResponse toggleActive(Long id, User actor) {
        Channel channel = findChannel(id);
        boolean newActive = !Boolean.TRUE.equals(channel.getIsActive());

        if (newActive) {
            // Khi bật đồng bộ: kiểm tra xem kênh đã có ánh xạ loại phòng chưa
            List<ChannelRoomMapping> mappings = channelRoomMappingRepository.findByChannelId(id);
            if (mappings.isEmpty()) {
                if (channel.getRoomType() != null) {
                    // Chuyển đổi từ dữ liệu cũ sang mapping mới
                    ChannelRoomMapping legacyMapping = ChannelRoomMapping.builder()
                            .channel(channel)
                            .roomType(channel.getRoomType())
                            .externalRoomTypeCode(channel.getChannelCode() + "_" + channel.getRoomType().getId())
                            .allocatedRooms(channel.getAllocatedRooms() != null ? channel.getAllocatedRooms() : 1)
                            .build();
                    channelRoomMappingRepository.save(legacyMapping);
                    mappings = List.of(legacyMapping);
                } else {
                    throw new IllegalArgumentException("Kênh chưa ánh xạ đủ loại phòng thì không được bật đồng bộ. Vui lòng thiết lập bảng ánh xạ loại phòng.");
                }
            }

            // Kiểm tra tổng số phòng phân bổ không được vượt quá số phòng thực tế
            for (ChannelRoomMapping m : mappings) {
                long physicalRooms = roomRepository.countByRoomTypeId(m.getRoomType().getId());
                int otherAllocated = channelRoomMappingRepository.sumAllocatedByRoomTypeAcrossOtherActiveChannels(
                        m.getRoomType().getId(), channel.getId());
                int totalNewAllocation = otherAllocated + m.getAllocatedRooms();
                if (totalNewAllocation > physicalRooms) {
                    throw new IllegalArgumentException(String.format(
                            "Không thể bật kênh '%s': Loại phòng '%s' sẽ có tổng phân bổ (%d phòng) vượt quá số phòng thực có (%d phòng). Các kênh khác đang phân bổ %d phòng, kênh này phân bổ %d phòng.",
                            channel.getName(), m.getRoomType().getName(), totalNewAllocation, physicalRooms, otherAllocated, m.getAllocatedRooms()
                    ));
                }
            }

            channel.setIsActive(true);
            channel = channelRepository.save(channel);

            // Đồng bộ lại tệp lịch ngay sau khi bật
            syncChannelInternal(channel, "CHANNEL_ACTIVATED");

            auditLogService.log("Channel", channel.getId(), "TOGGLE_STATUS", actor,
                    "Bật đồng bộ kênh phân phối " + channel.getName());
        } else {
            // Khi tắt kênh: KHÔNG xóa dữ liệu đã đồng bộ trước đó hay lịch sử
            channel.setIsActive(false);
            channel = channelRepository.save(channel);

            auditLogService.log("Channel", channel.getId(), "TOGGLE_STATUS", actor,
                    "Tắt đồng bộ kênh phân phối " + channel.getName() + " (dữ liệu lịch và nhật ký cũ được giữ nguyên)");
        }

        return toResponse(channel);
    }

    @Override
    @Transactional
    public void deleteChannel(Long id, User actor) {
        Channel channel = findChannel(id);
        String channelName = channel.getName();
        // Xóa các lượt chặn phòng, bảng ánh xạ và nhật ký liên quan trước để tránh lỗi ràng buộc khóa ngoại
        channelRoomBlockRepository.deleteByChannelId(id);
        channelRoomMappingRepository.deleteByChannelId(id);
        syncLogRepository.deleteByChannelId(id);
        channelRepository.delete(channel);
        channelRepository.flush();
        auditLogService.log("Channel", id, "DELETE", actor, "Xóa kênh phân phối " + channelName);
    }

    @Override
    @Transactional
    public ChannelResponse refreshToken(Long id, User actor) {
        Channel channel = findChannel(id);

        // Sinh token bảo mật ngẫu nhiên 64-hex hoàn toàn mới
        String newToken = generateSecureToken();
        channel.setFeedToken(newToken);
        channel = channelRepository.save(channel);

        // Đồng bộ lại tệp lịch với token mới
        syncChannelInternal(channel, "TOKEN_REGENERATED");

        auditLogService.log("Channel", channel.getId(), "REFRESH_TOKEN", actor,
                "Chủ cơ sở làm mới liên kết lịch iCal của kênh " + channel.getName() + " do nghi ngờ bị lộ");

        log.info("Refreshed feed token for channel ID {}. Old token invalidated.", channel.getId());
        return toResponse(channel);
    }

    @Override
    @Transactional
    public ChannelResponse syncChannel(Long id, String reason) {
        Channel channel = findChannel(id);
        syncChannelInternal(channel, reason != null ? reason : "MANUAL_REFRESH");
        return toResponse(channel);
    }

    @Override
    @Transactional
    public void syncFeedsForRoomType(Long roomTypeId, String reason) {
        Set<Channel> channels = new HashSet<>();
        if (roomTypeId != null) {
            channels.addAll(channelRepository.findByRoomTypeIdAndIsActiveTrue(roomTypeId));
            List<ChannelRoomMapping> mappings = channelRoomMappingRepository.findByRoomTypeId(roomTypeId);
            for (ChannelRoomMapping m : mappings) {
                if (Boolean.TRUE.equals(m.getChannel().getIsActive())) {
                    channels.add(m.getChannel());
                }
            }
        } else {
            channels.addAll(channelRepository.findByIsActiveTrue());
        }

        if (channels.isEmpty()) {
            return;
        }

        log.info("Triggering immediate calendar sync for {} channels (RoomType ID: {}, Reason: {})",
                channels.size(), roomTypeId, reason);

        for (Channel channel : channels) {
            try {
                syncChannelInternal(channel, reason != null ? reason : "EVENT_TRIGGERED");
            } catch (Exception ex) {
                log.error("Failed to sync calendar feed for channel ID {}: {}", channel.getId(), ex.getMessage(), ex);
            }
        }
    }

    /**
     * Lắng nghe sự kiện hệ thống (đặt phòng mới, hủy phòng, dời ngày, khóa phòng bảo trì)
     * Chạy ngay sau khi transaction của nghiệp vụ chính commit thành công.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleCalendarSyncEvent(CalendarSyncEvent event) {
        if (event == null) return;
        try {
            syncFeedsForRoomType(event.getRoomTypeId(), event.getReason());
        } catch (Exception e) {
            log.error("Lỗi khi xử lý sự kiện đồng bộ lịch CalendarSyncEvent: {}", e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public void syncAllDueChannels() {
        LocalDateTime now = LocalDateTime.now();
        List<Channel> activeChannels = channelRepository.findByIsActiveTrue();

        for (Channel channel : activeChannels) {
            int interval = channel.getSyncIntervalMinutes() != null ? channel.getSyncIntervalMinutes() : 15;
            LocalDateTime lastSynced = channel.getLastSyncedAt();

            boolean isDue = lastSynced == null || lastSynced.plusMinutes(interval).isBefore(now);
            if (isDue) {
                try {
                    syncChannelInternal(channel, "SCHEDULED_CYCLE");
                } catch (Exception ex) {
                    log.error("Error in scheduled sync for channel ID {}: {}", channel.getId(), ex.getMessage(), ex);
                }
            }
        }
    }

    @Override
    @Transactional
    public String getIcsFeedContent(String feedToken) {
        if (feedToken == null || feedToken.trim().isEmpty()) {
            throw new ResourceNotFoundException("Token lịch không hợp lệ");
        }

        Channel channel = channelRepository.findByFeedToken(feedToken.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tệp lịch với đường dẫn này. Liên kết có thể đã bị làm mới hoặc bị xóa."));

        if (!Boolean.TRUE.equals(channel.getIsActive())) {
            throw new IllegalStateException("Kênh phân phối này đang tạm ngưng đồng bộ.");
        }

        if (channel.getCachedIcsContent() != null && !channel.getCachedIcsContent().isBlank()) {
            return channel.getCachedIcsContent();
        }

        // Nếu cache chưa có, sinh mới ngay lập tức
        syncChannelInternal(channel, "FEED_ACCESS");
        return channel.getCachedIcsContent();
    }

    @Override
    @Transactional
    public ChannelResponse testConnection(Long id, User actor) {
        Channel channel = findChannel(id);
        if (!Boolean.TRUE.equals(channel.getIsActive())) {
            throw new IllegalArgumentException("Kênh đang tạm ngưng đồng bộ. Vui lòng bật kênh trước khi kiểm tra kết nối.");
        }

        LocalDateTime now = LocalDateTime.now();

        // 1. Nếu có externalCalendarUrl, kiểm tra kết nối HTTP tới URL
        String extUrl = channel.getExternalCalendarUrl();
        if (extUrl != null && !extUrl.isBlank()) {
            try {
                java.net.URI uri = java.net.URI.create(extUrl.trim());
                java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                        .connectTimeout(java.time.Duration.ofSeconds(4))
                        .followRedirects(java.net.http.HttpClient.Redirect.NORMAL)
                        .build();

                java.net.http.HttpRequest httpRequest = java.net.http.HttpRequest.newBuilder()
                        .uri(uri)
                        .timeout(java.time.Duration.ofSeconds(4))
                        .header("User-Agent", "StayAway-PMS-CalendarBot/1.0")
                        .GET()
                        .build();

                java.net.http.HttpResponse<Void> httpResponse = client.send(httpRequest, java.net.http.HttpResponse.BodyHandlers.discarding());
                int statusCode = httpResponse.statusCode();

                if (statusCode >= 400) {
                    String errMsg = "URL lịch ngoài của kênh phản hồi mã lỗi HTTP " + statusCode;
                    channel.setLastSyncedAt(now);
                    channel.setLastSyncStatus("ERROR");
                    channel.setLastSyncErrorMessage(errMsg);
                    channel.setConsecutiveFailures((channel.getConsecutiveFailures() != null ? channel.getConsecutiveFailures() : 0) + 1);
                    channel = channelRepository.save(channel);

                    ChannelCalendarSyncLog errLog = ChannelCalendarSyncLog.builder()
                            .channel(channel)
                            .channelName(channel.getName())
                            .roomTypeName(channel.getRoomType() != null ? channel.getRoomType().getName() : "N/A")
                            .triggeredBy("CONNECTION_TEST")
                            .blockedPeriodsCount(0)
                            .blockedSummary("Kiểm tra kết nối thất bại")
                            .status("ERROR")
                            .errorMessage(errMsg)
                            .syncedAt(now)
                            .build();
                    syncLogRepository.save(errLog);

                    auditLogService.log("Channel", channel.getId(), "TEST_CONNECTION_FAILED", actor,
                            "Kiểm tra kết nối thất bại cho kênh " + channel.getName() + ": " + errMsg);

                    return toResponse(channel);
                }
            } catch (Exception e) {
                String errMsg = "Không thể kết nối đến URL lịch ngoài: " + (e.getMessage() != null ? e.getMessage() : "Lỗi kết nối");
                channel.setLastSyncedAt(now);
                channel.setLastSyncStatus("ERROR");
                channel.setLastSyncErrorMessage(errMsg);
                channel.setConsecutiveFailures((channel.getConsecutiveFailures() != null ? channel.getConsecutiveFailures() : 0) + 1);
                channel = channelRepository.save(channel);

                ChannelCalendarSyncLog errLog = ChannelCalendarSyncLog.builder()
                        .channel(channel)
                        .channelName(channel.getName())
                        .roomTypeName(channel.getRoomType() != null ? channel.getRoomType().getName() : "N/A")
                        .triggeredBy("CONNECTION_TEST")
                        .blockedPeriodsCount(0)
                        .blockedSummary("Kiểm tra kết nối thất bại")
                        .status("ERROR")
                        .errorMessage(errMsg)
                        .syncedAt(now)
                        .build();
                syncLogRepository.save(errLog);

                auditLogService.log("Channel", channel.getId(), "TEST_CONNECTION_FAILED", actor,
                        "Kiểm tra kết nối thất bại cho kênh " + channel.getName() + ": " + errMsg);

                return toResponse(channel);
            }
        }

        // 2. Kiểm tra sinh tệp iCal nội bộ
        try {
            syncChannelInternal(channel, "CONNECTION_TEST");
        } catch (Exception ex) {
            log.warn("Internal sync failed during connection test for channel ID {}: {}", id, ex.getMessage());
        }

        auditLogService.log("Channel", channel.getId(), "TEST_CONNECTION", actor,
                "Kiểm tra kết nối và đồng bộ kênh " + channel.getName() + " - Kết quả: " + channel.getLastSyncStatus());

        return toResponse(findChannel(id));
    }

    @Override
    @Transactional
    public List<ChannelResponse> syncAllChannels(String reason, User actor) {
        List<Channel> activeChannels = channelRepository.findByIsActiveTrue();
        String triggerReason = (reason != null && !reason.isBlank()) ? reason : "MANUAL_SYNC_ALL";
        for (Channel channel : activeChannels) {
            try {
                syncChannelInternal(channel, triggerReason);
            } catch (Exception ex) {
                log.warn("Sync failed for channel ID {} during sync-all: {}", channel.getId(), ex.getMessage());
            }
        }
        auditLogService.log("Channel", null, "SYNC_ALL", actor,
                "Chủ cơ sở thực hiện đồng bộ lại tất cả " + activeChannels.size() + " kênh phân phối đang kích hoạt");
        return getAllChannels();
    }

    @Override
    @Transactional(readOnly = true)
    public ChannelWarningSummaryResponse getWarningSummary() {
        List<Channel> allChannels = channelRepository.findAll();
        List<ChannelResponse> channelResponses = allChannels.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        long totalChannels = channelResponses.size();
        long activeChannels = channelResponses.stream().filter(c -> Boolean.TRUE.equals(c.getIsActive())).count();
        long healthyChannels = channelResponses.stream().filter(c -> "HEALTHY".equals(c.getConnectionStatus())).count();
        long disconnectedChannels = channelResponses.stream().filter(c -> "DISCONNECTED".equals(c.getConnectionStatus())).count();
        long staleChannels = channelResponses.stream().filter(c -> "STALE".equals(c.getConnectionStatus())).count();
        long pausedChannels = channelResponses.stream().filter(c -> "PAUSED".equals(c.getConnectionStatus())).count();

        LocalDateTime past24h = LocalDateTime.now().minusHours(24);
        long totalSyncs24h = syncLogRepository.countBySyncedAtAfter(past24h);
        long successSyncs24h = syncLogRepository.countByStatusAndSyncedAtAfter("SUCCESS", past24h);
        long failedSyncs24h = totalSyncs24h - successSyncs24h;

        double successRate = totalSyncs24h > 0 ? (double) successSyncs24h / totalSyncs24h * 100.0 : 100.0;

        List<ChannelResponse> warningChannels = channelResponses.stream()
                .filter(c -> "DISCONNECTED".equals(c.getConnectionStatus()) || "STALE".equals(c.getConnectionStatus()))
                .collect(Collectors.toList());

        boolean hasWarning = disconnectedChannels > 0 || staleChannels > 0;

        return ChannelWarningSummaryResponse.builder()
                .totalChannels(totalChannels)
                .activeChannels(activeChannels)
                .healthyChannels(healthyChannels)
                .disconnectedChannels(disconnectedChannels)
                .staleChannels(staleChannels)
                .pausedChannels(pausedChannels)
                .syncSuccessRate24h(Math.round(successRate * 10.0) / 10.0)
                .totalSyncs24h(totalSyncs24h)
                .failedSyncs24h(failedSyncs24h)
                .hasWarning(hasWarning)
                .warningChannels(warningChannels)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChannelCalendarSyncLogResponse> getLogs(Long channelId, String status, String triggeredBy) {
        String cleanStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) ? status.trim().toUpperCase() : null;
        String cleanTrigger = (triggeredBy != null && !triggeredBy.isBlank() && !"ALL".equalsIgnoreCase(triggeredBy)) ? triggeredBy.trim().toUpperCase() : null;

        return syncLogRepository.findByFilters(channelId, cleanStatus, cleanTrigger)
                .stream()
                .map(this::toLogResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChannelCalendarSyncLogResponse> getLogsByChannelId(Long channelId) {
        return syncLogRepository.findByChannelIdOrderBySyncedAtDesc(channelId)
                .stream()
                .map(this::toLogResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChannelCalendarSyncLogResponse> getRecentLogs() {
        return syncLogRepository.findTop100ByOrderBySyncedAtDesc()
                .stream()
                .map(this::toLogResponse)
                .collect(Collectors.toList());
    }

    /**
     * Thuật toán cốt lõi:
     * 1. Số phòng còn bán được = Số phòng phân bổ cho kênh - Số phòng bị chiếm.
     * 2. Phòng bị chiếm = Booking active (NEW, CONFIRMED, CHECKED_IN) + Phòng đang khóa bảo trì (MAINTENANCE).
     * 3. Khi số phòng còn bán được <= 0 trong khoảng thời gian tương ứng -> Khoảng thời gian đó bị chặn (hết chỗ).
     * 4. Gộp các ngày liên tiếp thành các khoảng VEVENT theo chuẩn iCalendar RFC 5545.
     * 5. Ghi nhật ký sinh tệp kèm số khoảng thời gian đã chặn.
     */
    private void syncChannelInternal(Channel channel, String triggeredBy) {
        LocalDateTime now = LocalDateTime.now();
        List<ChannelRoomMapping> mappings = channelRoomMappingRepository.findByChannelId(channel.getId());
        if (mappings.isEmpty() && channel.getRoomType() != null) {
            mappings = List.of(ChannelRoomMapping.builder()
                    .channel(channel)
                    .roomType(channel.getRoomType())
                    .externalRoomTypeCode(channel.getChannelCode() + "_" + channel.getRoomType().getId())
                    .allocatedRooms(channel.getAllocatedRooms() != null ? channel.getAllocatedRooms() : 1)
                    .build());
        }

        try {
            LocalDate today = LocalDate.now();
            LocalDate horizonEnd = today.plusDays(365); // Quét 365 ngày tới

            List<BlockedPeriodItem> allBlockedPeriods = new ArrayList<>();

            for (ChannelRoomMapping mapping : mappings) {
                RoomType roomType = mapping.getRoomType();
                int allocatedRooms = mapping.getAllocatedRooms() != null ? mapping.getAllocatedRooms() : 1;

                // 1. Lấy danh sách booking đang chiếm phòng của loại phòng này trong horizon
                List<Booking> activeBookings = bookingRepository.findActiveOverlappingByRoomTypeAndRange(
                        roomType.getId(), today, horizonEnd);

                // 2. Đếm số phòng của loại phòng này đang bị khóa bảo trì (RoomStatus.MAINTENANCE)
                long maintenanceRooms = roomRepository.countByRoomTypeIdAndStatus(roomType.getId(), RoomStatus.MAINTENANCE);

                // 3. Quét từng ngày để tìm các ngày hết chỗ
                List<LocalDate> blockedDates = new ArrayList<>();
                for (LocalDate date = today; date.isBefore(horizonEnd); date = date.plusDays(1)) {
                    final LocalDate currentDate = date;
                    long bookingCountOnDate = activeBookings.stream()
                            .filter(b -> !b.getCheckInDate().isAfter(currentDate) && b.getCheckOutDate().isAfter(currentDate))
                            .count();
                    long totalOccupied = bookingCountOnDate + maintenanceRooms;
                    long availableForChannel = allocatedRooms - totalOccupied;

                    if (availableForChannel <= 0) {
                        blockedDates.add(currentDate);
                    }
                }

                // Gộp các ngày liên tiếp thành các khoảng VEVENT
                List<BlockedPeriod> periods = groupConsecutiveDates(blockedDates);
                for (BlockedPeriod p : periods) {
                    allBlockedPeriods.add(new BlockedPeriodItem(roomType, mapping.getExternalRoomTypeCode(), allocatedRooms, p.startDate, p.endDate));
                }
            }

            // Inbound Sync: Nhận lịch bận từ kênh ngoài nếu có URL tệp lịch
            InboundSyncResult inboundResult = null;
            if (channel.getExternalCalendarUrl() != null && !channel.getExternalCalendarUrl().isBlank()) {
                try {
                    inboundResult = syncInboundCalendarInternal(channel, triggeredBy);
                } catch (Exception inEx) {
                    log.warn("Inbound sync warning for channel '{}': {}", channel.getName(), inEx.getMessage());
                    inboundResult = new InboundSyncResult(0, 0, List.of("Lỗi đọc tệp lịch ngoài: " + inEx.getMessage()), inEx.getMessage());
                }
            }

            // Sinh chuỗi iCalendar RFC 5545 cho chiều chia sẻ ra ngoài (Outbound)
            String icsContent = buildIcsContent(channel, allBlockedPeriods);

            boolean hasWarning = inboundResult != null && (!inboundResult.getWarnings().isEmpty() || inboundResult.getErrorMessage() != null);
            String syncStatus = hasWarning ? "WARNING" : "SUCCESS";
            String syncErrMsg = hasWarning 
                    ? (inboundResult.getErrorMessage() != null ? inboundResult.getErrorMessage() : String.join("; ", inboundResult.getWarnings()))
                    : null;

            channel.setCachedIcsContent(icsContent);
            channel.setLastSyncedAt(now);
            channel.setLastSuccessSyncedAt(now);
            channel.setLastSyncStatus(syncStatus);
            channel.setLastSyncErrorMessage(syncErrMsg);
            channel.setConsecutiveFailures(0);
            channel.setLastBlockedPeriodsCount(allBlockedPeriods.size());
            channelRepository.save(channel);

            // Ghi nhật ký sinh tệp
            String roomTypeNames = mappings.stream().map(m -> m.getRoomType().getName()).distinct().collect(Collectors.joining(", "));
            String blockedSummary = summarizeBlockedPeriods(allBlockedPeriods);
            if (inboundResult != null && inboundResult.getSavedCount() > 0) {
                blockedSummary = String.format("Nhận %d lượt chặn từ kênh (%d vượt phân bổ). ",
                        inboundResult.getSavedCount(), inboundResult.getExcessCount()) + blockedSummary;
            }

            ChannelCalendarSyncLog syncLog = ChannelCalendarSyncLog.builder()
                    .channel(channel)
                    .channelName(channel.getName())
                    .roomTypeName(roomTypeNames.isEmpty() ? "N/A" : roomTypeNames)
                    .triggeredBy(triggeredBy)
                    .blockedPeriodsCount(allBlockedPeriods.size())
                    .blockedSummary(blockedSummary)
                    .status(syncStatus)
                    .errorMessage(syncErrMsg)
                    .syncedAt(now)
                    .build();

            syncLogRepository.save(syncLog);

            log.info("Synced iCal feed for channel '{}' (ID: {}). Outbound blocked: {}, Inbound blocks: {}, Status: {}, Triggered by: {}",
                    channel.getName(), channel.getId(), allBlockedPeriods.size(),
                    inboundResult != null ? inboundResult.getSavedCount() : 0, syncStatus, triggeredBy);
        } catch (Exception ex) {
            log.error("Sync error for channel '{}' (ID: {}): {}", channel.getName(), channel.getId(), ex.getMessage(), ex);

            int failures = (channel.getConsecutiveFailures() != null ? channel.getConsecutiveFailures() : 0) + 1;
            channel.setLastSyncedAt(now);
            channel.setLastSyncStatus("ERROR");
            channel.setLastSyncErrorMessage(ex.getMessage() != null ? ex.getMessage() : "Lỗi không xác định khi sinh dữ liệu lịch");
            channel.setConsecutiveFailures(failures);
            channelRepository.save(channel);

            String roomTypeNames = mappings.stream().map(m -> m.getRoomType().getName()).distinct().collect(Collectors.joining(", "));
            ChannelCalendarSyncLog errLog = ChannelCalendarSyncLog.builder()
                    .channel(channel)
                    .channelName(channel.getName())
                    .roomTypeName(roomTypeNames.isEmpty() ? "N/A" : roomTypeNames)
                    .triggeredBy(triggeredBy)
                    .blockedPeriodsCount(0)
                    .blockedSummary("Đồng bộ thất bại")
                    .status("ERROR")
                    .errorMessage(ex.getMessage() != null ? ex.getMessage() : "Lỗi không xác định khi sinh dữ liệu lịch")
                    .syncedAt(now)
                    .build();
            syncLogRepository.save(errLog);

            try {
                notificationService.createForRoles(
                        NotificationType.CHANNEL_DISCONNECT_WARNING,
                        "Cảnh báo lỗi kênh: " + channel.getName(),
                        "Kênh phân phối " + channel.getName() + " bị lỗi đồng bộ: " + ex.getMessage() + ". Nguy cơ trùng phòng!",
                        "Channel",
                        channel.getId()
                );
            } catch (Exception notifEx) {
                log.debug("Could not dispatch notification: {}", notifEx.getMessage());
            }

            throw new RuntimeException("Lỗi đồng bộ kênh '" + channel.getName() + "': " + ex.getMessage(), ex);
        }
    }

    /**
     * Gộp danh sách các ngày thành các khoảng liên tiếp: [startDate, endDate)
     * với endDate là ngày hôm sau của ngày cuối cùng bị chặn (theo chuẩn RFC 5545).
     */
    private List<BlockedPeriod> groupConsecutiveDates(List<LocalDate> dates) {
        List<BlockedPeriod> periods = new ArrayList<>();
        if (dates == null || dates.isEmpty()) {
            return periods;
        }

        LocalDate start = dates.get(0);
        LocalDate end = start.plusDays(1);

        for (int i = 1; i < dates.size(); i++) {
            LocalDate current = dates.get(i);
            if (current.equals(end)) {
                end = current.plusDays(1);
            } else {
                periods.add(new BlockedPeriod(start, end));
                start = current;
                end = current.plusDays(1);
            }
        }
        periods.add(new BlockedPeriod(start, end));

        return periods;
    }

    /**
     * Xây dựng nội dung file iCalendar (.ics) tương thích tuyệt đối với Airbnb, Booking.com, Agoda, Google Calendar.
     */
    private String buildIcsContent(Channel channel, List<BlockedPeriodItem> items) {
        StringBuilder sb = new StringBuilder();
        sb.append("BEGIN:VCALENDAR\r\n");
        sb.append("VERSION:2.0\r\n");
        sb.append("PRODID:-//StayAway PMS//Channel Calendar Sync//EN\r\n");
        sb.append("CALSCALE:GREGORIAN\r\n");
        sb.append("METHOD:PUBLISH\r\n");
        sb.append("X-WR-CALNAME:StayAway - ").append(escapeIcs(channel.getName())).append("\r\n");
        sb.append("X-WR-TIMEZONE:Asia/Ho_Chi_Minh\r\n");

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyyMMdd");
        DateTimeFormatter utcDtFmt = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");
        String dtstamp = LocalDateTime.now(ZoneOffset.UTC).format(utcDtFmt);

        int seq = 1;
        for (BlockedPeriodItem item : items) {
            sb.append("BEGIN:VEVENT\r\n");
            sb.append("UID:stayaway-ch").append(channel.getId())
                    .append("-rt").append(item.roomType.getId())
                    .append("-").append(item.startDate.format(dateFmt))
                    .append("-").append(item.endDate.format(dateFmt))
                    .append("-").append(seq++)
                    .append("@stayaway.io.vn\r\n");
            sb.append("DTSTAMP:").append(dtstamp).append("\r\n");
            sb.append("DTSTART;VALUE=DATE:").append(item.startDate.format(dateFmt)).append("\r\n");
            sb.append("DTEND;VALUE=DATE:").append(item.endDate.format(dateFmt)).append("\r\n");
            sb.append("SUMMARY:Unavailable - Hết chỗ (").append(escapeIcs(item.roomType.getName())).append(")\r\n");
            sb.append("DESCRIPTION:Khoảng thời gian loại phòng ").append(escapeIcs(item.roomType.getName()))
                    .append(" [Mã kênh: ").append(escapeIcs(item.externalCode)).append("] đã hết chỗ cho kênh ")
                    .append(escapeIcs(channel.getName()))
                    .append(" (Phân bổ: ").append(item.allocatedRooms).append(" phòng)\r\n");
            sb.append("STATUS:CONFIRMED\r\n");
            sb.append("TRANSP:OPAQUE\r\n");
            sb.append("END:VEVENT\r\n");
        }

        sb.append("END:VCALENDAR\r\n");
        return sb.toString();
    }

    private String summarizeBlockedPeriods(List<BlockedPeriodItem> periods) {
        if (periods.isEmpty()) {
            return "Không có khoảng thời gian nào bị chặn (còn chỗ toàn bộ)";
        }
        return periods.stream()
                .limit(10)
                .map(p -> "[" + p.roomType.getName() + "] " + p.startDate + " -> " + p.endDate.minusDays(1))
                .collect(Collectors.joining(", ")) + (periods.size() > 10 ? " (và " + (periods.size() - 10) + " khoảng khác)" : "");
    }

    private String escapeIcs(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                .replace(";", "\\;")
                .replace(",", "\\,")
                .replace("\n", "\\n")
                .replace("\r", "");
    }

    private String generateSecureToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : randomBytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private Channel findChannel(Long id) {
        return channelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy kênh với ID: " + id));
    }

    private List<ChannelRoomMappingRequest> normalizeAndValidateMappings(
            List<ChannelRoomMappingRequest> mappings,
            Long legacyRoomTypeId,
            Integer legacyAllocated,
            String channelCode,
            Long currentChannelId,
            boolean willBeActive) {

        List<ChannelRoomMappingRequest> result = new ArrayList<>();

        if (mappings != null && !mappings.isEmpty()) {
            Set<Long> seenRoomTypes = new HashSet<>();
            for (ChannelRoomMappingRequest req : mappings) {
                if (req.getRoomTypeId() == null) {
                    throw new IllegalArgumentException("Vui lòng chọn loại phòng hệ thống cho từng dòng ánh xạ.");
                }
                if (req.getExternalRoomTypeCode() == null || req.getExternalRoomTypeCode().trim().isEmpty()) {
                    throw new IllegalArgumentException("Mã loại phòng bên kênh không được để trống.");
                }
                if (req.getAllocatedRooms() == null || req.getAllocatedRooms() < 1) {
                    throw new IllegalArgumentException("Số phòng phân bổ phải từ 1 trở lên.");
                }
                if (!seenRoomTypes.add(req.getRoomTypeId())) {
                    throw new IllegalArgumentException("Không thể ánh xạ trùng lặp loại phòng trong cùng một kênh.");
                }
                result.add(req);
            }
        } else if (legacyRoomTypeId != null) {
            result.add(ChannelRoomMappingRequest.builder()
                    .roomTypeId(legacyRoomTypeId)
                    .externalRoomTypeCode((channelCode != null ? channelCode : "OTA") + "_" + legacyRoomTypeId)
                    .allocatedRooms(legacyAllocated != null && legacyAllocated > 0 ? legacyAllocated : 1)
                    .build());
        }

        if (willBeActive) {
            if (result.isEmpty()) {
                throw new IllegalArgumentException("Kênh chưa ánh xạ đủ loại phòng thì không được bật đồng bộ. Vui lòng thiết lập bảng ánh xạ loại phòng.");
            }

            for (ChannelRoomMappingRequest m : result) {
                RoomType rt = roomTypeRepository.findById(m.getRoomTypeId())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng với ID: " + m.getRoomTypeId()));
                long physicalRooms = roomRepository.countByRoomTypeId(rt.getId());
                int otherAllocated = channelRoomMappingRepository.sumAllocatedByRoomTypeAcrossOtherActiveChannels(
                        rt.getId(), currentChannelId);
                int totalAllocation = otherAllocated + m.getAllocatedRooms();

                if (totalAllocation > physicalRooms) {
                    throw new IllegalArgumentException(String.format(
                            "Tổng số phòng phân bổ cho loại phòng '%s' (%d phòng) vượt quá số phòng thực có (%d phòng). Các kênh khác đang phân bổ %d phòng, bạn đang phân bổ %d phòng.",
                            rt.getName(), totalAllocation, physicalRooms, otherAllocated, m.getAllocatedRooms()
                    ));
                }
            }
        }

        return result;
    }

    private void saveChannelMappings(Channel channel, List<ChannelRoomMappingRequest> requests) {
        if (requests == null || requests.isEmpty()) return;

        List<ChannelRoomMapping> entities = requests.stream().map(req -> {
            RoomType rt = roomTypeRepository.findById(req.getRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng với ID: " + req.getRoomTypeId()));
            return ChannelRoomMapping.builder()
                    .channel(channel)
                    .externalRoomTypeCode(req.getExternalRoomTypeCode().trim().toUpperCase())
                    .roomType(rt)
                    .allocatedRooms(req.getAllocatedRooms())
                    .build();
        }).collect(Collectors.toList());

        channelRoomMappingRepository.saveAll(entities);
    }

    private ChannelResponse toResponse(Channel channel) {
        String baseUrl = appDomain != null ? appDomain.replaceAll("/+$", "") : "https://stayaway.io.vn";
        String feedUrl = baseUrl + "/api/public/calendar/feeds/" + channel.getFeedToken() + ".ics";

        List<ChannelRoomMapping> mappingEntities = channelRoomMappingRepository.findByChannelId(channel.getId());
        List<ChannelRoomMappingResponse> mappingResponses = mappingEntities.stream().map(m -> {
            long physical = roomRepository.countByRoomTypeId(m.getRoomType().getId());
            int totalAllocated = channelRoomMappingRepository.sumAllocatedByRoomTypeAcrossOtherActiveChannels(m.getRoomType().getId(), null);
            return ChannelRoomMappingResponse.builder()
                    .id(m.getId())
                    .externalRoomTypeCode(m.getExternalRoomTypeCode())
                    .roomTypeId(m.getRoomType().getId())
                    .roomTypeName(m.getRoomType().getName())
                    .allocatedRooms(m.getAllocatedRooms())
                    .totalPhysicalRooms(physical)
                    .totalAllocatedAcrossChannels(totalAllocated)
                    .build();
        }).collect(Collectors.toList());

        String connectionStatus;
        String connectionStatusMessage;

        if (!Boolean.TRUE.equals(channel.getIsActive())) {
            connectionStatus = "PAUSED";
            connectionStatusMessage = "Kênh đang tạm ngưng đồng bộ";
        } else if ("ERROR".equalsIgnoreCase(channel.getLastSyncStatus()) || (channel.getConsecutiveFailures() != null && channel.getConsecutiveFailures() > 0)) {
            connectionStatus = "DISCONNECTED";
            String reason = channel.getLastSyncErrorMessage() != null ? channel.getLastSyncErrorMessage() : "Lỗi đồng bộ gần nhất";
            connectionStatusMessage = "Mất kết nối: " + reason;
        } else if (channel.getLastSyncedAt() == null || "NEVER_SYNCED".equalsIgnoreCase(channel.getLastSyncStatus())) {
            connectionStatus = "STALE";
            connectionStatusMessage = "Kênh chưa từng đồng bộ dữ liệu";
        } else {
            int interval = channel.getSyncIntervalMinutes() != null ? channel.getSyncIntervalMinutes() : 15;
            long maxGraceMinutes = Math.max(interval * 2L, 30L);
            if (channel.getLastSyncedAt().plusMinutes(maxGraceMinutes).isBefore(LocalDateTime.now())) {
                connectionStatus = "STALE";
                connectionStatusMessage = "Cảnh báo ngừng cập nhật: Đã quá " + maxGraceMinutes + " phút chưa đồng bộ (Nguy cơ trùng phòng)";
            } else {
                connectionStatus = "HEALTHY";
                connectionStatusMessage = "Kết nối ổn định (Đồng bộ thành công)";
            }
        }

        return ChannelResponse.builder()
                .id(channel.getId())
                .name(channel.getName())
                .channelCode(channel.getChannelCode())
                .roomTypeId(channel.getRoomType() != null ? channel.getRoomType().getId() : null)
                .roomTypeName(channel.getRoomType() != null ? channel.getRoomType().getName() : null)
                .allocatedRooms(channel.getAllocatedRooms())
                .feedToken(channel.getFeedToken())
                .feedUrl(feedUrl)
                .externalCalendarUrl(channel.getExternalCalendarUrl())
                .mappings(mappingResponses)
                .syncIntervalMinutes(channel.getSyncIntervalMinutes())
                .isActive(channel.getIsActive())
                .lastSyncedAt(channel.getLastSyncedAt())
                .lastSyncStatus(channel.getLastSyncStatus() != null ? channel.getLastSyncStatus() : "NEVER_SYNCED")
                .lastSyncErrorMessage(channel.getLastSyncErrorMessage())
                .lastSuccessSyncedAt(channel.getLastSuccessSyncedAt())
                .consecutiveFailures(channel.getConsecutiveFailures() != null ? channel.getConsecutiveFailures() : 0)
                .connectionStatus(connectionStatus)
                .connectionStatusMessage(connectionStatusMessage)
                .lastBlockedPeriodsCount(channel.getLastBlockedPeriodsCount())
                .activeBlocksCount(channelRoomBlockRepository != null && channel.getId() != null ? (int) channelRoomBlockRepository.countByChannelIdAndStatus(channel.getId(), "BLOCKED") : 0)
                .createdAt(channel.getCreatedAt())
                .updatedAt(channel.getUpdatedAt())
                .build();
    }

    private ChannelCalendarSyncLogResponse toLogResponse(ChannelCalendarSyncLog log) {
        return ChannelCalendarSyncLogResponse.builder()
                .id(log.getId())
                .channelId(log.getChannel() != null ? log.getChannel().getId() : null)
                .channelName(log.getChannelName())
                .roomTypeName(log.getRoomTypeName())
                .triggeredBy(log.getTriggeredBy())
                .blockedPeriodsCount(log.getBlockedPeriodsCount())
                .blockedSummary(log.getBlockedSummary())
                .status(log.getStatus())
                .errorMessage(log.getErrorMessage())
                .syncedAt(log.getSyncedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ChannelAvailabilityCheckResponse checkAvailability(
            Long channelId,
            Long roomTypeId,
            String externalRoomTypeCode,
            LocalDate checkInDate,
            LocalDate checkOutDate) {

        if (channelId == null) {
            throw new IllegalArgumentException("Vui lòng cung cấp ID của kênh phân phối.");
        }
        if (checkInDate == null || checkOutDate == null) {
            throw new IllegalArgumentException("Ngày nhận phòng và ngày trả phòng không được để trống.");
        }
        if (!checkOutDate.isAfter(checkInDate)) {
            throw new IllegalArgumentException("Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 ngày.");
        }

        Channel channel = findChannel(channelId);

        int totalNights = (int) java.time.temporal.ChronoUnit.DAYS.between(checkInDate, checkOutDate);

        // Nếu kênh đang tắt đồng bộ
        if (!Boolean.TRUE.equals(channel.getIsActive())) {
            return ChannelAvailabilityCheckResponse.builder()
                    .channelId(channel.getId())
                    .channelName(channel.getName())
                    .channelCode(channel.getChannelCode())
                    .checkInDate(checkInDate)
                    .checkOutDate(checkOutDate)
                    .totalNights(totalNights)
                    .allocatedRooms(0)
                    .availableRooms(0)
                    .isAvailable(false)
                    .status("CHANNEL_INACTIVE")
                    .message(String.format("Kênh '%s' hiện đang tạm ngưng hoạt động / tạm tắt đồng bộ.", channel.getName()))
                    .dailyDetails(Collections.emptyList())
                    .build();
        }

        // Tìm mapping tương ứng
        List<ChannelRoomMapping> mappings = channelRoomMappingRepository.findByChannelId(channelId);
        ChannelRoomMapping targetMapping = null;

        if (roomTypeId != null) {
            targetMapping = mappings.stream()
                    .filter(m -> m.getRoomType().getId().equals(roomTypeId))
                    .findFirst()
                    .orElse(null);
        } else if (externalRoomTypeCode != null && !externalRoomTypeCode.isBlank()) {
            targetMapping = mappings.stream()
                    .filter(m -> m.getExternalRoomTypeCode().equalsIgnoreCase(externalRoomTypeCode.trim()))
                    .findFirst()
                    .orElse(null);
        } else if (!mappings.isEmpty()) {
            // Mặc định lấy mapping đầu tiên nếu không chỉ định roomTypeId
            targetMapping = mappings.get(0);
        }

        // Fallback kênh cấu hình cũ
        if (targetMapping == null && channel.getRoomType() != null && (roomTypeId == null || channel.getRoomType().getId().equals(roomTypeId))) {
            targetMapping = ChannelRoomMapping.builder()
                    .channel(channel)
                    .roomType(channel.getRoomType())
                    .externalRoomTypeCode(channel.getChannelCode() + "_" + channel.getRoomType().getId())
                    .allocatedRooms(channel.getAllocatedRooms() != null ? channel.getAllocatedRooms() : 1)
                    .build();
        }

        if (targetMapping == null) {
            return ChannelAvailabilityCheckResponse.builder()
                    .channelId(channel.getId())
                    .channelName(channel.getName())
                    .channelCode(channel.getChannelCode())
                    .roomTypeId(roomTypeId)
                    .externalRoomTypeCode(externalRoomTypeCode)
                    .checkInDate(checkInDate)
                    .checkOutDate(checkOutDate)
                    .totalNights(totalNights)
                    .allocatedRooms(0)
                    .availableRooms(0)
                    .isAvailable(false)
                    .status("ROOM_NOT_MAPPED")
                    .message(String.format("Loại phòng được chọn chưa được cấu hình phân bổ trên kênh '%s'.", channel.getName()))
                    .dailyDetails(Collections.emptyList())
                    .build();
        }

        RoomType roomType = targetMapping.getRoomType();
        int allocatedRooms = targetMapping.getAllocatedRooms() != null ? targetMapping.getAllocatedRooms() : 1;

        // Lấy danh sách booking đang active trong khoảng thời gian này
        List<Booking> activeBookings = bookingRepository.findActiveOverlappingByRoomTypeAndRange(
                roomType.getId(), checkInDate, checkOutDate);

        // Đếm số phòng bảo trì
        long maintenanceRooms = roomRepository.countByRoomTypeIdAndStatus(roomType.getId(), RoomStatus.MAINTENANCE);

        List<ChannelAvailabilityCheckResponse.DailyAvailabilityDto> dailyDetails = new ArrayList<>();
        long minAvailableRooms = Long.MAX_VALUE;
        int soldOutNights = 0;

        for (LocalDate date = checkInDate; date.isBefore(checkOutDate); date = date.plusDays(1)) {
            final LocalDate currentDate = date;
            long bookingCountOnDate = activeBookings.stream()
                    .filter(b -> !b.getCheckInDate().isAfter(currentDate) && b.getCheckOutDate().isAfter(currentDate))
                    .count();

            long totalOccupied = bookingCountOnDate + maintenanceRooms;
            long available = allocatedRooms - totalOccupied;
            boolean isSoldOut = available <= 0;

            if (isSoldOut) {
                soldOutNights++;
            }
            if (available < minAvailableRooms) {
                minAvailableRooms = available;
            }

            dailyDetails.add(ChannelAvailabilityCheckResponse.DailyAvailabilityDto.builder()
                    .date(currentDate)
                    .dayOfWeek(currentDate.getDayOfWeek().name())
                    .allocatedRooms(allocatedRooms)
                    .bookingOccupied(bookingCountOnDate)
                    .maintenanceOccupied(maintenanceRooms)
                    .totalOccupied(totalOccupied)
                    .availableRooms(Math.max(0, available))
                    .isSoldOut(isSoldOut)
                    .build());
        }

        boolean isAvailable = minAvailableRooms > 0;
        int finalAvailableRooms = (int) Math.max(0, minAvailableRooms);

        String message;
        if (isAvailable) {
            message = String.format("CÒN PHÒNG! Kênh '%s' còn %d phòng loại '%s' cho giai đoạn %s đến %s (%d đêm).",
                    channel.getName(), finalAvailableRooms, roomType.getName(), checkInDate, checkOutDate, totalNights);
        } else {
            message = String.format("ĐÃ HẾT PHÒNG! Kênh '%s' không còn phòng loại '%s' cho giai đoạn %s đến %s (Có %d/%d đêm bị hết chỗ).",
                    channel.getName(), roomType.getName(), checkInDate, checkOutDate, soldOutNights, totalNights);
        }

        return ChannelAvailabilityCheckResponse.builder()
                .channelId(channel.getId())
                .channelName(channel.getName())
                .channelCode(channel.getChannelCode())
                .roomTypeId(roomType.getId())
                .roomTypeName(roomType.getName())
                .externalRoomTypeCode(targetMapping.getExternalRoomTypeCode())
                .checkInDate(checkInDate)
                .checkOutDate(checkOutDate)
                .totalNights(totalNights)
                .allocatedRooms(allocatedRooms)
                .availableRooms(finalAvailableRooms)
                .isAvailable(isAvailable)
                .status(isAvailable ? "AVAILABLE" : "SOLD_OUT")
                .message(message)
                .dailyDetails(dailyDetails)
                .build();
    }

    @Override
    @Transactional
    public BookingResponse convertBlockToBooking(Long blockId, ConvertBlockToBookingRequest req, User actor) {
        ChannelRoomBlock block = channelRoomBlockRepository.findById(blockId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lượt chặn phòng với ID: " + blockId));

        if (!"BLOCKED".equals(block.getStatus())) {
            throw new IllegalArgumentException("Lượt chặn này không ở trạng thái khả dụng để chuyển đổi (hiện tại: " + block.getStatus() + ")");
        }

        if (req.getGuestName() == null || req.getGuestName().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên khách hàng không được để trống");
        }

        // 1. Tìm hoặc tạo khách hàng
        String cleanName = req.getGuestName().trim();
        String cleanPhone = req.getGuestPhone() != null && !req.getGuestPhone().isBlank() ? req.getGuestPhone().trim() : null;
        String cleanEmail = req.getGuestEmail() != null && !req.getGuestEmail().isBlank() ? req.getGuestEmail().trim() : null;
        String cleanIdNum = req.getGuestIdNumber() != null && !req.getGuestIdNumber().isBlank() ? req.getGuestIdNumber().trim() : null;

        Guest guest = null;
        if (cleanPhone != null) {
            guest = guestRepository.findByPhone(cleanPhone).orElse(null);
        }
        if (guest == null && cleanIdNum != null) {
            guest = guestRepository.findFirstByIdNumberOrderByIdDesc(cleanIdNum).orElse(null);
        }
        if (guest == null) {
            guest = Guest.builder()
                    .name(cleanName)
                    .phone(cleanPhone)
                    .email(cleanEmail)
                    .idNumber(cleanIdNum)
                    .build();
            guest = guestRepository.save(guest);
        } else {
            boolean updated = false;
            if (cleanEmail != null && (guest.getEmail() == null || guest.getEmail().isBlank())) {
                guest.setEmail(cleanEmail);
                updated = true;
            }
            if (cleanIdNum != null && (guest.getIdNumber() == null || guest.getIdNumber().isBlank())) {
                guest.setIdNumber(cleanIdNum);
                updated = true;
            }
            if (updated) {
                guest = guestRepository.save(guest);
            }
        }

        // 2. Xác định phòng vật lý
        Room room = null;
        if (req.getRoomId() != null) {
            room = roomRepository.findById(req.getRoomId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng"));
            if (!room.getRoomType().getId().equals(block.getRoomType().getId())) {
                throw new IllegalArgumentException("Phòng được chọn không thuộc loại phòng " + block.getRoomType().getName());
            }
        } else if (block.getRoom() != null) {
            room = block.getRoom();
        } else {
            room = findAvailableRoom(block.getRoomType().getId(), block.getStartDate(), block.getEndDate());
        }

        if (room != null) {
            List<Booking> conflicts = bookingRepository.findConflictingBookings(
                    room.getId(), block.getStartDate(), block.getEndDate(), -1L);
            if (!conflicts.isEmpty()) {
                throw new IllegalArgumentException("Phòng " + room.getRoomNumber() + " đã có đặt phòng trùng lịch #" + conflicts.get(0).getId());
            }
        }

        // 3. Tính toán giá tiền
        BigDecimal price = req.getExpectedPrice();
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            try {
                price = pricingService.calculateTotalPrice(block.getRoomType(), block.getStartDate(), block.getEndDate());
            } catch (Exception e) {
                price = block.getRoomType().getBasePrice();
            }
        }

        String channelCode = block.getChannel() != null ? block.getChannel().getChannelCode() : "OTA";
        String channelName = block.getChannel() != null ? block.getChannel().getName() : "Kênh OTA";

        String initialNote = "[Chuyển từ lượt chặn kênh " + channelName + " - UID: " + block.getExternalUid() + "]";
        if (req.getNote() != null && !req.getNote().isBlank()) {
            initialNote += " " + req.getNote().trim();
        }

        // 4. Tạo Booking chính thức giữ nguyên liên kết tới kênh nguồn
        Booking booking = Booking.builder()
                .guest(guest)
                .roomType(block.getRoomType())
                .room(room)
                .checkInDate(block.getStartDate())
                .checkOutDate(block.getEndDate())
                .status(BookingStatus.CONFIRMED)
                .expectedPrice(price)
                .actualPrice(price)
                .depositAmount(req.getDepositAmount() != null ? req.getDepositAmount() : BigDecimal.ZERO)
                .source(channelCode)
                .channel(block.getChannel())
                .note(initialNote)
                .createdBy(actor)
                .build();

        booking = bookingRepository.save(booking);

        // 5. Cập nhật lượt chặn thành CONVERTED
        block.setStatus("CONVERTED");
        block.setConvertedBooking(booking);
        channelRoomBlockRepository.save(block);

        auditLogService.log("ChannelRoomBlock", block.getId(), "CONVERT_TO_BOOKING", actor,
                "Chuyển lượt chặn từ kênh " + channelName + " (#" + block.getId() + ") thành đặt phòng chính thức #"
                        + booking.getId() + " cho khách " + guest.getName());

        eventPublisher.publishEvent(new CalendarSyncEvent(block.getRoomType().getId(), "BLOCK_CONVERTED_TO_BOOKING"));

        return toBookingResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChannelRoomBlockResponse> getBlocks(Long channelId, String status) {
        List<ChannelRoomBlock> blocks;
        if (channelId != null && status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            blocks = channelRoomBlockRepository.findByChannelIdAndStatus(channelId, status.trim().toUpperCase());
        } else if (channelId != null) {
            blocks = channelRoomBlockRepository.findByChannelId(channelId);
        } else if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            blocks = channelRoomBlockRepository.findByStatus(status.trim().toUpperCase());
        } else {
            blocks = channelRoomBlockRepository.findAll();
        }
        return blocks.stream().map(this::toBlockResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChannelRoomBlockResponse> getActiveBlocks(LocalDate from, LocalDate to) {
        return channelRoomBlockRepository.findActiveBlocksBetween(from, to).stream()
                .map(this::toBlockResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ChannelRoomBlockResponse rejectBlock(Long blockId, String reason, User actor) {
        if (reason == null || reason.trim().isBlank()) {
            throw new IllegalArgumentException("Lý do từ chối lượt chặn không được để trống");
        }
        ChannelRoomBlock block = channelRoomBlockRepository.findById(blockId)
                .orElseThrow(() -> new plant.stay.exception.ResourceNotFoundException("Không tìm thấy lượt chặn phòng ID: " + blockId));

        if (!"BLOCKED".equals(block.getStatus())) {
            throw new IllegalArgumentException("Chỉ có thể từ chối lượt chặn đang ở trạng thái BLOCKED");
        }

        block.setStatus("REJECTED");
        block.setRejectReason(reason.trim());
        block.setRoom(null);
        block.setWarningMessage(null);
        channelRoomBlockRepository.save(block);

        auditLogService.log("ChannelRoomBlock", block.getId(), "REJECT_CHANNEL_BLOCK", actor,
                "Từ chối lượt chặn từ kênh " + block.getChannel().getName() + ", lý do: " + reason.trim());

        return toBlockResponse(block);
    }

    @Override
    @Transactional
    public void autoResolveOverbookingConflicts(Long roomTypeId) {
        if (roomTypeId == null) return;
        List<ChannelRoomBlock> unresolvedBlocks = channelRoomBlockRepository.findUnresolvedOverbookingBlocks(roomTypeId);

        for (ChannelRoomBlock block : unresolvedBlocks) {
            Room room = findAvailableRoom(block.getRoomType().getId(), block.getStartDate(), block.getEndDate());
            if (room != null) {
                block.setRoom(room);
                block.setWarningMessage(null);
                channelRoomBlockRepository.save(block);
                auditLogService.log("ChannelRoomBlock", block.getId(), "AUTO_RESOLVE_OVERBOOKING", null,
                        "Cảnh báo trùng phòng tự động đóng do số phòng bị chiếm không còn vượt số phòng thực có. Đã tự động gán phòng " + room.getRoomNumber());
                log.info("Cảnh báo trùng phòng của lượt chặn #{} tự động đóng do phòng {} đã trống.",
                        block.getId(), room.getRoomNumber());
            }
        }
    }

    private String buildOverbookingWarningMessage(Channel channel, RoomType roomType, LocalDate startDate, LocalDate endDate) {
        long totalRooms = roomRepository.countByRoomTypeId(roomType.getId());
        List<Booking> conflicts = bookingRepository.findActiveOverlappingByRoomTypeAndRange(roomType.getId(), startDate, endDate);
        List<ChannelRoomBlock> activeBlocks = channelRoomBlockRepository.findActiveBlocksByRoomTypeAndDates(roomType.getId(), startDate, endDate);

        long occupiedDirect = conflicts.size();
        long occupiedBlocks = activeBlocks.stream().filter(b -> b.getRoom() != null).count();
        long totalOccupied = occupiedDirect + occupiedBlocks;
        long totalNeeded = totalOccupied + 1;
        long missingRooms = Math.max(1, totalNeeded - totalRooms);

        String conflictListStr = conflicts.stream()
                .map(b -> {
                    String gName = b.getGuest() != null ? b.getGuest().getName() : "Khách";
                    return "#" + b.getId() + " (" + gName + ": " + b.getCheckInDate() + " → " + b.getCheckOutDate() + ")";
                })
                .collect(Collectors.joining(", "));

        return String.format(
                "Trùng lịch với đặt phòng: Kênh nguồn [%s], khoảng thời gian %s đến %s, loại phòng '%s'. Số phòng thiếu là %d (Tổng bị chiếm: %d, Thực có: %d). Danh sách đặt phòng đang chiếm chỗ: [%s].",
                channel.getName(), startDate, endDate, roomType.getName(), missingRooms, totalNeeded, totalRooms,
                conflictListStr.isBlank() ? "Không có đặt phòng trực tiếp" : conflictListStr
        );
    }

    /**
     * Thuật toán đồng bộ Inbound: Đọc tệp lịch từ kênh ngoài, trích xuất các khoảng bận,
     * kiểm tra giới hạn phân bổ phòng (allocatedRooms), cảnh báo nếu vượt, và tự động tạo/gỡ chặn phòng.
     */
    public InboundSyncResult syncInboundCalendarInternal(Channel channel, String triggeredBy) {
        String extUrl = channel.getExternalCalendarUrl();
        if (extUrl == null || extUrl.isBlank()) {
            return new InboundSyncResult(0, 0, Collections.emptyList(), null);
        }

        String icsBody;
        try {
            icsBody = fetchExternalCalendar(extUrl);
        } catch (Exception e) {
            log.warn("Không thể tải tệp lịch ngoài cho kênh '{}' (URL: {}): {}", channel.getName(), extUrl, e.getMessage());
            return new InboundSyncResult(0, 0, Collections.emptyList(), "Không thể kết nối tải lịch ngoài: " + e.getMessage());
        }

        if (icsBody == null || icsBody.isBlank()) {
            return new InboundSyncResult(0, 0, Collections.emptyList(), null);
        }

        return processInboundIcsContent(channel, icsBody, triggeredBy);
    }

    /**
     * Xử lý nội dung tệp .ics và đồng bộ các lượt chặn phòng vào database.
     */
    public InboundSyncResult processInboundIcsContent(Channel channel, String icsBody, String triggeredBy) {
        List<ParsedIcsEvent> parsedEvents = parseIcsContent(icsBody);
        LocalDate today = LocalDate.now();

        // Lọc các sự kiện có ngày kết thúc từ hôm nay trở đi
        List<ParsedIcsEvent> futureEvents = parsedEvents.stream()
                .filter(e -> !e.getEndDate().isBefore(today))
                .collect(Collectors.toList());

        List<ChannelRoomMapping> mappings = channelRoomMappingRepository.findByChannelId(channel.getId());
        if (mappings.isEmpty() && channel.getRoomType() != null) {
            mappings = List.of(ChannelRoomMapping.builder()
                    .channel(channel)
                    .roomType(channel.getRoomType())
                    .externalRoomTypeCode(channel.getChannelCode() + "_" + channel.getRoomType().getId())
                    .allocatedRooms(channel.getAllocatedRooms() != null ? channel.getAllocatedRooms() : 1)
                    .build());
        }

        if (mappings.isEmpty()) {
            return new InboundSyncResult(0, 0, Collections.emptyList(), null);
        }

        ChannelRoomMapping primaryMapping = mappings.get(0);
        RoomType roomType = primaryMapping.getRoomType();
        int allocatedRooms = primaryMapping.getAllocatedRooms() != null ? primaryMapping.getAllocatedRooms() : 1;

        // 1. Kiểm tra phân bổ: Số lượt chặn đồng thời trên bất kỳ đêm nào không được vượt allocatedRooms
        Set<ParsedIcsEvent> excessEvents = new HashSet<>();
        LocalDate horizonEnd = today.plusDays(365);

        for (LocalDate d = today; d.isBefore(horizonEnd); d = d.plusDays(1)) {
            final LocalDate cur = d;
            List<ParsedIcsEvent> overlappingOnDay = futureEvents.stream()
                    .filter(e -> !e.getStartDate().isAfter(cur) && e.getEndDate().isAfter(cur))
                    .collect(Collectors.toList());

            if (overlappingOnDay.size() > allocatedRooms) {
                for (int i = allocatedRooms; i < overlappingOnDay.size(); i++) {
                    excessEvents.add(overlappingOnDay.get(i));
                }
            }
        }

        List<String> warnings = new ArrayList<>();
        if (!excessEvents.isEmpty()) {
            String warnMsg = String.format(
                    "Cảnh báo vượt phân bổ: Kênh '%s' có %d lượt đặt trùng đêm vượt quá số phòng phân bổ (%d phòng) cho loại phòng '%s'. Cần Chủ cơ sở xử lý.",
                    channel.getName(), excessEvents.size(), allocatedRooms, roomType.getName()
            );
            warnings.add(warnMsg);
            log.warn(warnMsg);

            try {
                notificationService.createForRoles(
                        NotificationType.CHANNEL_DISCONNECT_WARNING,
                        "Cảnh báo phân bổ kênh: " + channel.getName(),
                        warnMsg,
                        "Channel",
                        channel.getId()
                );
            } catch (Exception ex) {
                log.debug("Không thể gửi thông báo cảnh báo: {}", ex.getMessage());
            }
        }

        // 2. Lấy danh sách lượt chặn BLOCKED hiện có trong cơ sở dữ liệu
        List<ChannelRoomBlock> currentBlocks = channelRoomBlockRepository.findActiveBlocksForChannelSince(channel.getId(), today);
        Map<String, ChannelRoomBlock> currentByUid = currentBlocks.stream()
                .collect(Collectors.toMap(ChannelRoomBlock::getExternalUid, b -> b, (b1, b2) -> b1));

        Set<String> incomingUids = new HashSet<>();
        int savedCount = 0;

        for (ParsedIcsEvent ev : futureEvents) {
            incomingUids.add(ev.getUid());
            boolean isExcess = excessEvents.contains(ev);

            ChannelRoomBlock block = currentByUid.get(ev.getUid());
            if (block == null) {
                // Kiểm tra xem UID này có từng được convert thành booking trước đó không
                Optional<ChannelRoomBlock> prevOpt = channelRoomBlockRepository.findByChannelIdAndExternalUid(channel.getId(), ev.getUid());
                if (prevOpt.isPresent() && "CONVERTED".equals(prevOpt.get().getStatus())) {
                    continue;
                }

                Room room = null;
                if (!isExcess) {
                    room = findAvailableRoom(roomType.getId(), ev.getStartDate(), ev.getEndDate());
                }

                String warningMessage = null;
                if (isExcess) {
                    warningMessage = "Vượt số phòng phân bổ (" + allocatedRooms + " phòng)";
                } else if (room == null) {
                    warningMessage = buildOverbookingWarningMessage(channel, roomType, ev.getStartDate(), ev.getEndDate());

                    try {
                        notificationService.createForRoles(
                                NotificationType.CHANNEL_OVERBOOKING_CONFLICT,
                                "Cảnh báo trùng phòng kênh OTA: " + channel.getName(),
                                "Lịch mới từ kênh " + channel.getName() + " (" + ev.getStartDate() + " đến " + ev.getEndDate() + "): " +
                                        warningMessage + " Cần lễ tân xử lý ngay!",
                                "BOOKING_CALENDAR",
                                channel.getId()
                        );
                    } catch (Exception ex) {
                        log.warn("Không thể gửi thông báo cảnh báo trùng phòng: {}", ex.getMessage());
                    }
                }

                block = ChannelRoomBlock.builder()
                        .channel(channel)
                        .roomType(roomType)
                        .room(room)
                        .externalUid(ev.getUid())
                        .startDate(ev.getStartDate())
                        .endDate(ev.getEndDate())
                        .summary(ev.getSummary())
                        .status("BLOCKED")
                        .isExcess(isExcess)
                        .warningMessage(warningMessage)
                        .build();
                channelRoomBlockRepository.save(block);
                savedCount++;
            } else {
                block.setStartDate(ev.getStartDate());
                block.setEndDate(ev.getEndDate());
                block.setSummary(ev.getSummary());
                block.setIsExcess(isExcess);

                String warningMessage = null;
                if (isExcess) {
                    warningMessage = "Vượt số phòng phân bổ (" + allocatedRooms + " phòng)";
                    block.setRoom(null);
                } else {
                    if (block.getRoom() == null) {
                        Room room = findAvailableRoom(roomType.getId(), ev.getStartDate(), ev.getEndDate());
                        block.setRoom(room);
                    }
                    if (block.getRoom() == null) {
                        warningMessage = buildOverbookingWarningMessage(channel, roomType, ev.getStartDate(), ev.getEndDate());

                        if (block.getWarningMessage() == null || !block.getWarningMessage().contains("Trùng lịch")) {
                            try {
                                notificationService.createForRoles(
                                        NotificationType.CHANNEL_OVERBOOKING_CONFLICT,
                                        "Cảnh báo trùng phòng kênh OTA: " + channel.getName(),
                                        "Lịch từ kênh " + channel.getName() + " (" + ev.getStartDate() + " đến " + ev.getEndDate() + "): " +
                                                warningMessage + " Cần lễ tân xử lý ngay!",
                                        "BOOKING_CALENDAR",
                                        channel.getId()
                                );
                            } catch (Exception ex) {
                                log.warn("Không thể gửi thông báo cảnh báo trùng phòng: {}", ex.getMessage());
                            }
                        }
                    }
                }
                block.setWarningMessage(warningMessage);
                channelRoomBlockRepository.save(block);
                savedCount++;
            }
        }

        // 3. Tự động gỡ bỏ lượt chặn khi khoảng bận biến mất khỏi tệp của kênh
        int removedCount = 0;
        for (ChannelRoomBlock existing : currentBlocks) {
            if (!incomingUids.contains(existing.getExternalUid())) {
                log.info("Khoảng bận UID '{}' đã biến mất khỏi tệp của kênh '{}'. Tự động gỡ chặn phòng.",
                        existing.getExternalUid(), channel.getName());
                channelRoomBlockRepository.delete(existing);
                removedCount++;
            }
        }

        return new InboundSyncResult(savedCount, excessEvents.size(), warnings, null);
    }

    /**
     * Tải tệp lịch từ đường dẫn ngoài bằng HTTP GET (hỗ trợ timeout, redirect).
     */
    private String fetchExternalCalendar(String url) throws Exception {
        if (url == null || url.isBlank()) return null;
        java.net.URI uri = java.net.URI.create(url.trim());
        java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(6))
                .followRedirects(java.net.http.HttpClient.Redirect.NORMAL)
                .build();

        java.net.http.HttpRequest httpRequest = java.net.http.HttpRequest.newBuilder()
                .uri(uri)
                .timeout(java.time.Duration.ofSeconds(6))
                .header("User-Agent", "StayAway-PMS-CalendarBot/1.0")
                .GET()
                .build();

        java.net.http.HttpResponse<String> response = client.send(httpRequest, java.net.http.HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new RuntimeException("Tải lịch từ kênh thất bại: Mã HTTP " + response.statusCode());
        }
        return response.body();
    }

    /**
     * Tìm phòng vật lý khả dụng của loại phòng để gán cho lượt chặn.
     */
    private Room findAvailableRoom(Long roomTypeId, LocalDate start, LocalDate end) {
        List<Room> rooms = roomRepository.findByRoomTypeId(roomTypeId);
        for (Room r : rooms) {
            if (r.getStatus() == RoomStatus.MAINTENANCE) {
                continue;
            }
            List<Booking> conflicts = bookingRepository.findConflictingBookings(r.getId(), start, end, -1L);
            if (!conflicts.isEmpty()) {
                continue;
            }
            List<ChannelRoomBlock> blockConflicts = channelRoomBlockRepository.findConflictingBlocks(r.getId(), start, end);
            if (!blockConflicts.isEmpty()) {
                continue;
            }
            return r;
        }
        return null;
    }

    /**
     * Phân tích cú pháp chuỗi iCalendar RFC 5545 trích xuất danh sách sự kiện VEVENT.
     */
    public List<ParsedIcsEvent> parseIcsContent(String icsContent) {
        List<ParsedIcsEvent> events = new ArrayList<>();
        if (icsContent == null || icsContent.isBlank()) {
            return events;
        }

        String[] rawLines = icsContent.replace("\r\n", "\n").replace("\r", "\n").split("\n");
        List<String> lines = new ArrayList<>();
        for (String rawLine : rawLines) {
            if ((rawLine.startsWith(" ") || rawLine.startsWith("\t")) && !lines.isEmpty()) {
                int lastIdx = lines.size() - 1;
                lines.set(lastIdx, lines.get(lastIdx) + rawLine.substring(1));
            } else {
                lines.add(rawLine);
            }
        }

        boolean inVevent = false;
        String uid = null;
        LocalDate startDate = null;
        LocalDate endDate = null;
        String summary = null;
        String description = null;

        for (String line : lines) {
            String trimmed = line.trim();
            if ("BEGIN:VEVENT".equalsIgnoreCase(trimmed)) {
                inVevent = true;
                uid = null;
                startDate = null;
                endDate = null;
                summary = null;
                description = null;
            } else if ("END:VEVENT".equalsIgnoreCase(trimmed) && inVevent) {
                inVevent = false;
                if (startDate != null) {
                    if (endDate == null || !endDate.isAfter(startDate)) {
                        endDate = startDate.plusDays(1);
                    }
                    if (uid == null || uid.isBlank()) {
                        uid = "gen-" + UUID.randomUUID().toString().substring(0, 8);
                    }
                    events.add(ParsedIcsEvent.builder()
                            .uid(uid.trim())
                            .startDate(startDate)
                            .endDate(endDate)
                            .summary(summary != null ? summary.trim() : "Unavailable / Kênh giữ chỗ")
                            .description(description != null ? description.trim() : null)
                            .build());
                }
            } else if (inVevent) {
                int colonIdx = line.indexOf(':');
                if (colonIdx > 0) {
                    String propPart = line.substring(0, colonIdx).trim().toUpperCase();
                    String valPart = line.substring(colonIdx + 1).trim();

                    if (propPart.equals("UID")) {
                        uid = valPart;
                    } else if (propPart.startsWith("DTSTART")) {
                        startDate = parseIcsDate(valPart);
                    } else if (propPart.startsWith("DTEND")) {
                        endDate = parseIcsDate(valPart);
                    } else if (propPart.equals("SUMMARY")) {
                        summary = valPart;
                    } else if (propPart.equals("DESCRIPTION")) {
                        description = valPart;
                    }
                }
            }
        }
        return events;
    }

    private LocalDate parseIcsDate(String val) {
        if (val == null || val.isBlank()) return null;
        val = val.trim();
        try {
            if (val.length() == 8 && val.chars().allMatch(Character::isDigit)) {
                return LocalDate.parse(val, DateTimeFormatter.ofPattern("yyyyMMdd"));
            }
            if (val.endsWith("Z") && val.contains("T")) {
                java.time.Instant instant = java.time.Instant.parse(
                        val.substring(0, 4) + "-" + val.substring(4, 6) + "-" + val.substring(6, 11) + ":" +
                        val.substring(11, 13) + ":" + val.substring(13)
                );
                return instant.atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
            }
            if (val.contains("T") && val.length() >= 15) {
                String dateSub = val.substring(0, 8);
                return LocalDate.parse(dateSub, DateTimeFormatter.ofPattern("yyyyMMdd"));
            }
            if (val.length() >= 10 && val.charAt(4) == '-' && val.charAt(7) == '-') {
                return LocalDate.parse(val.substring(0, 10));
            }
        } catch (Exception e) {
            log.warn("Không thể parse ngày iCal '{}': {}", val, e.getMessage());
        }
        return null;
    }

    private ChannelRoomBlockResponse toBlockResponse(ChannelRoomBlock b) {
        return ChannelRoomBlockResponse.builder()
                .id(b.getId())
                .channelId(b.getChannel().getId())
                .channelName(b.getChannel().getName())
                .channelCode(b.getChannel().getChannelCode())
                .roomTypeId(b.getRoomType().getId())
                .roomTypeName(b.getRoomType().getName())
                .roomId(b.getRoom() != null ? b.getRoom().getId() : null)
                .roomNumber(b.getRoom() != null ? b.getRoom().getRoomNumber() : "Chưa gán")
                .externalUid(b.getExternalUid())
                .startDate(b.getStartDate())
                .endDate(b.getEndDate())
                .summary(b.getSummary())
                .status(b.getStatus())
                .convertedBookingId(b.getConvertedBooking() != null ? b.getConvertedBooking().getId() : null)
                .isExcess(b.getIsExcess())
                .warningMessage(b.getWarningMessage())
                .rejectReason(b.getRejectReason())
                .createdAt(b.getCreatedAt())
                .build();
    }

    private BookingResponse toBookingResponse(Booking b) {
        return BookingResponse.builder()
                .id(b.getId())
                .guestId(b.getGuest() != null ? b.getGuest().getId() : null)
                .guestName(b.getGuest() != null ? b.getGuest().getName() : "")
                .guestPhone(b.getGuest() != null ? b.getGuest().getPhone() : "")
                .guestEmail(b.getGuest() != null ? b.getGuest().getEmail() : "")
                .guestIdNumber(b.getGuest() != null ? b.getGuest().getIdNumber() : "")
                .roomTypeId(b.getRoomType() != null ? b.getRoomType().getId() : null)
                .roomTypeName(b.getRoomType() != null ? b.getRoomType().getName() : "")
                .roomId(b.getRoom() != null ? b.getRoom().getId() : null)
                .roomNumber(b.getRoom() != null ? b.getRoom().getRoomNumber() : "Chưa gán")
                .checkInDate(b.getCheckInDate())
                .checkOutDate(b.getCheckOutDate())
                .status(b.getStatus())
                .expectedPrice(b.getExpectedPrice())
                .actualPrice(b.getActualPrice())
                .source(b.getSource())
                .channelId(b.getChannel() != null ? b.getChannel().getId() : null)
                .channelName(b.getChannel() != null ? b.getChannel().getName() : null)
                .channelCode(b.getChannel() != null ? b.getChannel().getChannelCode() : null)
                .note(b.getNote())
                .createdAt(b.getCreatedAt())
                .build();
    }

    @Getter
    @Setter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ParsedIcsEvent {
        private String uid;
        private LocalDate startDate;
        private LocalDate endDate;
        private String summary;
        private String description;
    }

    @Getter
    @AllArgsConstructor
    public static class InboundSyncResult {
        private final int savedCount;
        private final int excessCount;
        private final List<String> warnings;
        private final String errorMessage;
    }

    private static class BlockedPeriod {
        final LocalDate startDate;
        final LocalDate endDate;

        BlockedPeriod(LocalDate startDate, LocalDate endDate) {
            this.startDate = startDate;
            this.endDate = endDate;
        }
    }

    private static class BlockedPeriodItem {
        final RoomType roomType;
        final String externalCode;
        final int allocatedRooms;
        final LocalDate startDate;
        final LocalDate endDate;

        BlockedPeriodItem(RoomType roomType, String externalCode, int allocatedRooms, LocalDate startDate, LocalDate endDate) {
            this.roomType = roomType;
            this.externalCode = externalCode;
            this.allocatedRooms = allocatedRooms;
            this.startDate = startDate;
            this.endDate = endDate;
        }
    }
}
