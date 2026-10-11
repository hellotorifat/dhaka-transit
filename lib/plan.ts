import { supabase } from "./supabase";
import type { LatLng, Leg, PlanResponse, Stop, TripOption } from "./types";

type Pt = { lat: number; lng: number };

// ---- Tunable estimates (adjust to real Dhaka conditions) -------------------
const WALK_MAX_M = 700; // farther than this -> suggest rickshaw
const RICKSHAW_BASE_BDT = 20; // negotiated in reality, so only an estimate
const RICKSHAW_PER_KM_BDT = 25;
const RICKSHAW_SLOWDOWN = 1.3; // Dhaka traffic vs. Mapbox cycling time
const BUS_WAIT_MIN = 6;
const BUS_MIN_PER_STOP = 2.5;
// -----------------------------------------------------------------------------

function haversine(a: Pt, b: Pt): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function estAccessMin(meters: number): number {
  return meters <= WALK_MAX_M ? meters / 75 : meters / 200 + 3;
}

async function mapboxPath(
  profile: "walking" | "cycling",
  from: Pt,
  to: Pt
): Promise<{ path: LatLng[]; distance_m: number; duration_s: number | null }> {
  const fallback = {
    path: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ] as LatLng[],
    distance_m: haversine(from, to) * 1.3,
    duration_s: null,
  };

  const token = process.env.MAPBOX_TOKEN;
  if (!token) return fallback;

  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?geometries=geojson&overview=full&access_token=${token}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return fallback;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return fallback;
    return {
      path: route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as LatLng),
      distance_m: route.distance,
      duration_s: route.duration,
    };
  } catch {
    return fallback;
  }
}

async function accessLeg(
  from: Pt,
  to: Pt,
  fromName: string,
  toName: string,
  straightMeters: number
): Promise<Leg> {
  const useRickshaw = straightMeters > WALK_MAX_M;
  const r = await mapboxPath(useRickshaw ? "cycling" : "walking", from, to);

  if (useRickshaw) {
    const seconds = (r.duration_s ?? r.distance_m / 3.3) * RICKSHAW_SLOWDOWN;
    const fare = RICKSHAW_BASE_BDT + (r.distance_m / 1000) * RICKSHAW_PER_KM_BDT;
    return {
      type: "rickshaw",
      title: "Take a rickshaw",
      from: fromName,
      to: toName,
      minutes: Math.max(3, Math.round(seconds / 60) + 2),
      fare_bdt: Math.round(fare / 5) * 5,
      distance_m: Math.round(r.distance_m),
      estimated: true,
      path: r.path,
    };
  }

  const seconds = r.duration_s ?? r.distance_m / 1.25;
  return {
    type: "walk",
    title: "Walk",
    from: fromName,
    to: toName,
    minutes: Math.max(1, Math.round(seconds / 60)),
    fare_bdt: 0,
    distance_m: Math.round(r.distance_m),
    path: r.path,
  };
}

async function nearest(p: Pt): Promise<Stop[]> {
  const { data, error } = await supabase.rpc("nearest_stops", {
    p_lat: p.lat,
    p_lng: p.lng,
    max_meters: 1500,
    max_results: 5,
  });
  if (error) throw new Error("Database error: " + error.message);
  return (data ?? []) as Stop[];
}

type Candidate = {
  board: Stop;
  alight: Stop;
  route_id: number;
  route_name: string;
  direction: number;
  stops_count: number;
  fare_bdt: number;
  score: number;
};

async function buildOption(
  o: Pt,
  d: Pt,
  oName: string,
  dName: string,
  c: Candidate
): Promise<TripOption> {
  const [firstLeg, lastLeg, pathRes] = await Promise.all([
    accessLeg(o, c.board, oName, c.board.name, c.board.distance_m),
    accessLeg(c.alight, d, c.alight.name, dName, c.alight.distance_m),
    supabase.rpc("route_path", {
      p_route_id: c.route_id,
      p_direction: c.direction,
      p_from_stop: c.board.id,
      p_to_stop: c.alight.id,
    }),
  ]);

  const rows = (pathRes.data ?? []) as { lat: number; lng: number }[];
  const busPath: LatLng[] =
    rows.length >= 2
      ? rows.map((r) => [r.lat, r.lng] as LatLng)
      : [
          [c.board.lat, c.board.lng],
          [c.alight.lat, c.alight.lng],
        ];

  const busLeg: Leg = {
    type: "bus",
    title: `Bus: ${c.route_name}`,
    from: c.board.name,
    to: c.alight.name,
    minutes: Math.round(BUS_WAIT_MIN + c.stops_count * BUS_MIN_PER_STOP),
    fare_bdt: c.fare_bdt,
    estimated: true,
    path: busPath,
  };

  const legs = [firstLeg, busLeg, lastLeg];
  return {
    legs,
    total_minutes: legs.reduce((s, l) => s + l.minutes, 0),
    total_fare_bdt: legs.reduce((s, l) => s + l.fare_bdt, 0),
  };
}

export async function planTrip(
  o: Pt,
  d: Pt,
  oName = "Origin",
  dName = "Destination"
): Promise<PlanResponse> {
  const [oStops, dStops] = await Promise.all([nearest(o), nearest(d)]);

  if (oStops.length === 0) {
    return { options: [], message: "No bus stops found within 1.5 km of your origin." };
  }
  if (dStops.length === 0) {
    return { options: [], message: "No bus stops found within 1.5 km of your destination." };
  }

  const pairs: [Stop, Stop][] = [];
  for (const b of oStops) {
    for (const a of dStops) {
      if (b.id !== a.id) pairs.push([b, a]);
    }
  }

  const found = await Promise.all(
    pairs.map(async ([board, alight]) => {
      const { data, error } = await supabase.rpc("direct_routes", {
        p_from_stop: board.id,
        p_to_stop: alight.id,
      });
      if (error || !data) return [] as Candidate[];
      return (data as any[]).map((row) => {
        const fare = Number(row.fare_bdt);
        const stops = Number(row.stops_count);
        return {
          board,
          alight,
          route_id: row.route_id,
          route_name: row.route_name,
          direction: row.direction,
          stops_count: stops,
          fare_bdt: fare,
          score:
            estAccessMin(board.distance_m) +
            BUS_WAIT_MIN +
            stops * BUS_MIN_PER_STOP +
            estAccessMin(alight.distance_m) +
            fare * 0.05,
        } as Candidate;
      });
    })
  );

  // best candidate per bus route, then top 3 overall
  const bestPerRoute = new Map<string, Candidate>();
  for (const c of found.flat()) {
    const key = `${c.route_id}-${c.direction}`;
    const prev = bestPerRoute.get(key);
    if (!prev || c.score < prev.score) bestPerRoute.set(key, c);
  }
  const top = Array.from(bestPerRoute.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  if (top.length === 0) {
    return {
      options: [],
      message:
        "No direct bus found between the stops near these two places. (Bus changes are not supported yet, or this area has no route data.)",
    };
  }

  const options = await Promise.all(top.map((c) => buildOption(o, d, oName, dName, c)));
  options.sort((a, b) => a.total_minutes - b.total_minutes);
  return { options };
}
