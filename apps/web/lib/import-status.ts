import { CacheClient, cacheKeys } from "~/lib/cache/redis";

export interface ImportStatus {
	artistId: string;
	stage:
		| "initializing"
		| "fetching-artist"
		| "syncing-identifiers"
		| "importing-songs"
		| "importing-shows"
		| "creating-setlists"
		| "completed"
		| "failed";
	progress: number;
	message: string;
	details?: string;
	error?: string;
	startedAt: string;
	updatedAt: string;
	completedAt?: string;
	estimatedTimeRemaining?: number;
}

const cache = CacheClient.getInstance();

export async function updateImportStatus(
	artistId: string,
	update: Partial<ImportStatus>
): Promise<void> {
	try {
		const statusKey = cacheKeys.syncProgress(artistId);
		const existingStatus =
			(await cache.get<ImportStatus>(statusKey)) || {
				artistId,
				stage: "initializing" as const,
				progress: 0,
				message: "Starting import...",
				startedAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

		const updatedStatus: ImportStatus = {
			...existingStatus,
			...update,
			updatedAt: new Date().toISOString(),
		};

		// TTL: completed/failed 1h, otherwise 30m
		const ttl =
			updatedStatus.stage === "completed" || updatedStatus.stage === "failed"
				? 3600
				: 1800;

		await cache.set(statusKey, updatedStatus, { ex: ttl });

		console.log(
			`[IMPORT STATUS] ${artistId}: ${updatedStatus.stage} (${updatedStatus.progress}%) - ${updatedStatus.message}`
		);
	} catch (error) {
		console.error("Failed to update import status:", error);
	}
}


