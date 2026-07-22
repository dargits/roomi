package roomi.dev.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "guests", indexes = {
    @Index(name = "idx_guests_phone", columnList = "phone")
})
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Guest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;
    
    @Column(length = 20)
    private String phone;
    
    @Column(length = 150)
    private String email;
    
    @Column(name = "id_number", length = 30)
    private String idNumber;
    
    private String note;
    
    @Builder.Default
    @Column(name = "loyalty_points", nullable = false)
    private Integer loyaltyPoints = 0;
    
    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}