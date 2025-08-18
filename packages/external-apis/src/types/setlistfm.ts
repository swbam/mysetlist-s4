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
    }[];
  };
}
