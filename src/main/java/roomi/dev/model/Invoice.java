package roomi.dev.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoices")
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;
    
    @Column(name = "room_charge", nullable = false, precision = 12)
    private BigDecimal roomCharge;
    
    @Builder.Default
    @Column(name = "service_charge", nullable = false, precision = 12)
    private BigDecimal serviceCharge = BigDecimal.ZERO;
    
    @Builder.Default
    @Column(nullable = false, precision = 12)
    private BigDecimal discount = BigDecimal.ZERO;
    
    @Column(name = "total_amount", nullable = false, precision = 12)
    private BigDecimal totalAmount;
    
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private Status status = Status.PENDING;
    
    @ManyToOne
    @JoinColumn(name = "original_invoice_id")
    private Invoice originalInvoice;
    
    @Column(name = "adjustment_reason")
    private String adjustmentReason;
    
    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    public enum Status {
        PENDING, PAID
    }
}