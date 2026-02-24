// Modal and ad CRUD
function openAddAdModal() {
  window.editingId = null;
  window.selectedFlights = [];
  window.selectedFiles = [];
  const modalTitle = document.getElementById("modal-title");
  if (modalTitle) modalTitle.textContent = "New Advertisement";

  const fields = ["ad-name","ad-title","ad-description","ad-target","ad-budget","ad-start-date","ad-end-date"];
  fields.forEach((id) => { const el = document.getElementById(id); if (el) el.value = ""; });

  const capEl = document.getElementById("ad-impression-cap"); if (capEl) capEl.value = "0";
  const statusEl = document.getElementById("ad-status"); if (statusEl) statusEl.value = "draft";

  const fileInput = document.getElementById("ad-files"); if (fileInput) fileInput.value = "";
  updateFilesList?.();

  renderFlightSelector?.();
  // close aircraft panel if open
  const aircraftPanel = document.getElementById("aircraft-status-panel");
  const aircraftIcon = document.getElementById("aircraft-toggle-icon");
  if (aircraftPanel) aircraftPanel.classList.add("hidden");
  if (aircraftIcon) aircraftIcon.textContent = "▶";

  const modal = document.getElementById("adModal"); if (modal) modal.classList.remove("hidden");
}

function openEditAdModal(id) {
  const ad = window.ads.find((a) => a.id === id);
  if (!ad) return;
  window.editingId = id;
  window.selectedFlights = [...(ad.flights || [])];
  window.selectedFiles = [];

  const modalTitle = document.getElementById("modal-title"); if (modalTitle) modalTitle.textContent = "Edit Advertisement";
  document.getElementById("ad-name").value = ad.name;
  document.getElementById("ad-title").value = ad.title;
  document.getElementById("ad-description").value = ad.description;
  document.getElementById("ad-target").value = ad.target;
  document.getElementById("ad-budget").value = ad.budget.toString();
  document.getElementById("ad-start-date").value = ad.startDate || "";
  document.getElementById("ad-end-date").value = ad.endDate || "";
  document.getElementById("ad-status").value = ad.status;

  const fileInput = document.getElementById("ad-files"); if (fileInput) fileInput.value = "";
  updateFilesList?.();

  renderFlightSelector?.();
  const modal = document.getElementById("adModal"); if (modal) modal.classList.remove("hidden");
}

function closeAddAdModal() {
  const modal = document.getElementById("adModal"); if (modal) modal.classList.add("hidden");
}

function saveAd() {
  const name = document.getElementById("ad-name").value.trim();
  const title = document.getElementById("ad-title").value.trim();
  const description = document.getElementById("ad-description").value.trim();
  const target = document.getElementById("ad-target").value.trim();
  const budget = parseFloat(document.getElementById("ad-budget").value) || 0;
  const startDate = document.getElementById("ad-start-date").value;
  const endDate = document.getElementById("ad-end-date").value;
  const status = document.getElementById("ad-status").value;

  if (!name || !title) { alert("Please fill in all required fields"); return; }

  const files = (window.selectedFiles || []).map((file) => ({ name: file.name, size: file.size, type: file.type }));

  if (window.editingId) {
    const ad = window.ads.find((a) => a.id === window.editingId);
    if (ad) {
      ad.name = name; ad.title = title; ad.description = description; ad.target = target; ad.budget = budget;
      ad.startDate = startDate; ad.endDate = endDate; ad.status = status; ad.flights = window.selectedFlights;
      if (window.selectedFiles.length > 0 || !ad.files) ad.files = files;
    }
  } else {
    window.ads.push({ id: Date.now(), name, title, description, target, budget, startDate, endDate, status, flights: window.selectedFlights, files: files, impressions:0, clicks:0, created: new Date().toLocaleDateString() });
  }

  saveData?.();
  renderAds?.();
  closeAddAdModal();
}

function deleteAd(id) {
  if (confirm("Are you sure you want to delete this ad?")) {
    window.ads = window.ads.filter((a) => a.id !== id);
    saveData?.();
    renderAds?.();
  }
}

function toggleAdStatus(id) {
  const ad = window.ads.find((a) => a.id === id);
  if (ad) { ad.status = ad.status === "active" ? "paused" : "active"; saveData?.(); renderAds?.(); }
}
