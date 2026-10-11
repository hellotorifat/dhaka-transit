"use client";

import { useEffect, useRef, useState } from "react";
import type { Place } from "@/lib/types";

type Props = {
  label: string;
  dotColor: string;
  value: Place | null;
  onSelect: (p: Place | null) => void;
  onPickOnMap: () => void;
  picking: boolean;
  onLocate?: () => void;
};

export default function PlaceSearch({
  label,
  dotColor,
  value,
  onSelect,
  onPickOnMap,
  picking,
  onLocate,
}: Props) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const lastText = useRef("");

  // keep the box in sync when the place is set from outside (map pin, GPS, swap)
  useEffect(() => {
    if (value) {
      lastText.current = value.name;
      setText(value.name);
    }
  }, [value]);

  // debounced autocomplete
  useEffect(() => {
    if (text === lastText.current) return;
    const q = text.trim();
    if (q.length < 2) {
      setItems([]);
      setNote(null);
      return;
    }
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        if (!r.ok) {
          setItems([]);
          setNote(j.error ?? "Search failed");
        } else {
          setItems(j.places ?? []);
          setNote((j.places ?? []).length === 0 ? "No places found. Try a nearby landmark or use the 📍 button to pin it on the map." : null);
        }
        setOpen(true);
      } catch {
        setItems([]);
        setNote("Search failed. Check your internet connection.");
      } finally {
        setBusy(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [text]);

  function choose(p: Place) {
    lastText.current = p.name;
    setText(p.name);
    setOpen(false);
    setItems([]);
    onSelect(p);
  }

  return (
    <div className="relative">
      <label className="mb-1 flex items-center gap-2 text-xs font-medium text-gray-600">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: dotColor }} />
        {label}
      </label>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (value) onSelect(null);
          }}
          onFocus={() => items.length > 0 && setOpen(true)}
          placeholder="Search a place, road or alley…"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-600"
        />
        {onLocate && (
          <button
            type="button"
            onClick={onLocate}
            title="Use my location"
            className="rounded-lg border border-gray-300 px-3 text-sm hover:bg-gray-50"
          >
            ◎
          </button>
        )}
        <button
          type="button"
          onClick={onPickOnMap}
          title="Pick on map"
          className={`rounded-lg border px-3 text-sm ${
            picking ? "border-green-600 bg-green-50" : "border-gray-300 hover:bg-gray-50"
          }`}
        >
          📍
        </button>
      </div>

      {busy && <p className="mt-1 text-xs text-gray-400">Searching…</p>}

      {open && note && items.length === 0 && (
        <p className="absolute z-[1200] mt-1 w-full rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 shadow-lg">
          {note}
        </p>
      )}

      {open && items.length > 0 && (
        <ul className="absolute z-[1200] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {items.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => choose(p)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="font-medium">{p.name}</span>
                <span className="block truncate text-xs text-gray-500">{p.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
