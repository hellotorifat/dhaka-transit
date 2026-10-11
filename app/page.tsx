"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import PlaceSearch from "@/components/PlaceSearch";
import Results from "@/components/Results";
import type { Place, PlanResponse } from "@/lib/types";

// Leaflet needs the browser, so the map is loaded client-side only
const TransitMap = dynamic(() => import("@/components/TransitMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100" />,
});

export default function Home() {
  const [origin, setOrigin] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [pick, setPick] = useState<"origin" | "dest" | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function changeOrigin(p: Place | null) {
    setOrigin(p);
    setResult(null);
  }
  function changeDest(p: Place | null) {
    setDest(p);
    setResult(null);
  }

  function onMapPick(lat: number, lng: number) {
    const p: Place = {
      id: `pin-${Date.now()}`,
      name: "Pinned location",
      address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat,
      lng,
    };
    if (pick === "origin") changeOrigin(p);
    if (pick === "dest") changeDest(p);
    setPick(null);
  }

  function locate() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        changeOrigin({
          id: "gps",
          name: "My location",
          address: "",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setError("Could not get your location. Please allow location access."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function swap() {
    const o = origin;
    setOrigin(dest);
    setDest(o);
    setResult(null);
  }

  async function findRoute() {
    if (!origin || !dest) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelected(0);
    try {
      const qs = new URLSearchParams({
        olat: String(origin.lat),
        olng: String(origin.lng),
        dlat: String(dest.lat),
        dlng: String(dest.lng),
        oname: origin.name,
        dname: dest.name,
      });
      const r = await fetch(`/api/plan?${qs.toString()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Something went wrong");
      setResult(j as PlanResponse);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const activeOption = result?.options[selected] ?? null;

  return (
    <main className={`flex h-[100dvh] flex-col md:flex-row ${pick ? "picking" : ""}`}>
      <section className="order-2 flex max-h-[55dvh] w-full flex-col gap-4 overflow-y-auto border-t bg-white p-4 md:order-1 md:max-h-none md:w-[400px] md:border-r md:border-t-0">
        <header>
          <h1 className="text-xl font-bold">🚌 Dhaka Transit</h1>
          <p className="text-xs text-gray-500">Rickshaw / walk + bus, door to door</p>
        </header>

        <PlaceSearch
          label="From (origin)"
          dotColor="#16a34a"
          value={origin}
          onSelect={changeOrigin}
          onPickOnMap={() => setPick(pick === "origin" ? null : "origin")}
          picking={pick === "origin"}
          onLocate={locate}
        />

        <div className="-my-2 flex justify-center">
          <button
            type="button"
            onClick={swap}
            className="rounded-full border border-gray-300 px-3 py-0.5 text-sm hover:bg-gray-50"
            title="Swap"
          >
            ⇅
          </button>
        </div>

        <PlaceSearch
          label="To (destination)"
          dotColor="#dc2626"
          value={dest}
          onSelect={changeDest}
          onPickOnMap={() => setPick(pick === "dest" ? null : "dest")}
          picking={pick === "dest"}
        />

        <button
          type="button"
          onClick={findRoute}
          disabled={!origin || !dest || loading}
          className="rounded-lg bg-green-600 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Finding routes…" : "Find route"}
        </button>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {result && <Results data={result} selected={selected} onSelect={setSelected} />}
      </section>

      <div className="relative order-1 min-h-[40dvh] flex-1 md:order-2">
        <div className="absolute inset-0">
          <TransitMap
            origin={origin}
            dest={dest}
            option={activeOption}
            picking={pick !== null}
            onPick={onMapPick}
          />
        </div>
        {pick && (
          <div className="absolute left-1/2 top-3 z-[1100] -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm text-white">
            Tap the map to set {pick === "origin" ? "origin" : "destination"}
          </div>
        )}
      </div>
    </main>
  );
}
