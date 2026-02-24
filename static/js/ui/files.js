// File handling UI
function handleFileSelection(event) {
  window.selectedFiles = Array.from(event.target.files);
  updateFilesList();
}

function updateFilesList() {
  const filesList = document.getElementById("ad-files-list");
  if (!filesList) return;

  if (window.selectedFiles.length === 0) {
    filesList.innerHTML = "";
    return;
  }

  let html = '<div class="space-y-1 mt-2 p-2 bg-gray-50 rounded border border-gray-300">';
  window.selectedFiles.forEach((file, index) => {
    const size = (file.size / 1024).toFixed(2);
    html += `
      <div class="flex justify-between items-center">
        <span>📄 ${file.name} (${size} KB)</span>
        <button type="button" class="text-red-600 hover:text-red-700 text-xs font-semibold" onclick="removeFile(${index})">Remove</button>
      </div>
    `;
  });
  html += "</div>";
  filesList.innerHTML = html;
}

function removeFile(index) {
  window.selectedFiles.splice(index, 1);
  const fileInput = document.getElementById("ad-files");
  if (fileInput) fileInput.value = "";
  updateFilesList();
}
