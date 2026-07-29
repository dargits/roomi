package roomi.dev.dto.request;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;

import lombok.Data;

@Data
public class DateRangeRequest {
 @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
 private LocalDate startDate;

 @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
 private LocalDate endDate;
}
