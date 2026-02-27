"use client";

import { useState } from "react";


const fleets = {
  "Fleet A": { type: "fleet", flights: ["AA101", "AA102", "AA103", "AA104"] },
  "Fleet B": { type: "fleet", flights: ["BA201", "BA202", "BA203"] },
};



export default function FlightSelector() {
  const [expandedFleets, setExpandedFleets] = useState<string[]>([]);
  const [selectedFlights, setSelectedFlights] = useState<string[]>([]);

  const toggleFleetExpanded = (fleetName: string) => {
    setExpandedFleets((prev) =>
      prev.includes(fleetName)
        ? prev.filter((f) => f !== fleetName)
        : [...prev, fleetName]
    );
  };

  const toggleFlight = (flightName: string) => {
    setSelectedFlights((prev) =>
      prev.includes(flightName)
        ? prev.filter((f) => f !== flightName)
        : [...prev, flightName]
    );
  };

  return (
    <div>
      {Object.entries(fleets).map(([name, data]) => {
        if (data.type !== "fleet") return null;

        const isExpanded = expandedFleets.includes(name);

        return (
          <div
            key={name}
            className="mb-2 border border-gray-300 rounded overflow-hidden"
          >
            {/* Fleet Header */}
            <div
              className="flex items-center gap-2 p-2 bg-purple-100 cursor-pointer font-bold text-xs text-purple-900 select-none hover:bg-purple-200"
              onClick={() => toggleFleetExpanded(name)}
            >
              <span>{isExpanded ? "▼" : "▶"}</span>
              <span>{name}</span>
            </div>

            {/* Flights */}
            {isExpanded && (
              <div className="p-2 bg-gray-50 border-t border-gray-300">
                {data.flights.map((flight) => (
                  <label
                    key={flight}
                    className="flex items-center gap-2 my-1"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFlights.includes(flight)}
                      onChange={() => toggleFlight(flight)}
                    />
                    {flight}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}