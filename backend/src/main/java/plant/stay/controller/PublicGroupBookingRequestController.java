package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.GroupBookingRoomRequest;
import plant.stay.dto.request.GroupBookingRequest;
import plant.stay.dto.request.PublicGroupBookingRequestDTO;
import plant.stay.dto.response.GroupBookingResponse;
import plant.stay.dto.response.PublicGroupBookingRequestResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.*;
import plant.stay.repository.PublicGroupBookingRequestRepository;
import plant.stay.repository.GroupBookingRepository;
import plant.stay.repository.RoomTypeRepository;
import plant.stay.service.GroupBookingService;
import plant.stay.util.AuthUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/public/group-booking-requests")
@CrossOrigin("*")
@RequiredArgsConstructor
public class PublicGroupBookingRequestController {

    private final PublicGroupBookingRequestRepository requestRepository;
    private final GroupBookingRepository groupBookingRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final GroupBookingService groupBookingService;
    private final AuthUtil authUtil;

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody PublicGroupBookingRequestDTO dto) {
        if (!dto.getCheckOutDate().isAfter(dto.getCheckInDate())) {
            throw new IllegalArgumentException("Ngày trả phòng phải sau ngày nhận phòng");
        }

        PublicGroupBookingRequest request = PublicGroupBookingRequest.builder()
                .representativeName(dto.getRepresentativeName().trim())
                .phone(dto.getPhone().trim())
                .email(blankToNull(dto.getEmail()))
                .checkInDate(dto.getCheckInDate())
                .checkOutDate(dto.getCheckOutDate())
                .note(blankToNull(dto.getNote()))
                .status(PublicGroupBookingRequestStatus.PENDING)
                .rooms(new ArrayList<>())
                .build();

        for (GroupBookingRoomRequest room : dto.getRooms()) {
            RoomType roomType = roomTypeRepository.findById(room.getRoomTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại phòng"));
            if (!roomType.isActive()) {
                throw new IllegalArgumentException("Loại phòng " + roomType.getName() + " hiện không hoạt động");
            }
            request.getRooms().add(PublicGroupBookingRequestRoom.builder()
                    .request(request)
                    .roomType(roomType)
                    .quantity(room.getQuantity())
                    .build());
        }

        PublicGroupBookingRequest savedRequest = requestRepository.save(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", savedRequest.getId(),
                "status", savedRequest.getStatus().name(),
                "message", "Yêu cầu đặt phòng đoàn đã được gửi"
        ));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @GetMapping
    public ResponseEntity<List<PublicGroupBookingRequestResponse>> getAll(HttpServletRequest request) {
        checkStaff(request);
        return ResponseEntity.ok(requestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList()));
    }

    @PutMapping("/{id}/approve")
    @Transactional
    public ResponseEntity<PublicGroupBookingRequestResponse> approve(@PathVariable Long id, HttpServletRequest request) {
        User actor = checkStaff(request);
        PublicGroupBookingRequest publicRequest = findPending(id);
        GroupBookingRequest groupRequest = new GroupBookingRequest();
        groupRequest.setRepresentativeName(publicRequest.getRepresentativeName());
        groupRequest.setRepresentativePhone(publicRequest.getPhone());
        groupRequest.setRepresentativeEmail(publicRequest.getEmail());
        groupRequest.setCheckInDate(publicRequest.getCheckInDate());
        groupRequest.setCheckOutDate(publicRequest.getCheckOutDate());
        groupRequest.setNote(publicRequest.getNote());
        groupRequest.setRooms(publicRequest.getRooms().stream().map(room -> {
            GroupBookingRoomRequest item = new GroupBookingRoomRequest();
            item.setRoomTypeId(room.getRoomType().getId());
            item.setQuantity(room.getQuantity());
            return item;
        }).collect(Collectors.toList()));

        GroupBookingResponse groupBooking = groupBookingService.create(groupRequest, actor);
        publicRequest.setStatus(PublicGroupBookingRequestStatus.APPROVED);
        publicRequest.setConvertedGroupBooking(groupBookingRepository.getReferenceById(groupBooking.getId()));
        return ResponseEntity.ok(toResponse(requestRepository.save(publicRequest)));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<PublicGroupBookingRequestResponse> reject(@PathVariable Long id,
                                                                      @RequestParam(required = false) String reason,
                                                                      HttpServletRequest request) {
        checkStaff(request);
        PublicGroupBookingRequest publicRequest = findPending(id);
        publicRequest.setStatus(PublicGroupBookingRequestStatus.REJECTED);
        publicRequest.setRejectReason(blankToNull(reason));
        return ResponseEntity.ok(toResponse(requestRepository.save(publicRequest)));
    }

    private PublicGroupBookingRequest findPending(Long id) {
        PublicGroupBookingRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy yêu cầu đặt phòng đoàn"));
        if (request.getStatus() != PublicGroupBookingRequestStatus.PENDING) {
            throw new IllegalArgumentException("Yêu cầu đoàn này không còn ở trạng thái chờ duyệt");
        }
        return request;
    }

    private User checkStaff(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN && user.getRole() != Role.RECEPTIONIST)) {
            throw new UnauthorizedException("Không có quyền truy cập");
        }
        return user;
    }

    private PublicGroupBookingRequestResponse toResponse(PublicGroupBookingRequest request) {
        return PublicGroupBookingRequestResponse.builder()
                .id(request.getId())
                .representativeName(request.getRepresentativeName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .note(request.getNote())
                .status(request.getStatus().name())
                .rejectReason(request.getRejectReason())
                .convertedGroupBookingId(request.getConvertedGroupBooking() != null ? request.getConvertedGroupBooking().getId() : null)
                .isDepositPaid(request.getConvertedGroupBooking() != null ? groupBookingService.getById(request.getConvertedGroupBooking().getId()).isDepositPaid() : false)
                .rooms(request.getRooms().stream().map(room -> PublicGroupBookingRequestResponse.RoomRequest.builder()
                        .roomTypeId(room.getRoomType().getId())
                        .roomTypeName(room.getRoomType().getName())
                        .quantity(room.getQuantity())
                        .build()).collect(Collectors.toList()))
                .createdAt(request.getCreatedAt())
                .build();
    }
}