"use strict";
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
exports.setlistfm = exports.ticketmaster = exports.spotify = void 0;
// Re-exports for services and clients
__exportStar(require("./services/orchestrators/ArtistImportOrchestrator"), exports);
__exportStar(require("./services/progress/ProgressBus"), exports);
__exportStar(require("./clients/setlistfm"), exports);
__exportStar(require("./services"), exports);
__exportStar(require("./clients"), exports);
// Lazy, singleton client proxies for convenient imports like `import { spotify } from "@repo/external-apis"`
const setlistfm_1 = require("./clients/setlistfm");
const spotify_1 = require("./clients/spotify");
const ticketmaster_1 = require("./clients/ticketmaster");
let _spotify = null;
let _ticketmaster = null;
let _setlistfm = null;
exports.spotify = new Proxy({}, {
    get: (_target, prop) => {
        if (!_spotify) {
            _spotify = new spotify_1.SpotifyClient({});
        }
        return _spotify[prop];
    },
});
exports.ticketmaster = new Proxy({}, {
    get: (_target, prop) => {
        if (!_ticketmaster) {
            _ticketmaster = new ticketmaster_1.TicketmasterClient({
                apiKey: process.env['TICKETMASTER_API_KEY'] ||
                    "k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b",
            });
        }
        return _ticketmaster[prop];
    },
});
exports.setlistfm = new Proxy({}, {
    get: (_target, prop) => {
        if (!_setlistfm) {
            _setlistfm = new setlistfm_1.SetlistFmClient({});
        }
        return _setlistfm[prop];
    },
});
