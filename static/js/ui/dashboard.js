// Dashboard rendering and aircraft status
function updateMetrics() {
  const totalAds = document.getElementById("total-ads"); if (totalAds) totalAds.textContent = window.ads.length.toString();
  const activeAds = document.getElementById("active-ads"); if (activeAds) activeAds.textContent = window.ads.filter((a) => a.status === "active").length.toString();
  const totalImpressions = document.getElementById("total-impressions"); if (totalImpressions) totalImpressions.textContent = window.ads.reduce((sum,a)=>sum+a.impressions,0).toLocaleString();
  const totalClicks = document.getElementById("total-clicks"); if (totalClicks) totalClicks.textContent = window.ads.reduce((sum,a)=>sum+a.clicks,0).toLocaleString();
}

function renderAds() {
  const container = document.getElementById("ads-container"); if (!container) return;

  if (window.ads.length === 0) {
    container.innerHTML = `\n      <div class="text-center py-6 text-gray-500">\n        <div class="text-4xl mb-2">📢</div>\n        <div>No advertisements yet. Create one to get started.</div>\n      </div>\n    `; updateMetrics(); return;
  }

  let html = `\n    <table class="w-full border-collapse text-sm">\n      <thead>\n        <tr>\n          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Campaign</th>\n          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Title</th>\n          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Files</th>\n          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Flights</th>\n          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Budget</th>\n          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Impressions</th>\n          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Clicks</th>\n          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Status</th>\n          <th class="text-left p-2 border-b-2 border-gray-300 bg-gray-100 font-bold">Action</th>\n        </tr>\n      </thead>\n      <tbody>\n  `;

  window.ads.forEach((ad) => {
    let badgeClass = "bg-gray-100 text-gray-900";
    if (ad.status === "active") badgeClass = "bg-green-100 text-green-900";
    else if (ad.status === "paused") badgeClass = "bg-red-100 text-red-900";
    else if (ad.status === "draft") badgeClass = "bg-purple-100 text-purple-900";

    const flightCount = (ad.flights || []).length;
    const flightText = flightCount === 0 ? "No flights" : `${flightCount} selected`;

    const fileCount = (ad.files || []).length;
    const fileText = fileCount === 0 ? "No files" : `${fileCount} file${fileCount > 1 ? 's' : ''}`;

    html += `\n      <tr class="hover:bg-gray-50 cursor-pointer" onclick="toggleAircraftExpand(${ad.id})">\n        <td class="p-3 border-b border-gray-300"><strong>${ad.name}</strong></td>\n        <td class="p-3 border-b border-gray-300">${ad.title}</td>\n        <td class="p-3 border-b border-gray-300">\n          <button class="px-2 py-1 bg-blue-100 rounded text-xs text-blue-900 font-semibold cursor-pointer hover:bg-blue-200" onclick="event.stopPropagation(); toggleFileDetails(${ad.id})" id="files-btn-${ad.id}">\n            ${fileText}\n          </button>\n          <div id="files-detail-${ad.id}" style="display:none;">\n            <div class="mt-2 p-2 bg-gray-50 rounded border border-gray-300 text-xs" id="files-list-${ad.id}"></div>\n          </div>\n        </td>\n        <td class="p-3 border-b border-gray-300">\n          <span class="px-2 py-1 bg-purple-100 rounded text-xs text-purple-900 font-semibold">${flightText}</span>\n        </td>\n        <td class="p-3 border-b border-gray-300">$${ad.budget.toLocaleString()}</td>\n        <td class="p-3 border-b border-gray-300">${ad.impressions.toLocaleString()}</td>\n        <td class="p-3 border-b border-gray-300">${ad.clicks.toLocaleString()}</td>\n        <td class="p-3 border-b border-gray-300"><span class="inline-block px-2 py-1 rounded text-xs font-medium ${badgeClass}">${ad.status.toUpperCase()}</span></td>\n        <td class="p-3 border-b border-gray-300">\n          <div class="flex gap-2" onclick="event.stopPropagation();">\n            <button class="bg-gray-900 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-gray-700" onclick="openEditAdModal(${ad.id})">Edit</button>\n            <button class="bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-red-700" onclick="deleteAd(${ad.id})">Delete</button>\n          </div>\n        </td>\n      </tr>\n      <tr id="aircraft-expand-${ad.id}" class="hidden">\n        <td colspan="9" class="p-4 bg-indigo-50 border-b border-gray-300">\n          <div class="font-semibold text-indigo-900 mb-3">Aircraft Status</div>\n          <div id="aircraft-status-${ad.id}" class="grid grid-cols-2 gap-4"></div>\n        </td>\n      </tr>\n    `;
  });

  html += `\n      </tbody>\n    </table>\n  `;

  container.innerHTML = html;
  updateMetrics();
}

function toggleFileDetails(adId) {
  const detail = document.getElementById(`files-detail-${adId}`);
  const btn = document.getElementById(`files-btn-${adId}`);
  const list = document.getElementById(`files-list-${adId}`);

  if (!detail || !btn || !list) return;

  if (detail.style.display === "none") {
    const ad = window.ads.find((a) => a.id === adId);
    const files = ad?.files || [];
    if (files.length > 0) {
      list.innerHTML = files.map((f) => `<div>📄 ${f.name} (${(f.size / 1024).toFixed(2)} KB)</div>`).join("");
    } else {
      list.innerHTML = '<div class="text-gray-500">No files attached</div>';
    }
    detail.style.display = "block";
    btn.style.background = "#dbeafe";
  } else {
    detail.style.display = "none";
    btn.style.background = "#eff6ff";
  }
}

function toggleAircraftExpand(adId) {
  const expandRow = document.getElementById(`aircraft-expand-${adId}`);
  if (!expandRow) return;

  const isHidden = expandRow.classList.contains("hidden");
  
  if (isHidden) {
    expandRow.classList.remove("hidden");
    populateAircraftStatus(adId);
  } else {
    expandRow.classList.add("hidden");
  }
}

function populateAircraftStatus(adId) {
  const ad = window.ads.find((a) => a.id === adId);
  if (!ad) return;

  const statusDiv = document.getElementById(`aircraft-status-${adId}`);
  if (!statusDiv) return;

  const flights = ad.flights || [];
  
  if (flights.length === 0) {
    statusDiv.innerHTML = '<div class="text-gray-500 col-span-2 text-center py-4">No flights assigned to this ad</div>';
    return;
  }

  let html = "";
  flights.forEach((flight) => {
    const statusObj = aircraftStatus[flight] || { status: "Unknown", issue: { hasIssue: false, message: "No data" } };

    let statusColor = "bg-gray-100 text-gray-900";
    if (statusObj.status === "Active") {
      statusColor = "bg-green-100 text-green-900";
    } else if (statusObj.status === "On Ground") {
      statusColor = "bg-blue-100 text-blue-900";
    } else if (statusObj.status === "Maintenance") {
      statusColor = "bg-red-100 text-red-900";
    }

    const issue = statusObj.issue || { hasIssue: false, message: "No issues reported" };
    const issueBadge = issue.hasIssue ? '<span class="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-900">ISSUE</span>' : '<span class="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-900">OK</span>';

    html += `\n      <div class="p-3 bg-white border border-indigo-200 rounded">\n        <div class="font-semibold text-indigo-900 mb-2">✈ ${flight}</div>\n        <div class="flex gap-2 mb-2 items-center">\n          <span class="px-2 py-1 rounded text-xs font-medium ${statusColor}">${statusObj.status}</span>\n          ${issueBadge}\n        </div>\n        <div class="text-xs text-gray-600">\n          <div><strong>Ad Issue Log:</strong> ${issue.message}</div>\n        </div>\n      </div>\n    `;
  });

  statusDiv.innerHTML = html;
}
