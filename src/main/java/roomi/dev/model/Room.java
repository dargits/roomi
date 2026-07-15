package roomi.dev.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rooms")
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;
    
    @Column(name = "room_number", nullable = false, unique = true, length = 20)
    private String roomNumber;
    
    @Column(length = 10)
    private String floor;
    
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false)
    private Status status = Status.AVAILABLE;
    
    private String note;
    
    public enum Status {
        AVAILABLE, OCCUPIED, NEEDS_CLEANING, MAINTENANCE
    }
}