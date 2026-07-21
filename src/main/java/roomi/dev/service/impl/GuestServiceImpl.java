package roomi.dev.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomi.dev.dto.request.GuestRequest;
import roomi.dev.dto.response.GuestResponse;
import roomi.dev.exception.BusinessException;
import roomi.dev.exception.ErrorCode;
import roomi.dev.model.Guest;
import roomi.dev.repository.GuestRepository;
import roomi.dev.service.GuestService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GuestServiceImpl implements GuestService {

    private final GuestRepository guestRepository;

    // ------------------------------------------------------------------ CRUD

    @Override
    public GuestResponse createGuest(GuestRequest request) {
        if (request.getPhone() != null && !request.getPhone().isBlank()
                && guestRepository.existsByPhone(request.getPhone())) {
            throw new BusinessException("Số điện thoại đã được đăng ký cho khách khác", ErrorCode.INVALID_INPUT);
        }

        Guest guest = Guest.builder()
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .idNumber(request.getIdNumber())
                .note(request.getNote())
                .build();

        return toResponse(guestRepository.save(guest));
    }

    @Override
    public GuestResponse updateGuest(Long id, GuestRequest request) {
        Guest guest = findById(id);

        // Nếu đổi SĐT thì kiểm tra trùng với khách khác
        boolean phoneChanged = request.getPhone() != null
                && !request.getPhone().isBlank()
                && !request.getPhone().equals(guest.getPhone());

        if (phoneChanged && guestRepository.existsByPhone(request.getPhone())) {
            throw new BusinessException("Số điện thoại đã được đăng ký cho khách khác", ErrorCode.INVALID_INPUT);
        }

        guest.setFullName(request.getFullName());
        guest.setPhone(request.getPhone());
        guest.setEmail(request.getEmail());
        guest.setIdNumber(request.getIdNumber());
        guest.setNote(request.getNote());

        return toResponse(guestRepository.save(guest));
    }

    @Override
    public void deleteGuest(Long id) {
        guestRepository.delete(findById(id));
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

    public Guest findById(Long id) {
        return guestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy khách hàng", ErrorCode.GUEST_NOT_FOUND));
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
}
