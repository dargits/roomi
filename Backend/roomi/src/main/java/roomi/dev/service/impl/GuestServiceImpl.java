package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.dto.request.GuestRequest;
import roomi.dev.dto.response.GuestResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.Guest;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.GuestRepository;
import roomi.dev.service.GuestService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GuestServiceImpl implements GuestService {

    private final GuestRepository guestRepository;
    private final BookingRepository bookingRepository;

    // ------------------------------------------------------------------ CRUD

    @Override
    public GuestResponse createGuest(GuestRequest request) {
        if (request.getPhone() != null && !request.getPhone().isBlank()
                && guestRepository.existsByPhone(request.getPhone().trim())) {
            throw new BusinessException("Số điện thoại đã được đăng ký cho khách khác", ErrorCode.INVALID_INPUT);
        }

        if (request.getIdNumber() != null && !request.getIdNumber().isBlank()
                && guestRepository.existsByIdNumber(request.getIdNumber().trim())) {
            throw new BusinessException("Số CMND/CCCD đã được đăng ký cho khách khác", ErrorCode.INVALID_INPUT);
        }

        Guest guest = Guest.builder()
                .fullName(request.getFullName().trim())
                .phone(request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : null)
                .email(request.getEmail() != null && !request.getEmail().isBlank() ? request.getEmail().trim() : null)
                .idNumber(request.getIdNumber() != null && !request.getIdNumber().isBlank() ? request.getIdNumber().trim() : null)
                .note(request.getNote() != null && !request.getNote().isBlank() ? request.getNote().trim() : null)
                .build();

        return toResponse(guestRepository.save(guest));
    }

    @Override
    public GuestResponse updateGuest(Long id, GuestRequest request) {
        Guest guest = findById(id);

        boolean phoneChanged = request.getPhone() != null
                && !request.getPhone().isBlank()
                && !request.getPhone().trim().equals(guest.getPhone());

        if (phoneChanged && guestRepository.existsByPhone(request.getPhone().trim())) {
            throw new BusinessException("Số điện thoại đã được đăng ký cho khách khác", ErrorCode.INVALID_INPUT);
        }

        boolean idNumberChanged = request.getIdNumber() != null
                && !request.getIdNumber().isBlank()
                && !request.getIdNumber().trim().equals(guest.getIdNumber());

        if (idNumberChanged && guestRepository.existsByIdNumber(request.getIdNumber().trim())) {
            throw new BusinessException("Số CMND/CCCD đã được đăng ký cho khách khác", ErrorCode.INVALID_INPUT);
        }

        guest.setFullName(request.getFullName().trim());
        guest.setPhone(request.getPhone() != null && !request.getPhone().isBlank() ? request.getPhone().trim() : null);
        guest.setEmail(request.getEmail() != null && !request.getEmail().isBlank() ? request.getEmail().trim() : null);
        guest.setIdNumber(request.getIdNumber() != null && !request.getIdNumber().isBlank() ? request.getIdNumber().trim() : null);
        guest.setNote(request.getNote() != null && !request.getNote().isBlank() ? request.getNote().trim() : null);

        return toResponse(guestRepository.save(guest));
    }

    @Override
    public void deleteGuest(Long id) {
        Guest guest = findById(id);

        // Kiểm tra xem khách hàng này có đơn đặt phòng nào không
        var bookings = bookingRepository.findByGuestId(id);
        if (bookings != null && !bookings.isEmpty()) {
            throw new BusinessException(
                "Không thể xóa khách hàng này vì đang có lịch sử đặt phòng trong hệ thống.",
                ErrorCode.INVALID_INPUT
            );
        }

        guestRepository.delete(guest);
    }

    @Override
    public GuestResponse getGuestById(Long id) {
        return toResponse(findById(id));
    }

    @Override
    public List<GuestResponse> getAllGuests() {
        return guestRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<GuestResponse> searchByName(String name) {
        return guestRepository.findByFullNameContainingIgnoreCase(name).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public GuestResponse getGuestByPhone(String phone) {
        Guest guest = guestRepository.findByPhone(phone)
                .orElseThrow(() -> new BusinessException(
                        "Không tìm thấy khách với số điện thoại: " + phone, ErrorCode.GUEST_NOT_FOUND));
        return toResponse(guest);
    }

    // ------------------------------------------------------------------ helpers

    @Override
    public Guest findById(Long id) {
        return guestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy khách hàng", ErrorCode.GUEST_NOT_FOUND));
    }

    /**
     * Tìm Entity Guest theo số CCCD/CMND (idNumber).
     */
    @Override
    public Guest findByIdNumber(String idNumber) {
        return guestRepository.findByIdNumber(idNumber)
                .orElseThrow(() -> new BusinessException(
                        "Không tìm thấy khách hàng với CCCD: " + idNumber, ErrorCode.GUEST_NOT_FOUND));
    }

    /**
     * Tìm khách theo CCCD, nếu chưa có thì tạo mới.
     * Dùng khi tạo booking để tự động tạo khách mới nếu chưa tồn tại.
     */
    @Override
    public Guest findOrCreateGuest(String idNumber, String fullName, String phone, String email, String note) {
        String cleanIdNumber = (idNumber != null && !idNumber.isBlank()) ? idNumber.trim() : null;
        String cleanPhone = (phone != null && !phone.isBlank()) ? phone.trim() : null;
        String cleanFullName = (fullName != null && !fullName.isBlank()) ? fullName.trim() : null;
        String cleanEmail = (email != null && !email.isBlank()) ? email.trim() : null;
        String cleanNote = (note != null && !note.isBlank()) ? note.trim() : null;

        // 1. Tìm theo CCCD/CMND nếu có
        if (cleanIdNumber != null) {
            var guestById = guestRepository.findByIdNumber(cleanIdNumber);
            if (guestById.isPresent()) {
                Guest g = guestById.get();
                if (cleanFullName != null) g.setFullName(cleanFullName);
                if (cleanPhone != null) g.setPhone(cleanPhone);
                if (cleanEmail != null) g.setEmail(cleanEmail);
                if (cleanNote != null) g.setNote(cleanNote);
                return guestRepository.save(g);
            }
        }

        // 2. Tìm theo SĐT nếu chưa tìm thấy theo CCCD
        if (cleanPhone != null) {
            var guestByPhone = guestRepository.findByPhone(cleanPhone);
            if (guestByPhone.isPresent()) {
                Guest g = guestByPhone.get();
                if (cleanFullName != null) g.setFullName(cleanFullName);
                if (cleanIdNumber != null) g.setIdNumber(cleanIdNumber);
                if (cleanEmail != null) g.setEmail(cleanEmail);
                if (cleanNote != null) g.setNote(cleanNote);
                return guestRepository.save(g);
            }
        }

        // 3. Tạo mới nếu chưa tồn tại
        Guest newGuest = Guest.builder()
                .fullName(cleanFullName)
                .phone(cleanPhone)
                .email(cleanEmail)
                .idNumber(cleanIdNumber)
                .note(cleanNote)
                .build();
        return guestRepository.save(newGuest);
    }

    private GuestResponse toResponse(Guest g) {
        return GuestResponse.builder()
                .id(g.getId())
                .fullName(g.getFullName())
                .phone(g.getPhone())
                .email(g.getEmail())
                .idNumber(g.getIdNumber())
                .note(g.getNote())
                .loyaltyPoints(g.getLoyaltyPoints())
                .createdAt(g.getCreatedAt())
                .build();
    }

    @Override
    public Guest findById1(Long id) {
        return findById(id);
    }
}