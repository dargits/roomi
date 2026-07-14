package roomi.dev.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    private String session;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    
    @OneToOne
    private User user;
}
