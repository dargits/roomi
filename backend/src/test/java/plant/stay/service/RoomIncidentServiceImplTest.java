package plant.stay.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import plant.stay.dto.request.RoomIncidentReportRequest;
import plant.stay.dto.request.RoomIncidentResolveRequest;
import plant.stay.dto.response.RoomIncidentResponse;
import plant.stay.model.*;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.RoomCleaningRecordRepository;
import plant.stay.repository.RoomIncidentRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.service.impl.RoomIncidentServiceImpl;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class RoomIncidentServiceImplTest {

    private RoomIncidentRepository roomIncidentRepository;
    private RoomRepository roomRepository;
    private BookingRepository bookingRepository;
    private AuditLogService auditLogService;
    private NotificationService notificationService;
    private ApplicationEventPublisher eventPublisher;
    private RoomCleaningRecordRepository roomCleaningRecordRepository;
    private RoomIncidentServiceImpl roomIncidentService;

    private User mockStaff;
    private Room mockRoom;
    private RoomType mockRoomType;

    @BeforeEach
    public void setUp() {
        roomIncidentRepository = mock(RoomIncidentRepository.class);
        roomRepository = mock(RoomRepository.class);
        bookingRepository = mock(BookingRepository.class);
        auditLogService = mock(AuditLogService.class);
        notificationService = mock(NotificationService.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        roomCleaningRecordRepository = mock(RoomCleaningRecordRepository.class);

        roomIncidentService = new RoomIncidentServiceImpl(
                roomIncidentRepository,
                roomRepository,
                bookingRepository,
                auditLogService,
                notificationService,
                eventPublisher,
                roomCleaningRecordRepository
        );

        mockStaff = new User();
        mockStaff.setId(3L);
        mockStaff.setName("Housekeeper 1");
        mockStaff.setRole(Role.HOUSEKEEPER);

        mockRoomType = new RoomType();
        mockRoomType.setId(1L);
        mockRoomType.setName("Standard Single");

        mockRoom = new Room();
        mockRoom.setId(101L);
        mockRoom.setRoomNumber("101");
        mockRoom.setRoomType(mockRoomType);
        mockRoom.setStatus(RoomStatus.AVAILABLE);
    }

    @Test
    @DisplayName("Test: reportIncident with LIGHT severity does not change room status to MAINTENANCE")
    public void testReportIncidentLightSeverity() {
        when(roomRepository.findById(101L)).thenReturn(Optional.of(mockRoom));

        RoomIncidentReportRequest req = new RoomIncidentReportRequest();
        req.setRoomId(101L);
        req.setSeverity(IncidentSeverity.LIGHT);
        req.setDescription("Bóng đèn phòng tắm chập chờn");

        when(roomIncidentRepository.save(any(RoomIncident.class))).thenAnswer(inv -> {
            RoomIncident i = inv.getArgument(0);
            i.setId(1L);
            return i;
        });

        RoomIncidentResponse res = roomIncidentService.reportIncident(req, mockStaff);

        assertNotNull(res);
        assertEquals(IncidentSeverity.LIGHT, res.getSeverity());
        assertEquals(RoomStatus.AVAILABLE, mockRoom.getStatus());
        verify(eventPublisher, never()).publishEvent(any());
        verify(roomRepository, never()).save(mockRoom);
    }

    @Test
    @DisplayName("Test: reportIncident with HEAVY severity changes room status to MAINTENANCE and emits event")
    public void testReportIncidentHeavySeverity() {
        when(roomRepository.findById(101L)).thenReturn(Optional.of(mockRoom));
        when(bookingRepository.findUpcomingBookingsForRoom(eq(101L), any())).thenReturn(Collections.emptyList());

        RoomIncidentReportRequest req = new RoomIncidentReportRequest();
        req.setRoomId(101L);
        req.setSeverity(IncidentSeverity.HEAVY);
        req.setDescription("Vỡ đường ống nước ngập sàn");

        when(roomIncidentRepository.save(any(RoomIncident.class))).thenAnswer(inv -> {
            RoomIncident i = inv.getArgument(0);
            i.setId(2L);
            return i;
        });

        RoomIncidentResponse res = roomIncidentService.reportIncident(req, mockStaff);

        assertNotNull(res);
        assertEquals(IncidentSeverity.HEAVY, res.getSeverity());
        assertEquals(RoomStatus.MAINTENANCE, mockRoom.getStatus());
        verify(roomRepository, times(1)).save(mockRoom);
        verify(eventPublisher, times(1)).publishEvent(any(plant.stay.event.CalendarSyncEvent.class));
        verify(auditLogService, times(1)).log(eq("RoomIncident"), eq(2L), eq("REPORT_INCIDENT"), eq(mockStaff), anyString());
    }

    @Test
    @DisplayName("Test: resolveIncident marks incident resolved and restores room to DIRTY when no heavy incidents remain")
    public void testResolveIncidentSuccess() {
        mockRoom.setStatus(RoomStatus.MAINTENANCE);

        RoomIncident incident = RoomIncident.builder()
                .id(5L)
                .room(mockRoom)
                .severity(IncidentSeverity.HEAVY)
                .status(IncidentStatus.OPEN)
                .build();

        when(roomIncidentRepository.findById(5L)).thenReturn(Optional.of(incident));
        when(roomIncidentRepository.save(any(RoomIncident.class))).thenAnswer(inv -> inv.getArgument(0));
        when(roomIncidentRepository.findByRoomIdOrderByReportedAtDesc(101L)).thenReturn(List.of(incident));

        RoomIncidentResolveRequest resolveReq = new RoomIncidentResolveRequest();
        resolveReq.setResolutionNote("Đã sửa xong đường ống");

        User owner = new User();
        owner.setId(1L);
        owner.setName("Owner");
        owner.setRole(Role.OWNER);

        RoomIncidentResponse res = roomIncidentService.resolveIncident(5L, resolveReq, owner);

        assertEquals(IncidentStatus.RESOLVED, res.getStatus());
        assertEquals(RoomStatus.DIRTY, mockRoom.getStatus());
        verify(roomRepository, times(1)).save(mockRoom);
        verify(eventPublisher, times(1)).publishEvent(any(plant.stay.event.CalendarSyncEvent.class));
    }
}
