package plant.stay.service;

import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface FileService {
    String storeFile(MultipartFile file);
    List<String> storeFiles(MultipartFile[] files);
}
