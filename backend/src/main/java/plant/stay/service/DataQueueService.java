package plant.stay.service;

import plant.stay.dto.response.DataTaskDto;
import plant.stay.model.User;

public interface DataQueueService {
    /**
     * Tiếp nhận yêu cầu nhập dữ liệu CSV vào hàng đợi xử lý ngầm
     */
    DataTaskDto submitImportTask(String type, byte[] fileBytes, String originalFileName, User actor);

    /**
     * Tiếp nhận yêu cầu trích xuất dữ liệu CSV vào hàng đợi xử lý ngầm
     */
    DataTaskDto submitExportTask(String type, User actor);

    /**
     * Tra cứu trạng thái và tiến độ của tác vụ theo mã taskId
     */
    DataTaskDto getTaskStatus(String taskId);

    /**
     * Lấy nội dung file CSV kết quả của tác vụ xuất dữ liệu
     */
    byte[] getExportFile(String taskId);

    /**
     * Lấy tên tệp xuất
     */
    String getExportFileName(String taskId);
}
