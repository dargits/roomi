package plant.stay.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import plant.stay.service.ChannelCalendarSyncService;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/public/calendar")
@CrossOrigin("*")
@RequiredArgsConstructor
@Slf4j
public class PublicCalendarController {

    private final ChannelCalendarSyncService channelCalendarSyncService;

    /**
     * Endpoint công khai phục vụ tệp lịch .ics theo chuẩn RFC 5545 cho các nền tảng OTA
     * (Airbnb, Booking.com, Agoda, Google Calendar,...) crawl bằng HTTP GET.
     * Sử dụng feedToken khó đoán bảo mật, phản hồi trực tiếp từ cache với độ trễ thấp nhất.
     */
    @GetMapping(value = "/feeds/{feedToken}.ics", produces = "text/calendar; charset=utf-8")
    public ResponseEntity<byte[]> getIcsFeed(@PathVariable String feedToken) {
        log.info("Public iCal feed request received for token prefix: {}...",
                feedToken != null && feedToken.length() > 8 ? feedToken.substring(0, 8) : "invalid");

        String icsContent = channelCalendarSyncService.getIcsFeedContent(feedToken);

        byte[] bytes = icsContent.getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/calendar; charset=utf-8")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"calendar.ics\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.EXPIRES, "0")
                .contentLength(bytes.length)
                .body(bytes);
    }

    /**
     * Kiểm tra phòng trống theo kênh công khai (dành cho website, booking portal hoặc OTA tra cứu nhanh)
     */
    @GetMapping("/channels/{id}/check-availability")
    public ResponseEntity<plant.stay.dto.response.ChannelAvailabilityCheckResponse> checkPublicAvailability(
            @PathVariable Long id,
            @RequestParam(required = false) Long roomTypeId,
            @RequestParam(required = false) String externalRoomTypeCode,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate checkInDate,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate checkOutDate) {
        return ResponseEntity.ok(channelCalendarSyncService.checkAvailability(
                id, roomTypeId, externalRoomTypeCode, checkInDate, checkOutDate));
    }
}
