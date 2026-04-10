export type FuelType = "e5" | "e10" | "diesel" | "all";

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

export interface PriceMap {
  [stationId: string]: StationPrice;
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

export interface OpeningTime {
  text: string;
  start: string;
  end: string;
}

export interface StationDetail extends FavoriteStation {
  isOpen: boolean;
  e5: number | false;
  e10: number | false;
  diesel: number | false;
  wholeDay: boolean;
  openingTimes: OpeningTime[];
  overrides: string[];
  state: string | null;
}

export interface GeocodedPlace {
  lat: number;
  lng: number;
  label: string;
}
