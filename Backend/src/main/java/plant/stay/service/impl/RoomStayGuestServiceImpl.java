package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.RoomStayGuestCreateDto;
import plant.stay.dto.response.RoomStayGuestResponseDto;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.RoomStayGuestRepository;
import plant.stay.service.AuditLogService;
import plant.stay.service.RoomStayGuestService;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomStayGuestServiceImpl implements RoomStayGuestService {

    private final RoomStayGuestRepository roomStayGuestRepository;
    private final BookingRepository bookingRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public List<RoomStayGuestResponseDto> getStayingGuests(Long bookingId, User actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đặt phòng #" + bookingId));

        List<RoomStayGuest> list = roomStayGuestRepository.findByBookingIdOrderByCreatedAtAsc(bookingId);

        // Nếu chưa có ai trong room_stay_guests nhưng booking có guest chính, tự khởi tạo người đứng tên
        if (list.isEmpty() && booking.getGuest() != null) {
            Guest mainGuest = booking.getGuest();
            RoomStayGuest primary = RoomStayGuest.builder()
                    .booking(booking)
                    .fullName(mainGuest.getName())
                    .documentType("CCCD")
                    .documentNumber(mainGuest.getIdNumber())
                    .isPrimaryGuest(true)
                    .isChild(false)
                    .checkInAt(booking.getCheckedInAt() != null ? booking.getCheckedInAt() : LocalDateTime.now())
                    .build();
            primary = roomStayGuestRepository.save(primary);
            list.add(primary);
        }

        boolean canViewFullDocs = actor.getRole() == Role.OWNER || actor.getRole() == Role.ADMIN || actor.getRole() == Role.RECEPTIONIST;

        return list.stream().map(g -> toDto(g, canViewFullDocs)).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RoomStayGuestResponseDto addStayingGuest(Long bookingId, RoomStayGuestCreateDto dto, User actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đặt phòng #" + bookingId));

        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalArgumentException("Chỉ có thể thêm khách cùng phòng khi đặt phòng đang ở trạng thái CHECKED_IN!");
        }

        RoomType roomType = booking.getRoomType();
        int maxCap = roomType.getMaxCapacity() != null ? roomType.getMaxCapacity() : 2;

        long currentStayingCount = roomStayGuestRepository.countByBookingIdAndLeftEarlyAtIsNull(bookingId);

        if (currentStayingCount + 1 > maxCap) {
            throw new IllegalArgumentException("Tổng số người ở (" + (currentStayingCount + 1)
                    + ") vượt quá sức chứa tối đa của phòng (" + maxCap
                    + " người). Vui lòng chuyển sang phòng lớn hơn hoặc đặt thêm phòng!");
        }

        // Kiểm tra độ tuổi trẻ em
        boolean isChild = Boolean.TRUE.equals(dto.getIsChild());
        int maxChildAge = roomType.getMaxChildAgeFree() != null ? roomType.getMaxChildAgeFree() : 6;
        if (dto.getBirthYear() != null) {
            int age = Year.now().getValue() - dto.getBirthYear();
            if (age <= maxChildAge) {
                isChild = true;
            }
        }

        RoomStayGuest coOccupant = RoomStayGuest.builder()
                .booking(booking)
                .fullName(dto.getFullName().trim())
                .birthYear(dto.getBirthYear())
                .documentType(dto.getDocumentType() != null ? dto.getDocumentType() : "CCCD")
                .documentNumber(dto.getDocumentNumber() != null ? dto.getDocumentNumber().trim() : null)
                .isChild(isChild)
                .isPrimaryGuest(false)
                .checkInAt(LocalDateTime.now())
                .build();

        coOccupant = roomStayGuestRepository.save(coOccupant);

        auditLogService.log("RoomStayGuest", coOccupant.getId(), "ADD_CO_OCCUPANT", actor,
                "Lễ tân " + actor.getName() + " thêm khách cùng phòng: " + coOccupant.getFullName()
                + " (" + (coOccupant.getIsChild() ? "Trẻ em" : "Người lớn") + ") vào phòng "
                + (booking.getRoom() != null ? booking.getRoom().getRoomNumber() : "")
                + " (Booking #" + booking.getId() + ")");

        return toDto(coOccupant, true);
    }

    @Override
    @Transactional
    public RoomStayGuestResponseDto markLeftEarly(Long bookingId, Long guestId, User actor) {
        RoomStayGuest guest = roomStayGuestRepository.findById(guestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách cùng phòng #" + guestId));

        if (!guest.getBooking().getId().equals(bookingId)) {
            throw new IllegalArgumentException("Khách này không thuộc đặt phòng #" + bookingId);
        }

        if (guest.getLeftEarlyAt() != null) {
            throw new IllegalArgumentException("Khách đã được đánh dấu rời sớm trước đó lúc " + guest.getLeftEarlyAt());
        }

        guest.setLeftEarlyAt(LocalDateTime.now());
        guest = roomStayGuestRepository.save(guest);

        auditLogService.log("RoomStayGuest", guest.getId(), "MARK_LEFT_EARLY", actor,
                "Lễ tân " + actor.getName() + " đánh dấu khách " + guest.getFullName()
                + " rời phòng sớm lúc " + guest.getLeftEarlyAt() + " (Booking #" + bookingId + ")");

        return toDto(guest, true);
    }

    @Override
    @Transactional
    public void removeStayingGuest(Long bookingId, Long guestId, User actor) {
        RoomStayGuest guest = roomStayGuestRepository.findById(guestId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách cùng phòng #" + guestId));

        if (!guest.getBooking().getId().equals(bookingId)) {
            throw new IllegalArgumentException("Khách này không thuộc đặt phòng #" + bookingId);
        }

        // Quy tắc bảo toàn dữ liệu lưu trú: Không cho xóa người đã nằm trong tờ khai lưu trú đã xuất
        if (Boolean.TRUE.equals(guest.getIsExported())) {
            throw new IllegalArgumentException("Không thể xóa khách này vì đã nằm trong bản khai báo lưu trú đã kết xuất tới cơ quan quản lý! Vui lòng sử dụng tính năng 'Đánh dấu rời sớm'.");
        }

        if (Boolean.TRUE.equals(guest.getIsPrimaryGuest())) {
            throw new IllegalArgumentException("Không thể xóa người đứng tên chính của đặt phòng!");
        }

        roomStayGuestRepository.delete(guest);

        auditLogService.log("RoomStayGuest", guestId, "REMOVE_CO_OCCUPANT", actor,
                "Lễ tân " + actor.getName() + " đã xóa khách cùng phòng: " + guest.getFullName()
                + " khỏi Booking #" + bookingId);
    }

    private RoomStayGuestResponseDto toDto(RoomStayGuest g, boolean canViewFullDocs) {
        String docNum = g.getDocumentNumber();
        if (!canViewFullDocs && docNum != null && docNum.length() > 4) {
            docNum = docNum.substring(0, docNum.length() - 4).replaceAll(".", "*") + docNum.substring(docNum.length() - 4);
        }

        return RoomStayGuestResponseDto.builder()
                .id(g.getId())
                .bookingId(g.getBooking().getId())
                .fullName(g.getFullName())
                .birthYear(g.getBirthYear())
                .documentType(g.getDocumentType())
                .documentNumber(docNum)
                .isChild(g.getIsChild())
                .isPrimaryGuest(g.getIsPrimaryGuest())
                .checkInAt(g.getCheckInAt())
                .leftEarlyAt(g.getLeftEarlyAt())
                .isExported(g.getIsExported())
                .isCurrentlyStaying(g.getLeftEarlyAt() == null)
                .build();
    }
}
