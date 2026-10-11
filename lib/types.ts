export type LatLng = [number, number]; // [lat, lng]

export type Place = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type Stop = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  distance_m: number;
};

export type Leg = {
  type: "walk" | "rickshaw" | "bus";
  title: string;
  from: string;
  to: string;
  minutes: number;
  fare_bdt: number;
  distance_m?: number;
  estimated?: boolean;
  path: LatLng[];
};

export type TripOption = {
  legs: Leg[];
  total_minutes: number;
  total_fare_bdt: number;
};

export type PlanResponse = {
  options: TripOption[];
  message?: string;
};
