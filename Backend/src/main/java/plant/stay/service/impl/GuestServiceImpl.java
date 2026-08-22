package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.request.GuestRequest;
import plant.stay.dto.response.GuestResponse;
import plant.stay.exception.DuplicateResourceException;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.*;
import plant.stay.service.AuditLogService;
import plant.stay.service.GuestService;

import java.util.List;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class GuestServiceImpl implements GuestService {

    private final GuestRepository guestRepository;
    private final BookingRepository bookingRepository;
    private final LoyaltyTierRepository loyaltyTierRepository;
    private final InvoiceRepository invoiceRepository;
    private final IdentityDocumentRepository identityDocumentRepository;
    private final AuditLogService auditLogService;


    @Override
    public List<GuestResponse> getAll(String search) {
        if (search != null && !search.isBlank()) {
            return guestRepository.search(search).stream().map(this::toResponse).collect(Collectors.toList());
        }
        return guestRepository.findAll(Sort.by(Sort.Direction.DESC, "id")).stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public GuestResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Override
    public GuestResponse getByIdNumber(String idNumber) {
        return guestRepository.findFirstByIdNumberOrderByIdDesc(idNumber)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách với CCCD: " + idNumber));
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

    /**
     * NCL-12-CN-005: Ẩn danh hóa (anonymize) dữ liệu cá nhân của khách theo yêu cầu xóa.
     * Quy trình:
     *   1. Kiểm tra không còn hóa đơn PENDING — nếu có thì từ chối và nêu rõ lý do.
     *   2. Xóa tất cả IdentityDocument liên quan.
     *   3. Anonymize in-place: name = "[Đã xóa]", phone/email/idNumber = null.
     *   4. Ghi AuditLog action DELETE_PERSONAL_DATA.
     */
    @Override
    @Transactional
    public void deletePersonalData(Long guestId, User actor) {
        Guest guest = findById(guestId);

        // Kiểm tra hóa đơn chưa quyết toán — QTN-24: không xóa khi còn ràng buộc
        List<Invoice> pendingInvoices = invoiceRepository.findByGuestIdAndStatusPending(guestId);
        if (!pendingInvoices.isEmpty()) {
            throw new IllegalStateException(
                "Không thể xóa dữ liệu: khách còn " + pendingInvoices.size()
                + " hóa đơn chưa quyết toán. Vui lòng hoàn tất thanh toán trước.");
        }

        // Xóa toàn bộ IdentityDocument (ảnh giấy tờ)
        identityDocumentRepository.deleteAll(
            identityDocumentRepository.findByGuestId(guestId));

        // Anonymize in-place — giữ FK booking/invoice không bị lỗi
        String oldName = guest.getName();
        guest.setName("[Đã xóa]");
        guest.setPhone(null);
        guest.setEmail(null);
        guest.setIdNumber(null);
        guestRepository.save(guest);

        // Ghi AuditLog — NCL-12-CN-006 trace được ai xóa
        auditLogService.log("GuestPersonalData", guestId, "DELETE_PERSONAL_DATA", actor,
            "Xóa dữ liệu cá nhân của khách #" + guestId + " (" + oldName + ") theo yêu cầu xóa dữ liệu cá nhân — Luật số 91/2025");
    }

    @Override
    @Transactional
    public void addIdentityDocument(Long guestId, plant.stay.dto.request.IdentityDocumentRequest request) {
        Guest guest = findById(guestId);

        if (request.getDocumentNumber() != null && !request.getDocumentNumber().isBlank()) {
            guest.setIdNumber(request.getDocumentNumber());
            guestRepository.save(guest);
        }

        // Check if a document of this type already exists for the guest
        IdentityDocument existingDoc = identityDocumentRepository
                .findByGuestIdAndDocumentType(guestId, request.getDocumentType())
                .orElse(null);

        if (existingDoc != null) {
            existingDoc.setDocumentNumber(request.getDocumentNumber());
            existingDoc.setImageUrl(request.getImageUrl());
            identityDocumentRepository.save(existingDoc);
        } else {
            IdentityDocument newDoc = IdentityDocument.builder()
                    .guest(guest)
                    .documentType(request.getDocumentType())
                    .documentNumber(request.getDocumentNumber())
                    .imageUrl(request.getImageUrl())
                    .verified(false)
                    .build();
            identityDocumentRepository.save(newDoc);
        }
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
    @Override
    @org.springframework.transaction.annotation.Transactional
    public void delete(Long id) {
        plant.stay.model.Guest guest = findById(id);
        if (!bookingRepository.findByGuestId(id).isEmpty()) {
            throw new IllegalArgumentException("Khách hàng đang có lịch sử đặt phòng, không thể xóa");
        }
        guestRepository.delete(guest);
    }

}
