// Flight selector UI
function renderFlightSelector() {
  const container = document.getElementById("flights-selector");
  if (!container) return;

  let html = "";

  for (const [name, data] of Object.entries(fleets)) {
    if (data.type === "fleet") {
      const isExpanded = document.getElementById(`fleet-${name}`)?.classList.contains("expanded") || false;
      const expandIcon = isExpanded ? "▼" : "▶";
      html += `
        <div class="mb-2 border border-gray-300 rounded overflow-hidden">
          <div class="flex items-center gap-2 p-2 bg-purple-100 cursor-pointer font-bold text-xs text-purple-900 select-none hover:bg-purple-200" onclick="toggleFleetExpanded('${name}')">
            <span id="${name}-toggle">${expandIcon}</span>
            <span>${name}</span>
          </div>
          <div class="p-2 bg-gray-50 border-t border-gray-300 hidden" id="fleet-${name}">
      `;
      for (const flight of data.flights) {
        const checked = window.selectedFlights.includes(flight) ? "checked" : "";
        html += `
          <label class="flex items-center gap-2 my-1">
            <input type="checkbox" value="${flight}" ${checked} onchange="toggleFlight('${flight}')" />
            ${flight}
          </label>
        `;
      }
      html += `
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}

function toggleFleetExpanded(fleetName) {
  const container = document.getElementById(`fleet-${fleetName}`);
  const toggle = document.getElementById(`${fleetName}-toggle`);
  if (container) {
    container.classList.toggle("hidden");
    if (toggle) {
      toggle.textContent = container.classList.contains("hidden") ? "▶" : "▼";
    }
  }
}

function toggleFlight(flightName) {
  const idx = window.selectedFlights.indexOf(flightName);
  if (idx > -1) {
    window.selectedFlights.splice(idx, 1);
  } else {
    window.selectedFlights.push(flightName);
  }
  // update aircraft status panel if open
  if (!document.getElementById("aircraft-status-panel")?.classList.contains("hidden")) {
    updateAircraftStatusList?.();
  }
}
