// Messages that we'll send to the client

// Representing a person's position
export type Position = {
  id: string;
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;   // ISO-2, ex: "MD"
  flag?: string;      // 🇲🇩  (calculat server-side)
};

export type OutgoingMessage =
  | {
      type: "add-marker";
      position: Position;
    }
  | {
      type: "remove-marker";
      id: string;
    };



