// Storage + global state
window.ads = JSON.parse(localStorage.getItem("ads") || "[]");
window.editingId = null;
window.selectedFlights = [];
window.selectedFiles = [];

window.saveData = function () {
  localStorage.setItem("ads", JSON.stringify(window.ads));
};
