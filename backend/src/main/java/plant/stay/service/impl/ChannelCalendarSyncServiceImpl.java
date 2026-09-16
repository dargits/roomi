package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
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
import plant.stay.event.CalendarSyncEvent;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.ChannelCalendarSyncService;

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
    private final AuditLogService auditLogService;

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
        // Xóa bảng ánh xạ và nhật ký liên quan trước để tránh lỗi ràng buộc khóa ngoại
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
        return syncLogRepository.findTop50ByOrderBySyncedAtDesc()
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
        List<ChannelRoomMapping> mappings = channelRoomMappingRepository.findByChannelId(channel.getId());
        if (mappings.isEmpty() && channel.getRoomType() != null) {
            mappings = List.of(ChannelRoomMapping.builder()
                    .channel(channel)
                    .roomType(channel.getRoomType())
                    .externalRoomTypeCode(channel.getChannelCode() + "_" + channel.getRoomType().getId())
                    .allocatedRooms(channel.getAllocatedRooms() != null ? channel.getAllocatedRooms() : 1)
                    .build());
        }

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

        // Sinh chuỗi iCalendar RFC 5545
        String icsContent = buildIcsContent(channel, allBlockedPeriods);

        channel.setCachedIcsContent(icsContent);
        channel.setLastSyncedAt(LocalDateTime.now());
        channel.setLastBlockedPeriodsCount(allBlockedPeriods.size());
        channelRepository.save(channel);

        // Ghi nhật ký sinh tệp
        String roomTypeNames = mappings.stream().map(m -> m.getRoomType().getName()).distinct().collect(Collectors.joining(", "));
        String blockedSummary = summarizeBlockedPeriods(allBlockedPeriods);

        ChannelCalendarSyncLog syncLog = ChannelCalendarSyncLog.builder()
                .channel(channel)
                .channelName(channel.getName())
                .roomTypeName(roomTypeNames.isEmpty() ? "N/A" : roomTypeNames)
                .triggeredBy(triggeredBy)
                .blockedPeriodsCount(allBlockedPeriods.size())
                .blockedSummary(blockedSummary)
                .status("SUCCESS")
                .syncedAt(LocalDateTime.now())
                .build();

        syncLogRepository.save(syncLog);

        log.info("Synced iCal feed for channel '{}' (ID: {}). Blocked periods: {}, Triggered by: {}",
                channel.getName(), channel.getId(), allBlockedPeriods.size(), triggeredBy);
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
                .lastBlockedPeriodsCount(channel.getLastBlockedPeriodsCount())
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
