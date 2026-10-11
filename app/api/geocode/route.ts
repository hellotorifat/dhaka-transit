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
    return NextResponse.json({ error: "MAPBOX_TOKEN is not set on the server" }, { status: 500 });
  }

  // v5 returns places of interest (shops, hospitals, landmarks...) as well as addresses
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
  );
  url.searchParams.set("country", "bd");
  url.searchParams.set("proximity", DHAKA_CENTER);
  url.searchParams.set("bbox", DHAKA_BBOX);
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("limit", "6");
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Mapbox error ${res.status} (check MAPBOX_TOKEN)` },
      { status: 502 }
    );
  }
  const data = await res.json();

  const places: Place[] = (data.features ?? []).map((f: any) => {
    const full: string = f.place_name ?? f.text ?? q;
    const name: string = f.text ?? full.split(",")[0];
    return {
      id: f.id,
      name,
      address: full.startsWith(name) ? full.slice(name.length).replace(/^,\s*/, "") : full,
      lng: f.center[0],
      lat: f.center[1],
    };
  });

  return NextResponse.json({ places });
}
