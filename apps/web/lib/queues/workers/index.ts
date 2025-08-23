import { QueueName, queueManager } from "../queue-manager";
import { artistImportWorker } from "./artist-import";

export function initializeWorkers() {
  queueManager.createWorker(QueueName.ARTIST_IMPORT, artistImportWorker);
  // Add other workers here as they are created
}

export async function setupRecurringJobs() {
  // Set up recurring jobs - placeholder implementation
  console.log("Setting up recurring jobs");
  // TODO: Implement actual recurring job setup when needed
}
