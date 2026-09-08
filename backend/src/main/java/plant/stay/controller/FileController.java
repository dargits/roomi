package plant.stay.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import plant.stay.service.FileService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/files")
@CrossOrigin("*")
public class FileController {

    @Autowired
    private FileService fileService;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        String fileUrl = fileService.storeFile(file);
        
        Map<String, String> response = new HashMap<>();
        response.put("url", fileUrl);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/upload-multiple")
    public ResponseEntity<Map<String, java.util.List<String>>> uploadMultipleFiles(@RequestParam("files") MultipartFile[] files) {
        java.util.List<String> fileUrls = fileService.storeFiles(files);
        
        Map<String, java.util.List<String>> response = new HashMap<>();
        response.put("urls", fileUrls);
        
        return ResponseEntity.ok(response);
    }
}
