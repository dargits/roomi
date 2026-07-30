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
    /**
     * Tìm khách theo SĐT hoặc CCCD/CMND; nếu chưa có thì tạo mới.
     * Kiểm tra đối soát chặt chẽ tránh xung đột dữ liệu giữa các khách hàng khác nhau.
     */
    @Override
    public Guest findOrCreateGuest(String idNumber, String fullName, String phone, String email, String note) {
        String cleanIdNumber = (idNumber != null && !idNumber.isBlank()) ? idNumber.trim() : null;
        String cleanPhone = (phone != null && !phone.isBlank()) ? phone.trim() : null;
        String cleanFullName = (fullName != null && !fullName.isBlank()) ? fullName.trim() : null;
        String cleanEmail = (email != null && !email.isBlank()) ? email.trim() : null;
        String cleanNote = (note != null && !note.isBlank()) ? note.trim() : null;

        // Tìm kiếm theo SĐT và CCCD
        var guestByPhone = (cleanPhone != null) ? guestRepository.findByPhone(cleanPhone) : java.util.Optional.<Guest>empty();
        var guestByIdNumber = (cleanIdNumber != null) ? guestRepository.findByIdNumber(cleanIdNumber) : java.util.Optional.<Guest>empty();

        // TH1: Cả SĐT và CCCD đều đã tồn tại nhưng thuộc 2 khách hàng khác nhau
        if (guestByPhone.isPresent() && guestByIdNumber.isPresent()) {
            Guest g1 = guestByPhone.get();
            Guest g2 = guestByIdNumber.get();
            if (!g1.getId().equals(g2.getId())) {
                throw new BusinessException(
                        "Số điện thoại (" + cleanPhone + ") và số CMND/CCCD (" + cleanIdNumber + ") thuộc về 2 khách hàng khác nhau trong hệ thống.",
                        ErrorCode.INVALID_INPUT);
            }
        }

        // TH2: Tìm thấy khách theo CCCD/CMND
        if (guestByIdNumber.isPresent()) {
            Guest g = guestByIdNumber.get();
            if (cleanPhone != null && !cleanPhone.equals(g.getPhone())) {
                if (g.getPhone() == null || g.getPhone().isBlank()) {
                    // Kiểm tra xem SĐT mới có bị trùng với người khác không
                    if (guestRepository.existsByPhone(cleanPhone)) {
                        throw new BusinessException(
                                "Số điện thoại " + cleanPhone + " đã được đăng ký cho một khách hàng khác.",
                                ErrorCode.INVALID_INPUT);
                    }
                    g.setPhone(cleanPhone);
                }
            }
            if (cleanFullName != null && (g.getFullName() == null || g.getFullName().isBlank())) g.setFullName(cleanFullName);
            if (cleanEmail != null && (g.getEmail() == null || g.getEmail().isBlank())) g.setEmail(cleanEmail);
            if (cleanNote != null && (g.getNote() == null || g.getNote().isBlank())) g.setNote(cleanNote);
            return guestRepository.save(g);
        }

        // TH3: Tìm thấy khách theo SĐT
        if (guestByPhone.isPresent()) {
            Guest g = guestByPhone.get();
            if (cleanIdNumber != null && !cleanIdNumber.equals(g.getIdNumber())) {
                if (g.getIdNumber() == null || g.getIdNumber().isBlank()) {
                    // Kiểm tra xem CCCD mới có bị trùng với người khác không
                    if (guestRepository.existsByIdNumber(cleanIdNumber)) {
                        throw new BusinessException(
                                "Số CMND/CCCD " + cleanIdNumber + " đã được đăng ký cho một khách hàng khác.",
                                ErrorCode.INVALID_INPUT);
                    }
                    g.setIdNumber(cleanIdNumber);
                }
            }
            if (cleanFullName != null && (g.getFullName() == null || g.getFullName().isBlank())) g.setFullName(cleanFullName);
            if (cleanEmail != null && (g.getEmail() == null || g.getEmail().isBlank())) g.setEmail(cleanEmail);
            if (cleanNote != null && (g.getNote() == null || g.getNote().isBlank())) g.setNote(cleanNote);
            return guestRepository.save(g);
        }

        // TH4: Khách hoàn toàn mới — kiểm tra lại tính duy nhất trước khi lưu
        if (cleanPhone != null && guestRepository.existsByPhone(cleanPhone)) {
            throw new BusinessException("Số điện thoại " + cleanPhone + " đã được đăng ký trong hệ thống", ErrorCode.INVALID_INPUT);
        }
        if (cleanIdNumber != null && guestRepository.existsByIdNumber(cleanIdNumber)) {
            throw new BusinessException("Số CMND/CCCD " + cleanIdNumber + " đã được đăng ký trong hệ thống", ErrorCode.INVALID_INPUT);
        }

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
        String loyaltyTier = getLoyaltyTier(g.getLoyaltyPoints());

        return GuestResponse.builder()
                .id(g.getId())
                .fullName(g.getFullName())
                .phone(g.getPhone())
                .email(g.getEmail())
                .idNumber(g.getIdNumber())
                .note(g.getNote())
                .loyaltyPoints(g.getLoyaltyPoints())
                .loyaltyTier(loyaltyTier)
                .loyaltyBenefits(getLoyaltyBenefits(loyaltyTier))
                .createdAt(g.getCreatedAt())
                .build();
    }

    private String getLoyaltyTier(Integer loyaltyPoints) {
        int points = loyaltyPoints == null ? 0 : Math.max(loyaltyPoints, 0);

        if (points >= 5000) {
            return "DIAMOND";
        }
        if (points >= 4000) {
            return "PLATINUM";
        }
        if (points >= 3000) {
            return "GOLD";
        }
        if (points >= 2000) {
            return "SILVER";
        }
        if (points >= 1000) {
            return "BRONZE";
        }
        return "MEMBER";
    }

    private List<String> getLoyaltyBenefits(String loyaltyTier) {
        return switch (loyaltyTier) {
            case "BRONZE" -> List.of("Giảm 2% giá phòng");
            case "SILVER" -> List.of("Giảm 5% giá phòng");
            case "GOLD" -> List.of("Giảm 8% giá phòng");
            case "PLATINUM" -> List.of("Giảm 10% giá phòng");
            case "DIAMOND" -> List.of("Giảm 15% giá phòng");
            default -> List.of();
        };
    }

    @Override
    public Guest findById1(Long id) {
        return findById(id);
    }
}