import { NextRequest, NextResponse } from "next/server";
import { planTrip } from "@/lib/plan";

function inDhaka(lat: number, lng: number) {
  return lat >= 23.6 && lat <= 23.98 && lng >= 90.25 && lng <= 90.58;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const olat = Number(sp.get("olat"));
  const olng = Number(sp.get("olng"));
  const dlat = Number(sp.get("dlat"));
  const dlng = Number(sp.get("dlng"));

  if (![olat, olng, dlat, dlng].every(Number.isFinite)) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }
  if (!inDhaka(olat, olng) || !inDhaka(dlat, dlng)) {
    return NextResponse.json(
      { error: "Both places must be inside Dhaka." },
      { status: 400 }
    );
  }

  try {
    const result = await planTrip(
      { lat: olat, lng: olng },
      { lat: dlat, lng: dlng },
      sp.get("oname") || "Origin",
      sp.get("dname") || "Destination"
    );
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
