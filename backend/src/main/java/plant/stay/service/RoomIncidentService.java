package plant.stay.service;

import plant.stay.dto.request.RoomIncidentReportRequest;
import plant.stay.dto.request.RoomIncidentResolveRequest;
import plant.stay.dto.response.RoomIncidentResponse;
import plant.stay.model.IncidentStatus;
import plant.stay.model.User;

import java.util.List;

public interface RoomIncidentService {
    RoomIncidentResponse reportIncident(RoomIncidentReportRequest req, User actor);
    RoomIncidentResponse resolveIncident(Long incidentId, RoomIncidentResolveRequest req, User actor);
    List<RoomIncidentResponse> getIncidents(IncidentStatus status, Long roomId);
    RoomIncidentResponse getIncidentById(Long id);
}
