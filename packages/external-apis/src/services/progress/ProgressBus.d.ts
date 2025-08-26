export declare function onProgress(artistId: string, fn: (p: any) => void): void;
export declare function offProgress(artistId: string, fn: (p: any) => void): void;
export declare function report(artistId: string, stage: "initializing" | "syncing-identifiers" | "importing-songs" | "importing-shows" | "creating-setlists" | "completed" | "failed", progress: number, message: string): Promise<void>;
//# sourceMappingURL=ProgressBus.d.ts.map