// Main initializer
function initializeApp() {
  // close modal on outside click
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("adModal");
    if (e.target === modal) closeAddAdModal?.();
  });

  const fileInput = document.getElementById("ad-files");
  if (fileInput) fileInput.addEventListener("change", handleFileSelection);

  // initial render
  renderFlightSelector?.();
  renderAds?.();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
