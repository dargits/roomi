package plant.stay.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.dto.request.SeasonalPriceRequest;
import plant.stay.dto.response.MessageResponse;
import plant.stay.dto.response.SeasonalPriceResponse;
import plant.stay.exception.UnauthorizedException;
import plant.stay.model.Role;
import plant.stay.model.User;
import plant.stay.service.SeasonalPriceService;
import plant.stay.util.AuthUtil;

import java.util.List;

@RestController
@RequestMapping("/api/v1/room-types/{roomTypeId}/seasonal-prices")
@CrossOrigin("*")
@RequiredArgsConstructor
public class SeasonalPriceController {

    private final SeasonalPriceService seasonalPriceService;
    private final AuthUtil authUtil;

    @GetMapping
    public ResponseEntity<List<SeasonalPriceResponse>> getAll(@PathVariable Long roomTypeId,
                                                              HttpServletRequest request) {
        checkOwner(request);
        return ResponseEntity.ok(seasonalPriceService.getByRoomType(roomTypeId));
    }

    @PostMapping
    public ResponseEntity<SeasonalPriceResponse> create(@PathVariable Long roomTypeId,
                                                        @Valid @RequestBody SeasonalPriceRequest req,
                                                        HttpServletRequest request) {
        checkOwner(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(seasonalPriceService.create(roomTypeId, req));
    }

    @PutMapping("/{priceId}")
    public ResponseEntity<SeasonalPriceResponse> update(@PathVariable Long roomTypeId,
                                                        @PathVariable Long priceId,
                                                        @Valid @RequestBody SeasonalPriceRequest req,
                                                        HttpServletRequest request) {
        checkOwner(request);
        return ResponseEntity.ok(seasonalPriceService.update(roomTypeId, priceId, req));
    }

    @DeleteMapping("/{priceId}")
    public ResponseEntity<MessageResponse> delete(@PathVariable Long roomTypeId,
                                                  @PathVariable Long priceId,
                                                  HttpServletRequest request) {
        checkOwner(request);
        return ResponseEntity.ok(seasonalPriceService.delete(roomTypeId, priceId));
    }

    private void checkOwner(HttpServletRequest request) {
        User user = authUtil.getUserFromRequest(request);
        if (user == null || user.getRole() != Role.OWNER)
            throw new UnauthorizedException("Chỉ OWNER mới có quyền thực hiện chức năng này");
    }
}
