import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

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

export async function updateImportStatus(
	artistId: string,
	update: Partial<ImportStatus>
): Promise<void> {
	try {
		const supabase = createRouteHandlerClient({ 
			cookies: () => ({
				get: () => undefined,
				has: () => false,
				set: () => {},
				delete: () => {},
				getAll: () => [],
				[Symbol.iterator]: function* () {}
			} as any)
		});

		// Check if a record already exists for this artist
		const { data: existingStatus } = await supabase
			.from('import_status')
			.select('*')
			.eq('artist_id', artistId)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		const now = new Date().toISOString();

		if (existingStatus) {
			// Update existing record
			const updatedData = {
				stage: update.stage || existingStatus.stage,
				percentage: update.progress ?? existingStatus.percentage,
				message: update.message || existingStatus.message,
				error: update.error || existingStatus.error,
				updated_at: now,
				completed_at: update.completedAt || existingStatus.completed_at,
			};

			await supabase
				.from('import_status')
				.update(updatedData)
				.eq('id', existingStatus.id);

		} else {
			// Create new record
			const newRecord = {
				artist_id: artistId,
				stage: update.stage || 'initializing',
				percentage: update.progress || 0,
				message: update.message || 'Starting import...',
				error: update.error || null,
				created_at: now,
				updated_at: now,
				completed_at: update.completedAt || null,
			};

			await supabase
				.from('import_status')
				.insert(newRecord);
		}

		console.log(
			`[IMPORT STATUS] ${artistId}: ${update.stage} (${update.progress}%) - ${update.message}`
		);
	} catch (error) {
		console.error("Failed to update import status:", error);
		// Fallback: don't let import status failures break the actual import
	}
}
