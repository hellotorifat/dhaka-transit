"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLng, Place, TripOption } from "@/lib/types";

const DHAKA: LatLng = [23.8103, 90.4125];

function pin(color: string, text: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"><span style="transform:rotate(45deg);font-weight:700;font-size:12px">${text}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

const originIcon = pin("#16a34a", "A");
const destIcon = pin("#dc2626", "B");

const LINE = {
  walk: { color: "#2563eb", weight: 5, dashArray: "4 8" },
  rickshaw: { color: "#f59e0b", weight: 5, dashArray: "10 6" },
  bus: { color: "#16a34a", weight: 6 },
};

function FitTo({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key =
    points.length +
    ":" +
    (points[0]?.join(",") ?? "") +
    ":" +
    (points[points.length - 1]?.join(",") ?? "");

  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 16);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return null;
}

function ClickToPick({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (enabled) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type Props = {
  origin: Place | null;
  dest: Place | null;
  option: TripOption | null;
  picking: boolean;
  onPick: (lat: number, lng: number) => void;
};

export default function TransitMap({ origin, dest, option, picking, onPick }: Props) {
  const fitPoints = useMemo<LatLng[]>(() => {
    if (option) return option.legs.flatMap((l) => l.path);
    const pts: LatLng[] = [];
    if (origin) pts.push([origin.lat, origin.lng]);
    if (dest) pts.push([dest.lat, dest.lng]);
    return pts;
  }, [option, origin, dest]);

  return (
    <MapContainer center={DHAKA} zoom={12} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <ClickToPick enabled={picking} onPick={onPick} />
      <FitTo points={fitPoints} />

      {option?.legs.map((leg, i) => (
        <Polyline key={i} positions={leg.path} pathOptions={LINE[leg.type]} />
      ))}

      {option?.legs
        .filter((l) => l.type === "bus")
        .flatMap((l, i) =>
          l.path.map((p, j) => (
            <CircleMarker
              key={`${i}-${j}`}
              center={p}
              radius={4}
              pathOptions={{ color: "#166534", fillColor: "#fff", fillOpacity: 1, weight: 2 }}
            />
          ))
        )}

      {origin && <Marker position={[origin.lat, origin.lng]} icon={originIcon} />}
      {dest && <Marker position={[dest.lat, dest.lng]} icon={destIcon} />}
    </MapContainer>
  );
}
