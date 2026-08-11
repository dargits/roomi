package roomi.dev;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import roomi.dev.repository.BookingRepository;
import roomi.dev.repository.RoomRepository;
import roomi.dev.model.Booking;
import roomi.dev.model.Room;
import java.util.List;

@SpringBootTest
class DevApplicationTests {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Test
    void contextLoads() {
        System.out.println("=== SYSTEM STATUS CHECK ===");
        List<Room> rooms = roomRepository.findAll();
        for (Room r : rooms) {
            if (r.getRoomNumber().equals("302")) {
                System.out.println("Room 302 ID: " + r.getId() + ", Status: " + r.getStatus());
            }
        }

        List<Booking> bookings = bookingRepository.findAll();
        for (Booking b : bookings) {
            if (b.getRoom() != null && b.getRoom().getRoomNumber().equals("302")) {
                System.out.println("Booking on 302: ID=" + b.getId() + 
                                   ", Guest=" + b.getGuest().getFullName() + 
                                   ", Status=" + b.getStatus() + 
                                   ", CheckIn=" + b.getCheckInDate() + 
                                   ", CheckOut=" + b.getCheckOutDate());
            }
        }
        System.out.println("==========================");
    }
}
