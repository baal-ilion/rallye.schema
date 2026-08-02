package fr.vandriessche.rallyeschema.responseservice.services;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.logging.Level;

import javax.annotation.PreDestroy;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import fr.vandriessche.rallyeschema.responseservice.entities.ResponseFileInfo;
import lombok.extern.java.Log;

/**
 * File persistante de traitement des formulaires.
 *
 * L'etat est conserve dans MongoDB : un redemarrage du back ne perd donc pas les
 * fichiers deja recus. La prise atomique d'un travail permet aussi de lancer
 * plusieurs instances du back sans traiter deux fois la meme image.
 */
@Service
@Log
public class ResponseFileProcessingQueue {
	// Le worker Python de fond traite une image CPU à la fois. L'instance
	// interactive distincte reste ainsi toujours disponible pour les angles.
	private static final int MAX_CONCURRENT_PROCESSING = 1;
	private static final int STALE_PROCESSING_MINUTES = 10;

	@Autowired
	private MongoTemplate mongoTemplate;
	@Autowired
	private ResponseFileService responseFileService;

	private final Semaphore availableWorkers = new Semaphore(MAX_CONCURRENT_PROCESSING);
	private final ExecutorService executor = Executors.newFixedThreadPool(MAX_CONCURRENT_PROCESSING, runnable -> {
		Thread thread = new Thread(runnable, "response-file-processing");
		thread.setDaemon(true);
		return thread;
	});

	@Scheduled(fixedDelayString = "${form-processing.queue.poll-delay-ms:500}")
	public void dispatchQueuedFiles() {
		while (availableWorkers.tryAcquire()) {
			ResponseFileInfo claimed = claimNext();
			if (claimed == null) {
				availableWorkers.release();
				return;
			}
			executor.submit(() -> process(claimed.getId()));
		}
	}

	@Scheduled(fixedDelayString = "${form-processing.queue.recovery-delay-ms:60000}")
	public void recoverInterruptedProcessing() {
		Instant staleBefore = Instant.now().minus(STALE_PROCESSING_MINUTES, ChronoUnit.MINUTES);
		Query query = Query.query(Criteria.where("processingStatus").is("PROCESSING")
				.and("processingStartedAt").lt(staleBefore));
		Update update = new Update().set("processingStatus", "QUEUED").unset("processingStartedAt")
				.set("processingError", "Traitement repris après une interruption du service.");
		mongoTemplate.updateMulti(query, update, ResponseFileInfo.class);
	}

	private ResponseFileInfo claimNext() {
		Query query = Query.query(Criteria.where("processingStatus").is("QUEUED"))
				.with(Sort.by(Sort.Direction.ASC, "processingCreatedAt"));
		Update update = new Update().set("processingStatus", "PROCESSING")
				.set("processingStartedAt", Instant.now()).unset("processingError");
		return mongoTemplate.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true),
				ResponseFileInfo.class);
	}

	private void process(String id) {
		try {
			responseFileService.processQueuedResponseFile(id);
		} catch (Exception exception) {
			log.log(Level.WARNING, "Echec du traitement du formulaire " + id, exception);
			Query query = Query.query(Criteria.where("id").is(id));
			Update update = new Update().set("processingStatus", "ERROR")
					.set("processingError", userMessage(exception)).set("processingCompletedAt", Instant.now());
			mongoTemplate.updateFirst(query, update, ResponseFileInfo.class);
		} finally {
			availableWorkers.release();
		}
	}

	private String userMessage(Exception exception) {
		String message = exception.getMessage();
		return message == null || message.isBlank()
				? "Le formulaire n'a pas pu etre analyse. Vous pouvez relancer son envoi."
				: message;
	}

	@PreDestroy
	public void stop() {
		executor.shutdownNow();
	}
}
