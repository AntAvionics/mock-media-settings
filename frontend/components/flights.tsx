"use client";

import { useState, useEffect, useCallback } from "react";

type AircraftInfo = {
  id: string;
  lva?: number | null;
  lkg?: number | null;
  active?: number | null;
};

type FlightSelectorProps = {
  selectedFlights: string[];
  onFlightsChange: (flights: string[]) => void;
};

export default function FlightSelector({
  selectedFlights,
  onFlightsChange,
}: FlightSelectorProps) {
  const [aircraft, setAircraft] = useState<AircraftInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const loadAircraft = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/aircraft", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      // shape: { ok, status_code, response: { ok, aircraft: { id: {...} } } }
      const inner = body?.response ?? body;
      if (!inner?.aircraft) throw new Error("No aircraft data in response");
      const list: AircraftInfo[] = Object.values(
        inner.aircraft as Record<string, any>
      ).map((a: any) => ({
        id: String(a.id ?? a),
        lva: a.lva ?? null,
        lkg: a.lkg ?? null,
        active: a.active ?? null,
      }));
      list.sort((a, b) => a.id.localeCompare(b.id));
      setAircraft(list);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAircraft();
  }, [loadAircraft]);

  function toggleFlight(id: string) {
    if (selectedFlights.includes(id)) {
      onFlightsChange(selectedFlights.filter((f) => f !== id));
    } else {
      onFlightsChange([...selectedFlights, id]);
    }
  }

  function toggleAll() {
    const allIds = aircraft.map((a) => a.id);
    const allSelected = allIds.every((id) => selectedFlights.includes(id));
    if (allSelected) {
      onFlightsChange(selectedFlights.filter((id) => !allIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedFlights, ...allIds]));
      onFlightsChange(merged);
    }
  }

  const allIds = aircraft.map((a) => a.id);
  const allChecked =
    allIds.length > 0 && allIds.every((id) => selectedFlights.includes(id));
  const someChecked =
    !allChecked && allIds.some((id) => selectedFlights.includes(id));

  return (
    <div className="mb-2 border border-gray-300 rounded overflow-hidden">
      {/* Fleet A header */}
      <div
        className="flex items-center justify-between p-2 bg-purple-100 cursor-pointer select-none hover:bg-purple-200"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-purple-900">
            {expanded ? "▼" : "▶"}
          </span>
          <span className="font-bold text-xs text-purple-900">Fleet A</span>
          {loading && (
            <span className="text-xs text-purple-500 font-normal">
              Loading…
            </span>
          )}
          {!loading && aircraft.length > 0 && (
            <span className="text-xs text-purple-600 font-normal">
              ({aircraft.length} aircraft)
            </span>
          )}
        </div>

        {expanded && aircraft.length > 0 && (
          /* stop propagation so clicking "Select all" doesn't collapse the fleet */
          <button
            type="button"
            className="text-xs text-purple-700 font-semibold hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              toggleAll();
            }}
          >
            {allChecked ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      {/* Aircraft list */}
      {expanded && (
        <div className="p-2 bg-gray-50 border-t border-gray-300 max-h-48 overflow-y-auto">
          {error && (
            <div className="flex items-center justify-between text-xs text-red-600 mb-2">
              <span>⚠ {error}</span>
              <button
                type="button"
                onClick={loadAircraft}
                className="text-blue-600 hover:underline ml-2"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && aircraft.length === 0 && (
            <div className="text-xs text-gray-400 py-1">
              No aircraft returned by headend.
            </div>
          )}

          {aircraft.map((a) => {
            const checked = selectedFlights.includes(a.id);
            const details = [
              a.lva != null ? `LVA:${a.lva}` : null,
              a.lkg != null ? `LKG:${a.lkg}` : null,
              a.active != null ? `Active:${a.active}` : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <label
                key={a.id}
                className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleFlight(a.id)}
                  className="accent-purple-600"
                />
                <span className="text-xs font-mono font-semibold text-gray-800">
                  {a.id}
                </span>
                {details && (
                  <span className="text-xs text-gray-400 font-sans">
                    {details}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}