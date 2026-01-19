document.addEventListener("DOMContentLoaded", () => {

let qr;
let records = [];
let current = {};
let deferredPrompt = null;

const scanNewBtn = document.getElementById("scanNewBtn");
const reader = document.getElementById("reader");
const status = document.getElementById("status");
const captureAddrBtn = document.getElementById("captureAddrBtn");

scanNewBtn.onclick = startBarcodeScan;

// ---------------- BARCODE SCAN ----------------
function startBarcodeScan() {
  resetUI();
  status.textContent = "Scanning barcode...";
  reader.hidden = false;

  qr = new Html5Qrcode("reader");
  qr.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    barcodeDetected
  );
}

function barcodeDetected(text) {
  qr.stop();
  reader.hidden = false;

  current = { barcode: text };
  status.textContent = "Barcode detected. Align TO address and click Capture.";
  captureAddrBtn.hidden = false;
}

// ---------------- ADDRESS CAPTURE ----------------
captureAddrBtn.onclick = captureAddress;

async function captureAddress() {
  captureAddrBtn.hidden = true;
  status.textContent = "Processing address...";

  const video = document.querySelector("#reader video");
  const canvas = document.getElementById("snapshot");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Simple contrast boost
  ctx.filter = "contrast(1.4) brightness(1.1)";
  ctx.drawImage(video, 0, 0);

  qr.stop();
  reader.hidden = true;

  const result = await Tesseract.recognize(canvas, "eng");
  fillForm(result.data.text);
}

// ---------------- OCR PARSE ----------------
function fillForm(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 4);

  document.getElementById("barcode").value = current.barcode;
  document.getElementById("name").value = lines[0] || "";
  document.getElementById("address").value = lines.join(", ");

  const pin = text.match(/\b\d{6}\b/);
  const mob = text.match(/\b\d{10}\b/);

  document.getElementById("pincode").value = pin ? pin[0] : "";
  document.getElementById("mobile").value = mob ? mob[0] : "";

  status.textContent = "";
  document.getElementById("editForm").hidden = false;
}

// ---------------- SAVE ----------------
document.getElementById("okBtn").onclick = () => {
  records.push({
    barcode: current.barcode,
    name: document.getElementById("name").value,
    address: document.getElementById("address").value,
    pincode: document.getElementById("pincode").value,
    mobile: document.getElementById("mobile").value
  });

  addToList();
  resetUI();
};

function addToList() {
  const li = document.createElement("li");
  li.textContent = `${records.at(-1).barcode} | ${records.at(-1).pincode}`;
  document.getElementById("scanList").appendChild(li);
}

// ---------------- EXPORT ----------------
document.getElementById("exportBtn").onclick = () => {
  let csv = "Barcode,Name,ToAddress,Pincode,Mobile\n";
  records.forEach(r => {
    csv += `"${r.barcode}","${r.name}","${r.address}","${r.pincode}","${r.mobile}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "courier_export.csv";
  a.click();
};

// ---------------- UI ----------------
function resetUI() {
  reader.hidden = true;
  captureAddrBtn.hidden = true;
  document.getElementById("editForm").hidden = true;
  status.textContent = "";
}

// ---------------- PWA INSTALL ----------------
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("installBtn").hidden = false;
});

document.getElementById("installBtn").onclick = async () => {
  deferredPrompt.prompt();
  deferredPrompt = null;
};

});
