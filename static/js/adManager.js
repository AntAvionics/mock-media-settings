// FLIGHTS & FLEETS DATA
const fleets = {
  "Fleet A": {
    type: "fleet",
    flights: ["AA101", "AA102", "AA103", "AA104"],
  },
  "Fleet B": { type: "fleet", flights: ["BA201", "BA202", "BA203"] },
};

// DATA STORAGE
let ads = JSON.parse(localStorage.getItem("ads") || "[]");
let editingId = null;
let selectedFlights = [];

// FLIGHT SELECTOR FUNCTIONS
function renderFlightSelector() {
  const container = document.getElementById("flights-selector");
  if (!container) return;

  let html = "";

  // Fleets section with dropdowns
  for (const [name, data] of Object.entries(fleets)) {
    if (data.type === "fleet") {
      const isExpanded =
        document
          .getElementById(`fleet-${name}`)
          ?.classList.contains("expanded") || false;
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
        const checked = selectedFlights.includes(flight) ? "checked" : "";
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

  // Individual flights section
  const individualFlights = [];
  for (const [key, data] of Object.entries(fleets)) {
    if (data.type === "group") {
      individualFlights.push(...data.flights);
    }
  }
  if (individualFlights.length > 0) {
    html +=
      '<div class="mb-2 border border-gray-300 rounded overflow-hidden"><div class="flex items-center gap-2 p-2 bg-green-100 cursor-pointer font-bold text-xs text-green-900 select-none hover:bg-green-200" onclick="toggleFleetExpanded(\'individual\')"><span id="individual-toggle">▶</span><span>Individual Flights</span></div><div class="p-2 bg-gray-50 border-t border-gray-300 hidden" id="fleet-individual">';
    for (const flight of individualFlights) {
      const checked = selectedFlights.includes(flight) ? "checked" : "";
      html += `
        <label class="flex items-center gap-2 my-1">
          <input type="checkbox" value="${flight}" ${checked} onchange="toggleFlight('${flight}')" />
          ${flight}
        </label>
      `;
    }
    html += "</div></div>";
  }

  container.innerHTML = html;
}

function toggleFleetExpanded(fleetName) {
  const container = document.getElementById(`fleet-${fleetName}`);
  const toggle = document.getElementById(`${fleetName}-toggle`);
  if (container) {
    container.classList.toggle("hidden");
    if (toggle) {
      toggle.textContent = container.classList.contains("hidden")
        ? "▶"
        : "▼";
    }
  }
}

function toggleFlight(flightName) {
  const idx = selectedFlights.indexOf(flightName);
  if (idx > -1) {
    selectedFlights.splice(idx, 1);
  } else {
    selectedFlights.push(flightName);
  }
}

// MODAL FUNCTIONS
function openAddAdModal() {
  editingId = null;
  selectedFlights = [];
  const modalTitle = document.getElementById("modal-title");
  if (modalTitle) modalTitle.textContent = "New Advertisement";

  const fields = [
    "ad-name",
    "ad-title",
    "ad-description",
    "ad-target",
    "ad-budget",
    "ad-start-date",
    "ad-end-date",
  ];

  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const capEl = document.getElementById("ad-impression-cap");
  if (capEl) capEl.value = "0";

  const statusEl = document.getElementById("ad-status");
  if (statusEl) statusEl.value = "draft";

  renderFlightSelector();
  const modal = document.getElementById("adModal");
  if (modal) modal.classList.remove("hidden");
}

function openEditAdModal(id) {
  const ad = ads.find((a) => a.id === id);
  if (!ad) return;

  editingId = id;
  selectedFlights = [...(ad.flights || [])];

  const modalTitle = document.getElementById("modal-title");
  if (modalTitle) modalTitle.textContent = "Edit Advertisement";

  document.getElementById("ad-name").value = ad.name;
  document.getElementById("ad-title").value = ad.title;
  document.getElementById("ad-description").value = ad.description;
  document.getElementById("ad-target").value = ad.target;
  document.getElementById("ad-budget").value = ad.budget.toString();
  document.getElementById("ad-start-date").value = ad.startDate || "";
  document.getElementById("ad-end-date").value = ad.endDate || "";
  document.getElementById("ad-status").value = ad.status;

  renderFlightSelector();
  const modal = document.getElementById("adModal");
  if (modal) modal.classList.remove("hidden");
}

function closeAddAdModal() {
  const modal = document.getElementById("adModal");
  if (modal) modal.classList.add("hidden");
}

function saveAd() {
  const name = document.getElementById("ad-name").value.trim();
  const title = document.getElementById("ad-title").value.trim();
  const description = document
    .getElementById("ad-description")
    .value.trim();
  const target = document.getElementById("ad-target").value.trim();
  const budget =
    parseFloat(document.getElementById("ad-budget").value) || 0;
  const startDate = document.getElementById("ad-start-date").value;
  const endDate = document.getElementById("ad-end-date").value;
  const status = document.getElementById("ad-status").value;

  if (!name || !title) {
    alert("Please fill in all required fields");
    return;
  }

  if (editingId) {
    const ad = ads.find((a) => a.id === editingId);
    if (ad) {
      ad.name = name;
      ad.title = title;
      ad.description = description;
      ad.target = target;
      ad.budget = budget;
      ad.startDate = startDate;
      ad.endDate = endDate;
      ad.status = status;
      ad.flights = selectedFlights;
    }
  } else {
    ads.push({
      id: Date.now(),
      name,
      title,
      description,
      target,
      budget,
      startDate,
      endDate,
      status,
      flights: selectedFlights,
      impressions: 0,
      clicks: 0,
      created: new Date().toLocaleDateString(),
    });
  }

  saveData();
  renderAds();
  closeAddAdModal();
}

function deleteAd(id) {
  if (confirm("Are you sure you want to delete this ad?")) {
    ads = ads.filter((a) => a.id !== id);
    saveData();
    renderAds();
  }
}

function toggleAdStatus(id) {
  const ad = ads.find((a) => a.id === id);
  if (ad) {
    ad.status = ad.status === "active" ? "paused" : "active";
    saveData();
    renderAds();
  }
}

// DATA FUNCTIONS
function saveData() {
  localStorage.setItem("ads", JSON.stringify(ads));
}

function updateMetrics() {
  const totalAds = document.getElementById("total-ads");
  if (totalAds) totalAds.textContent = ads.length.toString();

  const activeAds = document.getElementById("active-ads");
  if (activeAds)
    activeAds.textContent = ads.filter((a) => a.status === "active").length.toString();

  const totalImpressions = document.getElementById("total-impressions");
  if (totalImpressions)
    totalImpressions.textContent = ads
      .reduce((sum, a) => sum + a.impressions, 0)
      .toLocaleString();

  const totalClicks = document.getElementById("total-clicks");
  if (totalClicks)
    totalClicks.textContent = ads
      .reduce((sum, a) => sum + a.clicks, 0)
      .toLocaleString();
}

function renderAds() {
  const container = document.getElementById("ads-container");
  if (!container) return;

  if (ads.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 text-gray-500">
        <div class="text-4xl mb-2">📢</div>
        <div>No advertisements yet. Create one to get started.</div>
      </div>
    `;
    updateMetrics();
    return;
  }

  let html = `
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Campaign</th>
          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Title</th>
          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Flights</th>
          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Budget</th>
          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Impressions</th>
          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Clicks</th>
          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Status</th>
          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  ads.forEach((ad) => {
    let badgeClass = "bg-gray-100 text-gray-900";
    if (ad.status === "active") {
      badgeClass = "bg-green-100 text-green-900";
    } else if (ad.status === "paused") {
      badgeClass = "bg-red-100 text-red-900";
    } else if (ad.status === "draft") {
      badgeClass = "bg-purple-100 text-purple-900";
    }

    const flightCount = (ad.flights || []).length;
    const flightText =
      flightCount === 0 ? "No flights" : `${flightCount} selected`;

    html += `
      <tr class="hover:bg-gray-50">
        <td class="p-3 border-b border-gray-300"><strong>${ad.name}</strong></td>
        <td class="p-3 border-b border-gray-300">${ad.title}</td>
        <td class="p-3 border-b border-gray-300">
          <button class="px-2 py-1 bg-purple-100 rounded text-xs text-purple-900 font-semibold cursor-pointer hover:bg-purple-200" onclick="toggleFlightDetails(${ad.id})" id="flights-btn-${ad.id}">
            ${flightText}
          </button>
          <div id="flights-detail-${ad.id}" style="display:none;">
            <div class="mt-2 p-2 bg-gray-50 rounded border border-gray-300 text-xs" id="flights-list-${ad.id}"></div>
          </div>
        </td>
        <td class="p-3 border-b border-gray-300">$${ad.budget.toLocaleString()}</td>
        <td class="p-3 border-b border-gray-300">${ad.impressions.toLocaleString()}</td>
        <td class="p-3 border-b border-gray-300">${ad.clicks.toLocaleString()}</td>
        <td class="p-3 border-b border-gray-300"><span class="inline-block px-2 py-1 rounded text-xs font-medium ${badgeClass}">${ad.status.toUpperCase()}</span></td>
        <td class="p-3 border-b border-gray-300">
          <div class="flex gap-2">
            <button class="bg-gray-900 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-gray-700" onclick="openEditAdModal(${ad.id})">Edit</button>
            <button class="bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-red-700" onclick="deleteAd(${ad.id})">Delete</button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
  updateMetrics();
}

function toggleFlightDetails(adId) {
  const detail = document.getElementById(`flights-detail-${adId}`);
  const btn = document.getElementById(`flights-btn-${adId}`);
  const list = document.getElementById(`flights-list-${adId}`);

  if (!detail || !btn || !list) return;

  if (detail.style.display === "none") {
    const ad = ads.find((a) => a.id === adId);
    const flights = ad?.flights || [];
    if (flights.length > 0) {
      list.innerHTML = flights.map((f) => `<div>✈ ${f}</div>`).join("");
    } else {
      list.innerHTML =
        '<div class="text-gray-500">No flights assigned</div>';
    }
    detail.style.display = "block";
    btn.style.background = "#e0d4ff";
  } else {
    detail.style.display = "none";
    btn.style.background = "#f3e8ff";
  }
}

// INITIALIZATION
function initializeApp() {
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("adModal");
    if (e.target === modal) {
      closeAddAdModal();
    }
  });

  renderFlightSelector();
  renderAds();
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
