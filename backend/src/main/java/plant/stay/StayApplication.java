package plant.stay;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class StayApplication {

	public static void main(String[] args) {
		SpringApplication.run(StayApplication.class, args);
	}

}
