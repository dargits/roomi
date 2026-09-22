package plant.stay.service;

import org.springframework.web.multipart.MultipartFile;
import plant.stay.dto.response.BookingImportLogResponse;
import plant.stay.dto.response.LegacyBookingImportCommitResponse;
import plant.stay.dto.response.LegacyBookingImportPreviewResponse;
import plant.stay.model.User;

import java.util.List;

public interface LegacyBookingImportService {
    byte[] generateExcelTemplate();
    LegacyBookingImportPreviewResponse previewImport(MultipartFile file);
    LegacyBookingImportCommitResponse commitImport(MultipartFile file, User actor);
    List<BookingImportLogResponse> getImportHistory();
}
