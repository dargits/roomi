package plant.stay.service;

import plant.stay.dto.response.StayDeclarationResponseDTO;
import plant.stay.model.User;

import java.time.LocalDate;

public interface StayDeclarationService {
    StayDeclarationResponseDTO getTodayDeclarations();

    StayDeclarationResponseDTO getDeclarationsForDate(LocalDate date);

    void completeDeclaration(Long bookingId, User actor);
}