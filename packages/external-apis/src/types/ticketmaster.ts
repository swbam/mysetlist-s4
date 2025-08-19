export interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  images: { url: string }[];
  dates: {
    start: {
      localDate: string;
      localTime?: string;
    };
    status: {
      code: string;
    };
  };
  priceRanges?: {
    min: number;
    max: number;
    currency: string;
  }[];
  _embedded?: {
    venues: TicketmasterVenue[];
    attractions?: { name: string; id?: string }[];
  };
}

export interface TicketmasterVenue {
  id: string;
  name: string;
  url?: string;
  postalCode: string;
  city?: {
    name: string;
  };
  state?: {
    stateCode: string;
  };
  country?: {
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