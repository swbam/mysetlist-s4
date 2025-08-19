import { SpotifyCompleteCatalog } from "../spotify-complete-catalog";

export class SpotifyCatalogIngestService {
  private catalog: SpotifyCompleteCatalog;
  constructor() {
    this.catalog = new SpotifyCompleteCatalog();
  }

  async ingestStudioCatalog(_artistId: string, spotifyArtistId: string) {
    // For now, delegate to the complete catalog and skip live/remixes by default
    return this.catalog.importEntireDiscography(spotifyArtistId, {
      includeCompilations: false,
      includeAppearsOn: false,
      skipLive: true,
      skipRemixes: true,
    });
  }
}

