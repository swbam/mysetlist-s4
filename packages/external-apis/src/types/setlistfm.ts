export interface SetlistFmSetlist {
  id: string;
  artist: {
    mbid: string;
    name: string;
  };
  venue: {
    id: string;
    name: string;
    city: {
      name: string;
      stateCode?: string;
      country: {
        code: string;
      };
      coords?: {
        lat: number;
        long: number;
      };
    };
  };
  eventDate: string;
  sets: {
    set: {
      song: {
        name: string;
        cover?: {
          name: string;
        };
        info?: string;
      }[];
      encore?: number; // 1 if encore set, 0 or undefined otherwise
    }[];
  };
}

export interface SetlistFmVenue {
  id: string;
  name: string;
  city: {
    name: string;
    stateCode?: string;
    country: {
      code: string;
    };
    coords?: {
      lat: number;
      long: number;
    };
  };
}
