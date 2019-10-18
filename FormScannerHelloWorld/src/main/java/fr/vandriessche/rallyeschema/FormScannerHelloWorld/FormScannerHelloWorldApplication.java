package fr.vandriessche.rallyeschema.FormScannerHelloWorld;

import static java.lang.System.exit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import fr.vandriessche.rallyeschema.FormScannerHelloWorld.service.FormScannerService;
import fr.vandriessche.rallyeschema.FormScannerHelloWorld.service.HelloMessageService;

@SpringBootApplication
public class FormScannerHelloWorldApplication implements CommandLineRunner {
	@Autowired
	private HelloMessageService helloService;

	@Autowired
	private FormScannerService formScannerService;

	public static void main(String[] args) {
		SpringApplication.run(FormScannerHelloWorldApplication.class, args);
	}

	// Put your logic here.
	@Override
	public void run(String... args) throws Exception {

		if (args.length > 0) {
			System.out.println(helloService.getMessage(args[0].toString()));
		} else {
			System.out.println(helloService.getMessage());
		}
		formScannerService.analyze();

		exit(0);
	}
}
