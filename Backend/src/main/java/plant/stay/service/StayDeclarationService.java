package plant.stay.service;

import plant.stay.dto.response.StayDeclarationResponseDTO;
import plant.stay.model.Role;
import plant.stay.model.User;

import java.time.LocalDate;

public interface StayDeclarationService {
    /** Lấy danh sách khai báo hôm nay, mask số giấy tờ theo vai trò actor. */
    StayDeclarationResponseDTO getTodayDeclarations(Role actorRole);

    /** Lấy danh sách khai báo theo ngày cụ thể, mask theo vai trò. */
    StayDeclarationResponseDTO getDeclarationsForDate(LocalDate date, Role actorRole);

    /** Đánh dấu đã khai báo xong cho một booking. */
    void completeDeclaration(Long bookingId, User actor);

    /**
     * Kết xuất file Excel và ghi AuditLog lần kết xuất (NCL-12-CN-003).
     * File Excel cũng áp mask số giấy tờ theo vai trò.
     */
    byte[] exportAndLogDeclarations(LocalDate date, User actor);
}