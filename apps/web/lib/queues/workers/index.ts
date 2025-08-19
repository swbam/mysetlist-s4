import { QueueName, queueManager } from "../queue-manager";
import { artistImportWorker } from "./artist-import";

export function initializeWorkers() {
  queueManager.createWorker(QueueName.ARTIST_IMPORT, artistImportWorker);
  // Add other workers here as they are created
}
