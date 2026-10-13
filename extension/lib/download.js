export async function downloadFile(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  try {
    return await chrome.downloads.download({ url, filename, saveAs: true });
  } finally {
    // Keep the blob alive while the save dialog and download are being handled.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
