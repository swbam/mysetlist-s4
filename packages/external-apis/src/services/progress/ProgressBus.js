"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onProgress = onProgress;
exports.offProgress = offProgress;
exports.report = report;
const database_1 = require("@repo/database");
const events_1 = require("events");
const bus = new events_1.EventEmitter();
function onProgress(artistId, fn) {
    bus.on(artistId, fn);
}
function offProgress(artistId, fn) {
    bus.off(artistId, fn);
}
async function report(artistId, stage, progress, message) {
    const payload = {
        stage,
        percentage: progress,
        message,
    };
    await database_1.db
        .insert(database_1.importStatus)
        .values({
        artistId,
        stage: payload.stage,
        percentage: payload.percentage,
        message: payload.message,
    })
        .onConflictDoUpdate({
        target: database_1.importStatus.artistId,
        set: {
            stage: payload.stage,
            percentage: payload.percentage,
            message: payload.message,
            updatedAt: new Date(),
        },
    });
    bus.emit(artistId, payload);
}
