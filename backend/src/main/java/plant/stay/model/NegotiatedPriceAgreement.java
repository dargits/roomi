package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "negotiated_price_agreements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NegotiatedPriceAgreement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corporate_client_id")
    private CorporateClient corporateClient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_booking_id")
    private GroupBooking groupBooking;

    @Column(name = "price_per_night", precision = 12, scale = 2)
    private BigDecimal pricePerNight;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "negotiated_price_items", joinColumns = @JoinColumn(name = "agreement_id"))
    @Builder.Default
    private List<NegotiatedPriceItem> items = new ArrayList<>();

    public BigDecimal getPriceForRoomType(Long roomTypeId) {
        if (items != null && !items.isEmpty()) {
            if (roomTypeId != null) {
                for (NegotiatedPriceItem item : items) {
                    if (roomTypeId.equals(item.getRoomTypeId()) && item.getPricePerNight() != null) {
                        return item.getPricePerNight();
                    }
                }
            }
            return null;
        }
        return pricePerNight;
    }

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(columnDefinition = "TEXT")
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
