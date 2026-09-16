package plant.stay.service.impl;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.CreateLostItemRequest;
import plant.stay.dto.request.DisposeLostItemRequest;
import plant.stay.dto.request.ReturnLostItemRequest;
import plant.stay.dto.response.LostItemLogResponse;
import plant.stay.dto.response.LostItemResponse;
import plant.stay.dto.response.LostItemSummaryResponse;
import plant.stay.exception.BusinessException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.LostItemService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LostItemServiceImpl implements LostItemService {

    private final LostItemRepository lostItemRepository;
    private final LostItemLogRepository lostItemLogRepository;
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final HotelSettingRepository hotelSettingRepository;

    @Override
    @Transactional
    public LostItemResponse create(CreateLostItemRequest request, User actor) {
        if (actor == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập");
        }

        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin phòng ID: " + request.getRoomId()));

        // Tự động tìm booking gần nhất vừa checkout (hoặc đang lưu trú) của phòng này
        List<Booking> recentStays = bookingRepository.findRecentStaysForRoom(room.getId(), PageRequest.of(0, 1));
        Booking linkedBooking = recentStays.isEmpty() ? null : recentStays.get(0);

        // Lấy cấu hình số ngày lưu giữ tối đa
        int retentionDays = 30;
        try {
            HotelSetting setting = hotelSettingRepository.findById(1L).orElse(null);
            if (setting != null && setting.getLostItemRetentionDays() != null) {
                retentionDays = setting.getLostItemRetentionDays();
            }
        } catch (Exception e) {
            log.warn("Không đọc được cấu hình lostItemRetentionDays, dùng mặc định 30 ngày: {}", e.getMessage());
        }

        LocalDate foundDate = request.getFoundDate() != null ? request.getFoundDate() : LocalDate.now();
        LocalTime foundTime = request.getFoundTime() != null ? request.getFoundTime() : LocalTime.now();
        LocalDate expiryDate = foundDate.plusDays(retentionDays);

        LostItem lostItem = LostItem.builder()
                .room(room)
                .booking(linkedBooking)
                .itemName(request.getItemName().trim())
                .foundLocation(request.getFoundLocation().trim())
                .foundDate(foundDate)
                .foundTime(foundTime)
                .storageLocation(request.getStorageLocation() != null ? request.getStorageLocation().trim() : null)
                .imageUrl(request.getImageUrl())
                .status(LostItemStatus.HOLDING)
                .retentionExpiryDate(expiryDate)
                .createdBy(actor)
                .build();

        LostItem saved = lostItemRepository.save(lostItem);

        // Ghi log khởi tạo
        String note = request.getNotes();
        if (linkedBooking != null && linkedBooking.getGuest() != null) {
            note = (note != null && !note.isBlank() ? note + " | " : "") +
                    "Tự động liên kết khách: " + linkedBooking.getGuest().getName() + " (" + linkedBooking.getGuest().getPhone() + ")";
        }

        LostItemLog createLog = LostItemLog.builder()
                .lostItem(saved)
                .action("CREATED")
                .previousStatus(null)
                .newStatus(LostItemStatus.HOLDING)
                .notes(note)
                .performedBy(actor)
                .build();
        lostItemLogRepository.save(createLog);

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LostItemResponse> getAll(Long roomId, LostItemStatus status, LocalDate fromDate, LocalDate toDate,
                                         String keyword, Boolean isExpired, Pageable pageable) {
        Specification<LostItem> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (roomId != null) {
                predicates.add(cb.equal(root.get("room").get("id"), roomId));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("foundDate"), fromDate));
            }

            if (toDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("foundDate"), toDate));
            }

            if (Boolean.TRUE.equals(isExpired)) {
                predicates.add(cb.equal(root.get("status"), LostItemStatus.HOLDING));
                predicates.add(cb.lessThan(root.get("retentionExpiryDate"), LocalDate.now()));
            }

            if (keyword != null && !keyword.trim().isEmpty()) {
                String searchPattern = "%" + keyword.trim().toLowerCase() + "%";
                Join<LostItem, Room> roomJoin = root.join("room", JoinType.LEFT);
                Join<LostItem, Booking> bookingJoin = root.join("booking", JoinType.LEFT);
                Join<Booking, Guest> guestJoin = bookingJoin.join("guest", JoinType.LEFT);

                Predicate nameMatch = cb.like(cb.lower(root.get("itemName")), searchPattern);
                Predicate locMatch = cb.like(cb.lower(root.get("foundLocation")), searchPattern);
                Predicate roomMatch = cb.like(cb.lower(roomJoin.get("roomNumber")), searchPattern);
                Predicate guestNameMatch = cb.like(cb.lower(guestJoin.get("name")), searchPattern);
                Predicate guestPhoneMatch = cb.like(cb.lower(guestJoin.get("phone")), searchPattern);
                Predicate receiverMatch = cb.like(cb.lower(root.get("receiverName")), searchPattern);

                predicates.add(cb.or(nameMatch, locMatch, roomMatch, guestNameMatch, guestPhoneMatch, receiverMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return lostItemRepository.findAll(spec, pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public LostItemResponse getById(Long id) {
        LostItem item = lostItemRepository.findDetailById(id);
        if (item == null) {
            item = lostItemRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đồ để quên với ID: " + id));
        }
        return mapToResponse(item);
    }

    @Override
    @Transactional
    public LostItemResponse markContacted(Long id, String notes, User actor) {
        validateStaffOperation(actor);
        LostItem item = lostItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đồ để quên với ID: " + id));

        if (item.getStatus() == LostItemStatus.RETURNED || item.getStatus() == LostItemStatus.DISPOSED) {
            throw new BusinessException("Không thể chuyển sang trạng thái Đã liên hệ vì món đồ đã ở trạng thái " + item.getStatus());
        }

        LostItemStatus oldStatus = item.getStatus();
        item.setStatus(LostItemStatus.CONTACTED);
        LostItem saved = lostItemRepository.save(item);

        LostItemLog logEntry = LostItemLog.builder()
                .lostItem(saved)
                .action("CONTACTED_GUEST")
                .previousStatus(oldStatus)
                .newStatus(LostItemStatus.CONTACTED)
                .notes(notes != null && !notes.isBlank() ? notes : "Đã liên hệ với khách hàng để thông báo về món đồ để quên")
                .performedBy(actor)
                .build();
        lostItemLogRepository.save(logEntry);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public LostItemResponse returnToGuest(Long id, ReturnLostItemRequest request, User actor) {
        validateStaffOperation(actor);
        LostItem item = lostItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đồ để quên với ID: " + id));

        if (item.getStatus() == LostItemStatus.RETURNED) {
            throw new BusinessException("Món đồ này đã được bàn giao cho khách trước đó");
        }
        if (item.getStatus() == LostItemStatus.DISPOSED) {
            throw new BusinessException("Món đồ đã được xử lý theo chính sách quá hạn, không thể bàn giao");
        }

        LostItemStatus oldStatus = item.getStatus();
        item.setStatus(LostItemStatus.RETURNED);
        item.setReceiverName(request.getReceiverName().trim());
        item.setReceiverPhone(request.getReceiverPhone() != null ? request.getReceiverPhone().trim() : null);
        item.setReceiverNote(request.getReceiverNote() != null ? request.getReceiverNote().trim() : null);
        item.setReturnedAt(LocalDateTime.now());
        item.setReturnedBy(actor);

        LostItem saved = lostItemRepository.save(item);

        String noteContent = "Bàn giao cho: " + request.getReceiverName();
        if (request.getReceiverPhone() != null && !request.getReceiverPhone().isBlank()) {
            noteContent += " (SĐT: " + request.getReceiverPhone() + ")";
        }
        if (request.getReceiverNote() != null && !request.getReceiverNote().isBlank()) {
            noteContent += " - Ghi chú: " + request.getReceiverNote();
        }

        LostItemLog logEntry = LostItemLog.builder()
                .lostItem(saved)
                .action("RETURNED_TO_GUEST")
                .previousStatus(oldStatus)
                .newStatus(LostItemStatus.RETURNED)
                .notes(noteContent)
                .performedBy(actor)
                .build();
        lostItemLogRepository.save(logEntry);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public LostItemResponse disposeItem(Long id, DisposeLostItemRequest request, User actor) {
        validateStaffOperation(actor);
        LostItem item = lostItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đồ để quên với ID: " + id));

        if (item.getStatus() == LostItemStatus.RETURNED) {
            throw new BusinessException("Món đồ đã được bàn giao cho khách, không thể xử lý quá hạn");
        }
        if (item.getStatus() == LostItemStatus.DISPOSED) {
            throw new BusinessException("Món đồ này đã được xử lý trước đó");
        }

        LostItemStatus oldStatus = item.getStatus();
        item.setStatus(LostItemStatus.DISPOSED);
        item.setDisposalMethod(request.getDisposalMethod().trim());
        item.setDisposalNote(request.getDisposalNote() != null ? request.getDisposalNote().trim() : null);
        item.setDisposedAt(LocalDateTime.now());
        item.setDisposedBy(actor);

        LostItem saved = lostItemRepository.save(item);

        String noteContent = "Hình thức xử lý: " + request.getDisposalMethod();
        if (request.getDisposalNote() != null && !request.getDisposalNote().isBlank()) {
            noteContent += " - Lý do/Chi tiết: " + request.getDisposalNote();
        }

        LostItemLog logEntry = LostItemLog.builder()
                .lostItem(saved)
                .action("DISPOSED")
                .previousStatus(oldStatus)
                .newStatus(LostItemStatus.DISPOSED)
                .notes(noteContent)
                .performedBy(actor)
                .build();
        lostItemLogRepository.save(logEntry);

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LostItemLogResponse> getLogsByLostItemId(Long id) {
        if (!lostItemRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy đồ để quên với ID: " + id);
        }
        return lostItemLogRepository.findByLostItemIdOrderByCreatedAtAsc(id).stream()
                .map(this::mapLogToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public LostItemSummaryResponse getSummary() {
        long holding = lostItemRepository.countByStatus(LostItemStatus.HOLDING);
        long contacted = lostItemRepository.countByStatus(LostItemStatus.CONTACTED);
        long returned = lostItemRepository.countByStatus(LostItemStatus.RETURNED);
        long disposed = lostItemRepository.countByStatus(LostItemStatus.DISPOSED);
        long expiredHolding = lostItemRepository.countExpiredHoldingItems(LocalDate.now());

        return LostItemSummaryResponse.builder()
                .totalHolding(holding)
                .totalContacted(contacted)
                .totalReturned(returned)
                .totalDisposed(disposed)
                .totalExpiredHolding(expiredHolding)
                .build();
    }

    private void validateStaffOperation(User actor) {
        if (actor == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập");
        }
        if (actor.getRole() != Role.OWNER && actor.getRole() != Role.ADMIN && actor.getRole() != Role.RECEPTIONIST) {
            throw new UnauthorizedException("Chỉ Lễ tân hoặc Quản lý mới có quyền thực hiện thao tác này");
        }
    }

    private LostItemResponse mapToResponse(LostItem item) {
        boolean isExpired = item.getStatus() == LostItemStatus.HOLDING
                && item.getRetentionExpiryDate() != null
                && item.getRetentionExpiryDate().isBefore(LocalDate.now());

        LostItemResponse.LostItemResponseBuilder builder = LostItemResponse.builder()
                .id(item.getId())
                .itemName(item.getItemName())
                .foundLocation(item.getFoundLocation())
                .foundDate(item.getFoundDate())
                .foundTime(item.getFoundTime())
                .storageLocation(item.getStorageLocation())
                .imageUrl(item.getImageUrl())
                .status(item.getStatus())
                .retentionExpiryDate(item.getRetentionExpiryDate())
                .isExpired(isExpired)
                .receiverName(item.getReceiverName())
                .receiverPhone(item.getReceiverPhone())
                .receiverNote(item.getReceiverNote())
                .returnedAt(item.getReturnedAt())
                .disposalMethod(item.getDisposalMethod())
                .disposalNote(item.getDisposalNote())
                .disposedAt(item.getDisposedAt())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt());

        if (item.getRoom() != null) {
            builder.roomId(item.getRoom().getId())
                    .roomNumber(item.getRoom().getRoomNumber());
            if (item.getRoom().getRoomType() != null) {
                builder.roomTypeName(item.getRoom().getRoomType().getName());
            }
        }

        if (item.getBooking() != null) {
            Booking b = item.getBooking();
            builder.bookingId(b.getId())
                    .checkInDate(b.getCheckInDate())
                    .checkOutDate(b.getCheckOutDate())
                    .checkedOutAt(b.getCheckedOutAt());
            if (b.getGuest() != null) {
                builder.guestId(b.getGuest().getId())
                        .guestName(b.getGuest().getName())
                        .guestPhone(b.getGuest().getPhone())
                        .guestEmail(b.getGuest().getEmail());
            }
        }

        if (item.getReturnedBy() != null) {
            builder.returnedById(item.getReturnedBy().getId())
                    .returnedByName(item.getReturnedBy().getName() != null ? item.getReturnedBy().getName() : item.getReturnedBy().getAccount());
        }

        if (item.getDisposedBy() != null) {
            builder.disposedById(item.getDisposedBy().getId())
                    .disposedByName(item.getDisposedBy().getName() != null ? item.getDisposedBy().getName() : item.getDisposedBy().getAccount());
        }

        if (item.getCreatedBy() != null) {
            builder.createdById(item.getCreatedBy().getId())
                    .createdByName(item.getCreatedBy().getName() != null ? item.getCreatedBy().getName() : item.getCreatedBy().getAccount());
        }

        return builder.build();
    }

    private LostItemLogResponse mapLogToResponse(LostItemLog log) {
        return LostItemLogResponse.builder()
                .id(log.getId())
                .lostItemId(log.getLostItem().getId())
                .action(log.getAction())
                .previousStatus(log.getPreviousStatus())
                .newStatus(log.getNewStatus())
                .notes(log.getNotes())
                .performedById(log.getPerformedBy() != null ? log.getPerformedBy().getId() : null)
                .performedByName(log.getPerformedBy() != null ?
                        (log.getPerformedBy().getName() != null ? log.getPerformedBy().getName() : log.getPerformedBy().getAccount()) : "Hệ thống")
                .createdAt(log.getCreatedAt())
                .build();
    }
}
