package plant.stay.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "public_group_booking_request_rooms")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PublicGroupBookingRequestRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private PublicGroupBookingRequest request;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    @Column(nullable = false)
    private Integer quantity;
}