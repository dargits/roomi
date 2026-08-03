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

        // 1. Kiểm tra theo CCCD/CMND trước (Quy tắc bắt buộc: 1 CCCD <-> 1 Họ và tên duy nhất)
        if (cleanIdNumber != null) {
            var guestByIdOpt = guestRepository.findByIdNumber(cleanIdNumber);
            if (guestByIdOpt.isPresent()) {
                Guest g = guestByIdOpt.get();

                // Kiểm tra sự đồng nhất giữa Họ tên nhập vào và Họ tên đã lưu của CCCD này
                if (cleanFullName != null && !isSameName(cleanFullName, g.getFullName())) {
                    throw new BusinessException(
                            "Số CMND/CCCD " + cleanIdNumber + " đã được đăng ký trong hệ thống nhưng không khớp với Họ và tên đã cung cấp.",
                            ErrorCode.INVALID_INPUT);
                }

                // SĐT có thể thay đổi/cập nhật (trừ trường hợp SĐT mới bị trùng với khách hàng khác)
                if (cleanPhone != null && !cleanPhone.equals(g.getPhone())) {
                    var otherGuestWithPhone = guestRepository.findByPhone(cleanPhone);
                    if (otherGuestWithPhone.isPresent() && !otherGuestWithPhone.get().getId().equals(g.getId())) {
                        throw new BusinessException(
                                "Số điện thoại " + cleanPhone + " đã được đăng ký cho một khách hàng khác trong hệ thống.",
                                ErrorCode.INVALID_INPUT);
                    }
                    g.setPhone(cleanPhone);
                }

                // Cập nhật Email và Ghi chú nếu có thông tin mới
                if (cleanEmail != null && !cleanEmail.isBlank()) g.setEmail(cleanEmail);
                if (cleanNote != null && !cleanNote.isBlank()) g.setNote(cleanNote);

                return guestRepository.save(g);
            }
        }

        // 2. Tìm theo SĐT (nếu không tìm thấy theo CCCD hoặc không nhập CCCD)
        if (cleanPhone != null) {
            var guestByPhoneOpt = guestRepository.findByPhone(cleanPhone);
            if (guestByPhoneOpt.isPresent()) {
                Guest g = guestByPhoneOpt.get();

                // Kiểm tra đồng nhất Họ tên
                if (cleanFullName != null && !isSameName(cleanFullName, g.getFullName())) {
                    throw new BusinessException(
                            "Số điện thoại " + cleanPhone + " đã được đăng ký trong hệ thống nhưng không khớp với Họ và tên đã cung cấp.",
                            ErrorCode.INVALID_INPUT);
                }

                // Nếu bổ sung CCCD mới, kiểm tra tính duy nhất của CCCD đó
                if (cleanIdNumber != null) {
                    if (g.getIdNumber() != null && !g.getIdNumber().isBlank() && !g.getIdNumber().equals(cleanIdNumber)) {
                        var existingOwnerOfId = guestRepository.findByIdNumber(cleanIdNumber);
                        if (existingOwnerOfId.isPresent() && !existingOwnerOfId.get().getId().equals(g.getId())) {
                            throw new BusinessException(
                                    "Số CMND/CCCD " + cleanIdNumber + " đã được đăng ký cho một khách hàng khác trong hệ thống.",
                                    ErrorCode.INVALID_INPUT);
                        }
                    }
                    g.setIdNumber(cleanIdNumber);
                }

                if (cleanEmail != null && !cleanEmail.isBlank()) g.setEmail(cleanEmail);
                if (cleanNote != null && !cleanNote.isBlank()) g.setNote(cleanNote);

                return guestRepository.save(g);
            }
        }

        // 3. Khách hàng mới hoàn toàn (chưa từng có SĐT và CCCD trong hệ thống)
        Guest newGuest = Guest.builder()
                .fullName(cleanFullName)
                .phone(cleanPhone)
                .email(cleanEmail)
                .idNumber(cleanIdNumber)
                .note(cleanNote)
                .build();
        return guestRepository.save(newGuest);
    }

    private boolean isSameName(String name1, String name2) {
        if (name1 == null || name2 == null) return true;
        return name1.trim().equalsIgnoreCase(name2.trim());
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