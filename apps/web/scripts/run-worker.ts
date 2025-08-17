#!/usr/bin/env tsx

import { config as loadEnv } from "dotenv";
// Load local env first if present, then fallback to .env
loadEnv({ path: ".env.local", override: true });
loadEnv();

import { createImportWorker } from "../lib/services/queue/bullmq";

async function main() {
	const concurrency = Number(process.env.IMPORT_WORKER_CONCURRENCY || 5);
	const worker = createImportWorker(concurrency);

	worker.on("ready", () => {
		console.log(`[worker] Import worker ready (concurrency=${concurrency})`);
	});
	worker.on("completed", (job) => {
		console.log(`[worker] job completed`, job.id);
	});
	worker.on("failed", (job, err) => {
		console.error(`[worker] job failed`, job?.id, err);
	});
}

main().catch((e) => {
	console.error("Worker failed to start", e);
	process.exit(1);
});

