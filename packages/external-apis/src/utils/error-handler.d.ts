export declare class SyncServiceError extends Error {
    service: string;
    operation: string;
    cause?: Error;
    constructor(message: string, service: string, operation: string, cause?: Error);
}
export declare class SyncErrorHandler {
    private maxRetries;
    private retryDelay;
    private onError;
    constructor(options: {
        maxRetries: number;
        retryDelay: number;
        onError: (error: Error) => void;
    });
    withRetry<T>(operation: () => Promise<T>, context: {
        service: string;
        operation: string;
        context: any;
    }): Promise<T | null>;
}
//# sourceMappingURL=error-handler.d.ts.map