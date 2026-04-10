export interface Station {
  id: string;
  name: string;
  brand: string;
  street: string;
  houseNumber: string;
  place: string;
  postCode: number;
  lat: number;
  lng: number;
  dist: number;
  diesel: number | false;
  e5: number | false;
  e10: number | false;
  isOpen: boolean;
}

export interface StationPrice {
  status: "open" | "closed" | "no prices";
  e5?: number | false;
  e10?: number | false;
  diesel?: number | false;
}

export interface PricesResponse {
  ok: boolean;
  prices: Record<string, StationPrice>;
}

export interface NearbyResponse {
  ok: boolean;
  stations: Station[];
}

export interface DetailStation {
  id: string;
  name: string;
  brand: string;
  street: string;
  houseNumber: string;
  postCode: number;
  place: string;
  lat: number;
  lng: number;
  isOpen: boolean;
  e5: number | false;
  e10: number | false;
  diesel: number | false;
  wholeDay: boolean;
  openingTimes: Array<{ text: string; start: string; end: string }>;
  overrides: string[];
  state: string | null;
}

export interface DetailResponse {
  ok: boolean;
  station: DetailStation;
}

export interface FavoriteStation {
  id: string;
  name: string;
  brand: string;
  street: string;
  houseNumber: string;
  place: string;
  postCode: number;
  lat: number;
  lng: number;
}
