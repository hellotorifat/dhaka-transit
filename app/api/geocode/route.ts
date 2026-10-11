import { NextRequest, NextResponse } from "next/server";
import type { Place } from "@/lib/types";

// Dhaka center + bounding box (west,south,east,north)
const DHAKA_CENTER = "90.4125,23.8103";
const DHAKA_BBOX = "90.25,23.6,90.58,23.98";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ places: [] });

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "MAPBOX_TOKEN missing" }, { status: 500 });
  }

  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", q);
  url.searchParams.set("country", "bd");
  url.searchParams.set("proximity", DHAKA_CENTER);
  url.searchParams.set("bbox", DHAKA_BBOX);
  url.searchParams.set("limit", "5");
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "Mapbox error" }, { status: 502 });
  }
  const data = await res.json();

  const places: Place[] = (data.features ?? []).map((f: any) => ({
    id: f.id,
    name: f.properties?.name ?? q,
    address: f.properties?.place_formatted ?? "",
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));

  return NextResponse.json({ places });
}
