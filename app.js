let html5QrCode;
let scannedItems = [];
let currentBarcode = null;

const startBtn = document.getElementById("startBtn");
const addBtn = document.getElementById("addBtn");
const downloadBtn = document.getElementById("downloadBtn");

startBtn.onclick = () => startScanner();

function startScanner() {
  html5QrCode = new Html5Qrcode("reader");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    onBarcodeSuccess,
    err => {}
  );

  startBtn.disabled = true;
}

async function onBarcodeSuccess(decodedText) {
  if (currentBarcode) return;

  currentBarcode = decodedText;
  addBtn.disabled = false;

  await captureFrame();
}

async function captureFrame() {
  const video = document.querySelector("#reader video");
  const canvas = document.getElementById("snapshot");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0);
}

addBtn.onclick = async () => {
  const ocrData = await runOCR();

  scannedItems.push({
    barcode: currentBarcode,
    pincode: ocrData.pincode,
    address: ocrData.address
  });

  updateList();
  resetForNext();
};

async function runOCR() {
  const canvas = document.getElementById("snapshot");

  const result = await Tesseract.recognize(
    canvas,
    "eng",
    { logger: m => console.log(m) }
  );

  return extractAddressAndPincode(result.data.text);
}

function extractAddressAndPincode(text) {
  const pincodeMatch = text.match(/\b\d{6}\b/);
  const pincode = pincodeMatch ? pincodeMatch[0] : "";

  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 5);

  return {
    address: lines.join(", "),
    pincode
  };
}

function updateList() {
  const ul = document.getElementById("scanList");
  ul.innerHTML = "";

  scannedItems.forEach((item, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${item.barcode} | ${item.pincode}`;
    ul.appendChild(li);
  });
}

function resetForNext() {
  currentBarcode = null;
  addBtn.disabled = true;
}

downloadBtn.onclick = () => {
  let csv = "Barcode,Pincode,Address\n";

  scannedItems.forEach(i => {
    csv += `"${i.barcode}","${i.pincode}","${i.address}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "courier_scans.csv";
  a.click();
};
