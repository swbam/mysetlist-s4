export interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  images: { url: string }[];
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
    status: {
      code: string;
    };
  };
  priceRanges?: {
    type: string;
    currency: string;
    min: number;
    max: number;
  }[];
  _embedded?: {
    venues: TicketmasterVenue[];
    attractions?: { id: string; name: string }[];
  };
}

export interface TicketmasterVenue {
  id: string;
  name: string;
  url?: string;
  postalCode: string;
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  city?: {
    name: string;
  };
  state?: {
    name: string;
    stateCode: string;
  };
  country?: {
    name: string;
    countryCode: string;
  };
  address?: {
    line1: string;
  };
  location?: {
    longitude: string;
    latitude: string;
  };
  timezone?: string;
  capacity?: number;
}

export interface TicketmasterAttraction {
  id: string;
  name: string;
  url?: string;
  imageUrl?: string;
  genres?: string[];
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
  }>;
  classifications?: Array<{
    segment?: { name: string };
    genre?: { name: string };
    subGenre?: { name: string };
  }>;
  externalLinks?: {
    spotify?: Array<{ url: string }>;
    musicbrainz?: Array<{ id: string }>;
    lastfm?: Array<{ url: string }>;
    facebook?: Array<{ url: string }>;
    twitter?: Array<{ url: string }>;
    instagram?: Array<{ url: string }>;
  };
}
