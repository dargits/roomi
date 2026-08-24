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

    /** Lấy lịch sử lưu trú trong khoảng ngày kèm tìm kiếm/lọc, mask theo vai trò. */
    StayDeclarationResponseDTO getDeclarationHistory(LocalDate fromDate,
                                                     LocalDate toDate,
                                                     String keyword,
                                                     String declarationStatus,
                                                     String documentStatus,
                                                     Role actorRole);

    /** Đánh dấu đã khai báo xong cho một booking. */
    void completeDeclaration(Long bookingId, User actor);

    /**
     * Kết xuất file Excel và ghi AuditLog lần kết xuất (NCL-12-CN-003).
     * File Excel cũng áp mask số giấy tờ theo vai trò.
     */
    byte[] exportAndLogDeclarations(LocalDate date, User actor);

    /**
     * Kết xuất file Excel lịch sử lưu trú và ghi AuditLog.
     */
    byte[] exportAndLogHistory(LocalDate fromDate,
                               LocalDate toDate,
                               String keyword,
                               String declarationStatus,
                               String documentStatus,
                               User actor);
}
