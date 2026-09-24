package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.InventoryItemRequest;
import plant.stay.dto.response.InventoryItemResponse;
import plant.stay.dto.response.MessageResponse;
import plant.stay.exception.ResourceNotFoundException;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.InventoryItem;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.repository.InventoryItemRepository;
import plant.stay.util.AuthUtil;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/inventory-items")
@CrossOrigin("*")
@RequiredArgsConstructor
public class InventoryItemController {

    private final InventoryItemRepository inventoryItemRepository;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false, defaultValue = "id") String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String direction,
            HttpServletRequest request) {
        checkStaffOrOwner(request);
        if (page != null) {
            int pageSize = (size != null && size > 0) ? size : 15;
            Sort.Direction dir = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
            Pageable pageable = PageRequest.of(page, pageSize, Sort.by(dir, sortBy));
            return ResponseEntity.ok(inventoryItemRepository.findAll(pageable).map(this::toResponse));
        }
        return ResponseEntity.ok(inventoryItemRepository.findAll().stream()
                .map(this::toResponse).collect(Collectors.toList()));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<InventoryItemResponse>> getLowStock(HttpServletRequest request) {
        checkStaffOrOwner(request);
        return ResponseEntity.ok(inventoryItemRepository.findLowStock().stream()
                .map(this::toResponse).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<InventoryItemResponse> create(@Valid @RequestBody InventoryItemRequest req,
                                                        HttpServletRequest request) {
        checkOwner(request);
        InventoryItem item = InventoryItem.builder()
                .name(req.getName()).unit(req.getUnit())
                .quantityOnHand(req.getQuantityOnHand())
                .lowStockThreshold(req.getLowStockThreshold())
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(inventoryItemRepository.save(item)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventoryItemResponse> update(@PathVariable Long id,
                                                        @Valid @RequestBody InventoryItemRequest req,
                                                        HttpServletRequest request) {
        checkOwner(request);
        InventoryItem item = inventoryItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mặt hàng"));
        item.setName(req.getName());
        item.setUnit(req.getUnit());
        item.setQuantityOnHand(req.getQuantityOnHand());
        item.setLowStockThreshold(req.getLowStockThreshold());
        return ResponseEntity.ok(toResponse(inventoryItemRepository.save(item)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> delete(@PathVariable Long id, HttpServletRequest request) {
        checkOwner(request);
        inventoryItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mặt hàng"));
        inventoryItemRepository.deleteById(id);
        return ResponseEntity.ok(new MessageResponse("Đã xóa mặt hàng"));
    }

    @DeleteMapping("/bulk")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<MessageResponse> bulkDelete(@RequestBody List<Long> ids, HttpServletRequest request) {
        checkOwner(request);
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Danh sách ID cần xóa rỗng"));
        }
        for (Long id : ids) {
            try {
                inventoryItemRepository.deleteById(id);
            } catch (Exception ex) {
                // Ignore individual deletion error if item in use
            }
        }
        return ResponseEntity.ok(new MessageResponse("Đã xóa thành công các mặt hàng đã chọn"));
    }

    private void checkOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || (user.getRole() != Role.OWNER && user.getRole() != Role.ADMIN))
            throw new UnauthorizedException("Chỉ Quản trị viên hoặc Chủ cơ sở mới có quyền thực hiện chức năng này");
    }

    private void checkStaffOrOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || user.getRole() == Role.CUSTOMER || user.getRole() == Role.NONE)
            throw new UnauthorizedException("Vui lòng đăng nhập bằng tài khoản quản lý / nhân viên");
    }

    private InventoryItemResponse toResponse(InventoryItem item) {
        return InventoryItemResponse.builder()
                .id(item.getId()).name(item.getName()).unit(item.getUnit())
                .quantityOnHand(item.getQuantityOnHand())
                .lowStockThreshold(item.getLowStockThreshold())
                .lowStock(item.getQuantityOnHand() <= item.getLowStockThreshold())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
