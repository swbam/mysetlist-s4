// Re-exports for services and clients
export * from "./services/orchestrators/ArtistImportOrchestrator";
export * from "./services/progress/ProgressBus";
export * from "./clients/setlistfm";
export * from "./services";
export * from "./clients";
<<<<<<< Current (Your changes)
=======

// Lazy, singleton client proxies for convenient imports like `import { spotify } from "@repo/external-apis"`
import { SetlistFmClient } from "./clients/setlistfm";
import { SpotifyClient } from "./clients/spotify";
import { TicketmasterClient } from "./clients/ticketmaster";

let _spotify: SpotifyClient | null = null;
let _ticketmaster: TicketmasterClient | null = null;
let _setlistfm: SetlistFmClient | null = null;

export const spotify = new Proxy({} as SpotifyClient, {
  get: (_target, prop) => {
    if (!_spotify) {
      _spotify = new SpotifyClient({});
    }
    return (_spotify as any)[prop];
  },
});

export const ticketmaster = new Proxy({} as TicketmasterClient, {
  get: (_target, prop) => {
    if (!_ticketmaster) {
      _ticketmaster = new TicketmasterClient({
        apiKey:
          process.env['TICKETMASTER_API_KEY'] ||
          "k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b",
      });
    }
    return (_ticketmaster as any)[prop];
  },
});

export const setlistfm = new Proxy({} as SetlistFmClient, {
  get: (_target, prop) => {
    if (!_setlistfm) {
      _setlistfm = new SetlistFmClient({});
    }
    return (_setlistfm as any)[prop];
  },
});
>>>>>>> Incoming (Background Agent changes)
