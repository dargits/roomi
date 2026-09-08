package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.RoomIncidentReportRequest;
import plant.stay.dto.request.RoomIncidentResolveRequest;
import plant.stay.dto.response.RoomIncidentResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.RoomIncidentRepository;
import plant.stay.repository.RoomRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.RoomIncidentService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomIncidentServiceImpl implements RoomIncidentService {

    private final RoomIncidentRepository roomIncidentRepository;
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public RoomIncidentResponse reportIncident(RoomIncidentReportRequest req, User actor) {
        Room room = roomRepository.findById(req.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng #" + req.getRoomId()));

        int affectedCount = 0;

        // Nếu sự cố nặng hoặc không thể phục vụ: chuyển phòng sang MAINTENANCE (chờ xác nhận bảo trì)
        if (req.getSeverity() == IncidentSeverity.HEAVY || req.getSeverity() == IncidentSeverity.OUT_OF_SERVICE) {
            room.setStatus(RoomStatus.MAINTENANCE);
            roomRepository.save(room);

            // Kiểm tra các booking sắp tới gán phòng này
            List<Booking> affectedBookings = bookingRepository.findUpcomingBookingsForRoom(room.getId(), LocalDate.now());
            affectedCount = affectedBookings.size();
        }

        RoomIncident incident = RoomIncident.builder()
                .room(room)
                .severity(req.getSeverity())
                .description(req.getDescription())
                .status(IncidentStatus.OPEN)
                .reportedBy(actor)
                .affectedBookingsCount(affectedCount)
                .build();

        incident = roomIncidentRepository.save(incident);

        String msg = "Nhân viên buồng phòng " + actor.getName() + " báo sự cố ("
                + req.getSeverity() + ") cho phòng " + room.getRoomNumber()
                + ": " + req.getDescription();
        if (affectedCount > 0) {
            msg += " [CẢNH BÁO: Có " + affectedCount + " đặt phòng sắp tới bị ảnh hưởng cần đổi phòng!]";
        }
        auditLogService.log("RoomIncident", incident.getId(), "REPORT_INCIDENT", actor, msg);

        return toDto(incident);
    }

    @Override
    @Transactional
    public RoomIncidentResponse resolveIncident(Long incidentId, RoomIncidentResolveRequest req, User actor) {
        RoomIncident incident = roomIncidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sự cố #" + incidentId));

        if (incident.getStatus() == IncidentStatus.RESOLVED) {
            throw new IllegalArgumentException("Sự cố này đã được xử lý trước đó");
        }

        incident.setStatus(IncidentStatus.RESOLVED);
        incident.setResolvedBy(actor);
        incident.setResolvedAt(LocalDateTime.now());
        incident.setResolutionNote(req.getResolutionNote());
        incident = roomIncidentRepository.save(incident);

        // Kiểm tra xem phòng còn sự cố HEAVY / OUT_OF_SERVICE nào đang OPEN không
        Room room = incident.getRoom();
        long openHeavyIncidents = roomIncidentRepository.findByRoomIdOrderByReportedAtDesc(room.getId()).stream()
                .filter(i -> i.getStatus() == IncidentStatus.OPEN && (i.getSeverity() == IncidentSeverity.HEAVY || i.getSeverity() == IncidentSeverity.OUT_OF_SERVICE))
                .count();

        // Nếu phòng đang ở MAINTENANCE và không còn sự cố nặng nào mở, chuyển về DIRTY để dọn lại hoặc sẵn sàng
        if (room.getStatus() == RoomStatus.MAINTENANCE && openHeavyIncidents == 0) {
            room.setStatus(RoomStatus.DIRTY);
            roomRepository.save(room);
        }

        auditLogService.log("RoomIncident", incident.getId(), "RESOLVE_INCIDENT", actor,
                "Chủ cơ sở " + actor.getName() + " đã xử lý xong sự cố phòng " + room.getRoomNumber()
                + ", ghi chú: " + req.getResolutionNote());

        return toDto(incident);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomIncidentResponse> getIncidents(IncidentStatus status, Long roomId) {
        List<RoomIncident> list;
        if (roomId != null) {
            list = roomIncidentRepository.findByRoomIdOrderByReportedAtDesc(roomId);
            if (status != null) {
                list = list.stream().filter(i -> i.getStatus() == status).collect(Collectors.toList());
            }
        } else {
            list = roomIncidentRepository.findByStatusFilter(status);
        }
        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RoomIncidentResponse getIncidentById(Long id) {
        return roomIncidentRepository.findById(id).map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sự cố #" + id));
    }

    private RoomIncidentResponse toDto(RoomIncident i) {
        return RoomIncidentResponse.builder()
                .id(i.getId())
                .roomId(i.getRoom() != null ? i.getRoom().getId() : null)
                .roomNumber(i.getRoom() != null ? i.getRoom().getRoomNumber() : null)
                .severity(i.getSeverity())
                .description(i.getDescription())
                .status(i.getStatus())
                .reportedByName(i.getReportedBy() != null ? i.getReportedBy().getName() : null)
                .reportedAt(i.getReportedAt())
                .resolvedByName(i.getResolvedBy() != null ? i.getResolvedBy().getName() : null)
                .resolvedAt(i.getResolvedAt())
                .resolutionNote(i.getResolutionNote())
                .affectedBookingsCount(i.getAffectedBookingsCount())
                .build();
    }
}
