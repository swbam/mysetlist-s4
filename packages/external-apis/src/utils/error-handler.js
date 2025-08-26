"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncErrorHandler = exports.SyncServiceError = void 0;
class SyncServiceError extends Error {
    service;
    operation;
    cause;
    constructor(message, service, operation, cause) {
        super(message);
        this.name = "SyncServiceError";
        this.service = service;
        this.operation = operation;
        this.cause = cause;
    }
}
exports.SyncServiceError = SyncServiceError;
class SyncErrorHandler {
    maxRetries;
    retryDelay;
    onError;
    constructor(options) {
        this.maxRetries = options.maxRetries;
        this.retryDelay = options.retryDelay;
        this.onError = options.onError;
    }
    async withRetry(operation, context) {
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                return await operation();
            }
            catch (error) {
                const syncError = new SyncServiceError(`Operation failed: ${context.operation}`, context.service, context.operation, error instanceof Error ? error : undefined);
                this.onError(syncError);
                if (i === this.maxRetries - 1) {
                    return null;
                }
                await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
            }
        }
        return null;
    }
}
exports.SyncErrorHandler = SyncErrorHandler;
