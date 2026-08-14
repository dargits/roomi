package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.GuestRequest;
import plant.stay.dto.response.GuestResponse;
import plant.stay.exception.DuplicateResourceException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.Booking;
import plant.stay.model.Guest;
import plant.stay.model.LoyaltyTier;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.GuestRepository;
import plant.stay.repository.LoyaltyTierRepository;
import plant.stay.service.GuestService;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GuestServiceImpl implements GuestService {

    private final GuestRepository guestRepository;
    private final BookingRepository bookingRepository;
    private final LoyaltyTierRepository loyaltyTierRepository;

    @Override
    public List<GuestResponse> getAll(String search) {
        if (search != null && !search.isBlank()) {
            return guestRepository.search(search).stream().map(this::toResponse).collect(Collectors.toList());
        }
        return guestRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public GuestResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Override
    @Transactional
    public GuestResponse create(GuestRequest request) {
        if (request.getPhone() != null && guestRepository.findByPhone(request.getPhone()).isPresent()) {
            throw new DuplicateResourceException("Số điện thoại đã tồn tại trong hệ thống");
        }
        Guest guest = Guest.builder()
                .name(request.getName())
                .phone(request.getPhone())
                .idNumber(request.getIdNumber())
                .email(request.getEmail())
                .build();
        return toResponse(guestRepository.save(guest));
    }

    @Override
    @Transactional
    public GuestResponse update(Long id, GuestRequest request) {
        Guest guest = findById(id);
        if (request.getPhone() != null && !request.getPhone().equals(guest.getPhone())) {
            guestRepository.findByPhone(request.getPhone()).ifPresent(g -> {
                throw new DuplicateResourceException("Số điện thoại đã tồn tại trong hệ thống");
            });
        }
        guest.setName(request.getName());
        guest.setPhone(request.getPhone());
        guest.setIdNumber(request.getIdNumber());
        guest.setEmail(request.getEmail());
        return toResponse(guestRepository.save(guest));
    }

    @Override
    public List<?> getHistory(Long guestId) {
        findById(guestId);
        // Trả về danh sách booking của khách (lịch sử lưu trú)
        return bookingRepository.findByGuestId(guestId).stream()
                .map(b -> java.util.Map.of(
                        "bookingId", b.getId(),
                        "checkInDate", b.getCheckInDate(),
                        "checkOutDate", b.getCheckOutDate(),
                        "roomNumber", b.getRoom() != null ? b.getRoom().getRoomNumber() : "Chưa gán",
                        "status", b.getStatus().name()
                ))
                .collect(Collectors.toList());
    }

    // Cập nhật hạng loyalty cho khách dựa trên điểm tích lũy
    @Transactional
    public void recalculateLoyaltyTier(Guest guest) {
        List<LoyaltyTier> tiers = loyaltyTierRepository.findAllByOrderByMinPointsAsc();
        LoyaltyTier newTier = null;
        for (LoyaltyTier tier : tiers) {
            if (guest.getLoyaltyPoints() >= tier.getMinPoints()) {
                newTier = tier;
            }
        }
        guest.setLoyaltyTier(newTier);
        guestRepository.save(guest);
    }

    private Guest findById(Long id) {
        return guestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách với id: " + id));
    }

    public GuestResponse toResponse(Guest guest) {
        return GuestResponse.builder()
                .id(guest.getId())
                .name(guest.getName())
                .phone(guest.getPhone())
                .idNumber(guest.getIdNumber())
                .email(guest.getEmail())
                .loyaltyPoints(guest.getLoyaltyPoints())
                .loyaltyTierId(guest.getLoyaltyTier() != null ? guest.getLoyaltyTier().getId() : null)
                .loyaltyTierName(guest.getLoyaltyTier() != null ? guest.getLoyaltyTier().getName() : null)
                .createdAt(guest.getCreatedAt())
                .build();
    }
}
