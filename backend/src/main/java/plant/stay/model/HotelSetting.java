package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "hotel_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HotelSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "property_name", nullable = false)
    private String propertyName;

    @Column(nullable = false, length = 500)
    private String address;

    @Column(length = 20)
    private String phone;

    private String email;

    @Column(name = "default_checkin_time", nullable = false)
    private LocalTime defaultCheckinTime;

    @Column(name = "default_checkout_time", nullable = false)
    private LocalTime defaultCheckoutTime;

    @Column(name = "home_image")
    private String homeImage;

    /**
     * Ngưỡng giảm giá (số tiền tuyệt đối, sau khi đã tính ra calculatedAmount).
     * Nếu calculatedAmount >= ngưỡng này → chuyển trạng thái PENDING_DISCOUNT_APPROVAL, cần OWNER duyệt.
     * Nếu NULL → luôn tự động duyệt (không cần OWNER phê duyệt).
     */
    @Column(name = "discount_approval_threshold", precision = 12, scale = 2)
    private BigDecimal discountApprovalThreshold;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by", referencedColumnName = "id")
    private User updatedBy;
}

