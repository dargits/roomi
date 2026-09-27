package plant.stay.service;

import java.nio.file.Path;

/**
 * Service tích hợp lưu trữ tệp sao lưu đám mây qua Catbox.moe API.
 */
public interface CatboxService {

    /**
     * Tải tệp lên Catbox.moe và trả về liên kết công khai vĩnh viễn (https://files.catbox.moe/...).
     *
     * @param filePath Đường dẫn tệp tin cần upload
     * @param fileName Tên tệp tin hiển thị
     * @return URL tệp tin trên Catbox.moe
     */
    String uploadFile(Path filePath, String fileName);

    /**
     * Tải tệp từ URL Catbox.moe về đường dẫn đích trên máy chủ.
     *
     * @param fileUrl      URL trên Catbox.moe
     * @param destination  Đường dẫn tệp đích cần lưu
     */
    void downloadFile(String fileUrl, Path destination);

    /**
     * Tải nội dung tệp từ Catbox.moe dạng mảng byte.
     *
     * @param fileUrl URL trên Catbox.moe
     * @return Mảng byte của tệp tin
     */
    byte[] downloadFileBytes(String fileUrl);
}
