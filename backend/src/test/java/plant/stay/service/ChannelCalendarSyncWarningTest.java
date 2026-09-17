package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import plant.stay.dto.response.ChannelCalendarSyncLogResponse;
import plant.stay.dto.response.ChannelResponse;
import plant.stay.dto.response.ChannelWarningSummaryResponse;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.impl.ChannelCalendarSyncServiceImpl;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChannelCalendarSyncWarningTest {

    @Mock
    private ChannelRepository channelRepository;

    @Mock
    private ChannelRoomMappingRepository channelRoomMappingRepository;

    @Mock
    private ChannelRoomBlockRepository channelRoomBlockRepository;

    @Mock
    private ChannelCalendarSyncLogRepository syncLogRepository;

    @Mock
    private RoomTypeRepository roomTypeRepository;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ChannelCalendarSyncServiceImpl channelCalendarSyncService;

    private Channel healthyChannel;
    private Channel disconnectedChannel;
    private Channel staleChannel;
    private Channel pausedChannel;
    private RoomType roomType;
    private User ownerUser;

    @BeforeEach
    void setUp() {
        ownerUser = User.builder().id(1L).account("owner").name("Chủ cơ sở").role(Role.OWNER).build();

        roomType = RoomType.builder().id(10L).name("Phòng Deluxe").build();

        healthyChannel = Channel.builder()
                .id(1L)
                .name("Airbnb - Deluxe")
                .channelCode("AIRBNB")
                .feedToken("token-healthy-123")
                .syncIntervalMinutes(15)
                .isActive(true)
                .lastSyncedAt(LocalDateTime.now().minusMinutes(5))
                .lastSuccessSyncedAt(LocalDateTime.now().minusMinutes(5))
                .lastSyncStatus("SUCCESS")
                .lastSyncErrorMessage(null)
                .consecutiveFailures(0)
                .build();

        disconnectedChannel = Channel.builder()
                .id(2L)
                .name("Booking.com - Standard")
                .channelCode("BOOKING_COM")
                .feedToken("token-disc-456")
                .syncIntervalMinutes(15)
                .isActive(true)
                .lastSyncedAt(LocalDateTime.now().minusMinutes(10))
                .lastSyncStatus("ERROR")
                .lastSyncErrorMessage("Lỗi kết nối URL lịch ngoài: HTTP 404")
                .consecutiveFailures(2)
                .build();

        staleChannel = Channel.builder()
                .id(3L)
                .name("Agoda - Suite")
                .channelCode("AGODA")
                .feedToken("token-stale-789")
                .syncIntervalMinutes(15)
                .isActive(true)
                .lastSyncedAt(LocalDateTime.now().minusHours(3))
                .lastSuccessSyncedAt(LocalDateTime.now().minusHours(3))
                .lastSyncStatus("SUCCESS")
                .consecutiveFailures(0)
                .build();

        pausedChannel = Channel.builder()
                .id(4L)
                .name("Trip.com - Double")
                .channelCode("TRIP_COM")
                .feedToken("token-paused-000")
                .syncIntervalMinutes(15)
                .isActive(false)
                .lastSyncedAt(LocalDateTime.now().minusDays(1))
                .lastSyncStatus("SUCCESS")
                .consecutiveFailures(0)
                .build();
    }

    @Test
    @DisplayName("1. Kênh đồng bộ thành công gần đây được đánh giá là HEALTHY")
    void testHealthyChannel() {
        when(channelRepository.findById(1L)).thenReturn(Optional.of(healthyChannel));
        when(channelRoomMappingRepository.findByChannelId(1L)).thenReturn(Collections.emptyList());

        ChannelResponse response = channelCalendarSyncService.getChannelById(1L);

        assertNotNull(response);
        assertEquals("HEALTHY", response.getConnectionStatus());
        assertTrue(response.getConnectionStatusMessage().contains("Kết nối ổn định"));
        assertEquals("SUCCESS", response.getLastSyncStatus());
        assertEquals(0, response.getConsecutiveFailures());
    }

    @Test
    @DisplayName("2. Kênh có lỗi đồng bộ gần nhất hoặc consecutiveFailures > 0 được đánh giá là DISCONNECTED")
    void testDisconnectedChannel() {
        when(channelRepository.findById(2L)).thenReturn(Optional.of(disconnectedChannel));
        when(channelRoomMappingRepository.findByChannelId(2L)).thenReturn(Collections.emptyList());

        ChannelResponse response = channelCalendarSyncService.getChannelById(2L);

        assertNotNull(response);
        assertEquals("DISCONNECTED", response.getConnectionStatus());
        assertTrue(response.getConnectionStatusMessage().contains("Mất kết nối"));
        assertTrue(response.getConnectionStatusMessage().contains("HTTP 404"));
        assertEquals("ERROR", response.getLastSyncStatus());
        assertEquals(2, response.getConsecutiveFailures());
    }

    @Test
    @DisplayName("3. Kênh quá hạn chu kỳ đồng bộ được đánh giá là STALE (Cảnh báo ngừng cập nhật)")
    void testStaleChannel() {
        when(channelRepository.findById(3L)).thenReturn(Optional.of(staleChannel));
        when(channelRoomMappingRepository.findByChannelId(3L)).thenReturn(Collections.emptyList());

        ChannelResponse response = channelCalendarSyncService.getChannelById(3L);

        assertNotNull(response);
        assertEquals("STALE", response.getConnectionStatus());
        assertTrue(response.getConnectionStatusMessage().contains("Cảnh báo ngừng cập nhật"));
        assertTrue(response.getConnectionStatusMessage().contains("Nguy cơ trùng phòng"));
    }

    @Test
    @DisplayName("4. Kênh đang tắt đồng bộ (isActive = false) được đánh giá là PAUSED")
    void testPausedChannel() {
        when(channelRepository.findById(4L)).thenReturn(Optional.of(pausedChannel));
        when(channelRoomMappingRepository.findByChannelId(4L)).thenReturn(Collections.emptyList());

        ChannelResponse response = channelCalendarSyncService.getChannelById(4L);

        assertNotNull(response);
        assertEquals("PAUSED", response.getConnectionStatus());
        assertEquals("Kênh đang tạm ngưng đồng bộ", response.getConnectionStatusMessage());
    }

    @Test
    @DisplayName("5. getWarningSummary tính toán chính xác tổng hợp số kênh và tỷ lệ đồng bộ 24h")
    void testWarningSummary() {
        when(channelRepository.findAll()).thenReturn(List.of(healthyChannel, disconnectedChannel, staleChannel, pausedChannel));
        when(channelRoomMappingRepository.findByChannelId(anyLong())).thenReturn(Collections.emptyList());
        when(syncLogRepository.countBySyncedAtAfter(any(LocalDateTime.class))).thenReturn(100L);
        when(syncLogRepository.countByStatusAndSyncedAtAfter(eq("SUCCESS"), any(LocalDateTime.class))).thenReturn(95L);

        ChannelWarningSummaryResponse summary = channelCalendarSyncService.getWarningSummary();

        assertNotNull(summary);
        assertEquals(4, summary.getTotalChannels());
        assertEquals(3, summary.getActiveChannels());
        assertEquals(1, summary.getHealthyChannels());
        assertEquals(1, summary.getDisconnectedChannels());
        assertEquals(1, summary.getStaleChannels());
        assertEquals(1, summary.getPausedChannels());
        assertTrue(summary.isHasWarning());
        assertEquals(2, summary.getWarningChannels().size());
        assertEquals(95.0, summary.getSyncSuccessRate24h());
        assertEquals(100L, summary.getTotalSyncs24h());
        assertEquals(5L, summary.getFailedSyncs24h());
    }

    @Test
    @DisplayName("6. Lọc nhật ký đồng bộ theo kênh, trạng thái và loại kích hoạt")
    void testGetLogsWithFilters() {
        ChannelCalendarSyncLog logEntry = ChannelCalendarSyncLog.builder()
                .id(101L)
                .channel(healthyChannel)
                .channelName("Airbnb - Deluxe")
                .roomTypeName("Phòng Deluxe")
                .triggeredBy("SCHEDULED_CYCLE")
                .blockedPeriodsCount(2)
                .blockedSummary("2026-09-20 -> 2026-09-23")
                .status("SUCCESS")
                .syncedAt(LocalDateTime.now())
                .build();

        when(syncLogRepository.findByFilters(1L, "SUCCESS", "SCHEDULED_CYCLE")).thenReturn(List.of(logEntry));

        List<ChannelCalendarSyncLogResponse> logs = channelCalendarSyncService.getLogs(1L, "SUCCESS", "SCHEDULED_CYCLE");

        assertNotNull(logs);
        assertEquals(1, logs.size());
        assertEquals("Airbnb - Deluxe", logs.get(0).getChannelName());
        assertEquals("SUCCESS", logs.get(0).getStatus());
        assertEquals("SCHEDULED_CYCLE", logs.get(0).getTriggeredBy());
    }
}
