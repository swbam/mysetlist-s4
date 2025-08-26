"use strict";
// Core schema exports - Essential tables only for TheSet MVP
// Removed bloated analytics, data-pipeline, email-enhanced, admin, search, scalability
// These were over-engineered and not required per theset-docs specifications
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userFollowsArtists = exports.artistSongs = exports.userBans = void 0;
__exportStar(require("./users"), exports);
__exportStar(require("./user-profiles"), exports);
__exportStar(require("./artists"), exports);
__exportStar(require("./venues"), exports);
__exportStar(require("./shows"), exports);
__exportStar(require("./setlists"), exports);
__exportStar(require("./email-preferences"), exports);
__exportStar(require("./relations"), exports);
// Essential system tables for API functionality
__exportStar(require("./api-keys"), exports);
__exportStar(require("./rate-limits"), exports);
// Essential admin/monitoring tables
__exportStar(require("./admin"), exports);
// User bans table (referenced by admin pages)
var search_1 = require("./search");
Object.defineProperty(exports, "userBans", { enumerable: true, get: function () { return search_1.userBans; } });
// Re-export artistSongs from artists file to avoid circular dependency
var artists_1 = require("./artists");
Object.defineProperty(exports, "artistSongs", { enumerable: true, get: function () { return artists_1.artistSongs; } });
// User follows artists relationship (needed for artist pages)
var user_follows_artists_1 = require("./user-follows-artists");
Object.defineProperty(exports, "userFollowsArtists", { enumerable: true, get: function () { return user_follows_artists_1.userFollowsArtists; } });
// Export sync jobs and progress
__exportStar(require("./sync-jobs"), exports);
