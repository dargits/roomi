package plant.stay.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import plant.stay.dto.response.GuestStatusDTO;
import plant.stay.dto.response.StayDeclarationResponseDTO;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.model.*;
import plant.stay.repository.BookingRepository;
import plant.stay.repository.IdentityDocumentRepository;
import plant.stay.repository.StayDeclarationRepository;
import plant.stay.service.StayDeclarationService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StayDeclarationServiceImpl implements StayDeclarationService {

    private static final String COMPLETE = "COMPLETE";
    private static final String MISSING = "MISSING";

    private final BookingRepository bookingRepository;
    private final IdentityDocumentRepository identityDocumentRepository;
    private final StayDeclarationRepository stayDeclarationRepository;

    @Override
    @Transactional(readOnly = true)
    public StayDeclarationResponseDTO getTodayDeclarations() {
        return getDeclarationsForDate(LocalDate.now());
    }

    @Override
    @Transactional(readOnly = true)
    public StayDeclarationResponseDTO getDeclarationsForDate(LocalDate date) {
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to = date.plusDays(1).atStartOfDay();
        List<Booking> bookings = bookingRepository.findCheckedInWithGuestDocumentsBetween(from, to);
        Map<Long, List<IdentityDocument>> documentsByGuestId = identityDocumentRepository
            .findByGuestIdIn(bookings.stream().map(booking -> booking.getGuest().getId()).toList())
            .stream()
            .collect(Collectors.groupingBy(document -> document.getGuest().getId()));
        Map<Long, StayDeclaration> declarationsByBookingId = stayDeclarationRepository
            .findByBookingIdIn(bookings.stream().map(Booking::getId).toList())
            .stream()
            .collect(Collectors.toMap(declaration -> declaration.getBooking().getId(), declaration -> declaration));
        List<GuestStatusDTO> guests = bookings
                .stream()
            .map(booking -> toGuestStatus(booking,
                documentsByGuestId.getOrDefault(booking.getGuest().getId(), List.of()),
                declarationsByBookingId.get(booking.getId())))
                .toList();

        int missingDocumentGuests = (int) guests.stream()
                .filter(guest -> MISSING.equals(guest.getDocumentStatus()))
                .count();
        int pendingDeclarations = (int) guests.stream()
                .filter(guest -> StayDeclarationStatus.PENDING.name().equals(guest.getDeclarationStatus()))
                .count();

        return StayDeclarationResponseDTO.builder()
                .declarationDate(date)
                .totalGuests(guests.size())
                .completeGuests(guests.size() - missingDocumentGuests)
                .missingDocumentGuests(missingDocumentGuests)
                .pendingDeclarations(pendingDeclarations)
                .guests(guests)
                .build();
    }

    @Override
    @Transactional
    public void completeDeclaration(Long bookingId, User actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking với id: " + bookingId));
        if (booking.getCheckedInAt() == null) {
            throw new IllegalArgumentException("Chỉ có thể hoàn tất khai báo cho khách đã nhận phòng");
        }

        StayDeclaration declaration = stayDeclarationRepository.findByBookingId(bookingId)
                .orElseGet(() -> StayDeclaration.builder().booking(booking).build());
        declaration.setStatus(StayDeclarationStatus.COMPLETED);
        declaration.setCompletedBy(actor);
        declaration.setCompletedAt(LocalDateTime.now());
        stayDeclarationRepository.save(declaration);
        booking.setStayDeclaration(declaration);
    }

    private GuestStatusDTO toGuestStatus(Booking booking,
                                         List<IdentityDocument> identityDocuments,
                                         StayDeclaration declaration) {
        Guest guest = booking.getGuest();
        List<String> missingRequirements = new ArrayList<>();
        if (isBlank(guest.getName())) {
            missingRequirements.add("guest name");
        }
        if (isBlank(guest.getPhone())) {
            missingRequirements.add("phone number");
        }
        if (isBlank(guest.getIdNumber())) {
            missingRequirements.add("identity document number");
        }

        Set<IdentityDocumentType> uploadedDocuments = EnumSet.noneOf(IdentityDocumentType.class);
        for (IdentityDocument document : identityDocuments) {
            if (!isBlank(document.getImageUrl())) {
                uploadedDocuments.add(document.getDocumentType());
            }
        }
        boolean hasPassport = uploadedDocuments.contains(IdentityDocumentType.PASSPORT);
        boolean hasNationalId = uploadedDocuments.contains(IdentityDocumentType.NATIONAL_ID_FRONT)
                && uploadedDocuments.contains(IdentityDocumentType.NATIONAL_ID_BACK);
        if (!hasPassport && !hasNationalId) {
            missingRequirements.add("identity document images");
        }

        StayDeclarationStatus declarationStatus = declaration == null
                ? StayDeclarationStatus.PENDING
                : declaration.getStatus();

        return GuestStatusDTO.builder()
                .bookingId(booking.getId())
                .guestId(guest.getId())
                .guestName(guest.getName())
                .phone(guest.getPhone())
                .idNumber(guest.getIdNumber())
                .roomNumber(booking.getRoom() != null ? booking.getRoom().getRoomNumber() : null)
                .checkedInAt(booking.getCheckedInAt())
                .documentStatus(missingRequirements.isEmpty() ? COMPLETE : MISSING)
                .missingRequirements(missingRequirements)
                .declarationStatus(declarationStatus.name())
                .declarationCompletedAt(declaration != null ? declaration.getCompletedAt() : null)
                .build();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}