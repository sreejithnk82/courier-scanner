let qr;
let records = [];

let current = {
  barcode: "",
  from: "",
  to: "",
  pincode: "",
  mobile: ""
};

const scanNewBtn = document.getElementById("scanNewBtn");
const reader = document.getElementById("reader");

scanNewBtn.onclick = startBarcodeScan;

function startBarcodeScan() {
  resetUI();
  reader.hidden = false;

  qr = new Html5Qrcode("reader");
  qr.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    onBarcodeDetected
  );
}

function onBarcodeDetected(text) {
  qr.stop();
  current.barcode = text;

  document.getElementById("barcodeText").textContent = text;
  reader.hidden = true;
  document.getElementById("barcodeStep").hidden = false;
}

document.getElementById("nextToAddress").onclick = startAddressScan;

function startAddressScan() {
  document.getElementById("barcodeStep").hidden = true;
  reader.hidden = false;
  document.getElementById("addressStep").hidden = false;

  qr.start(
    { facingMode: "environment" },
    { fps: 5, qrbox: 300 },
    () => {}
  );

  setTimeout(captureForOCR, 2000);
}

async function captureForOCR() {
  const video = document.querySelector("#reader video");
  const canvas = document.getElementById("snapshot");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  qr.stop();
  reader.hidden = true;

  const result = await Tesseract.recognize(canvas, "eng");
  parseText(result.data.text);
  showConfirm();
}

function parseText(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);

  const pin = text.match(/\b\d{6}\b/);
  const mob = text.match(/\b\d{10}\b/);

  current.pincode = pin ? pin[0] : "";
  current.mobile = mob ? mob[0] : "";

  const fromIdx = lines.findIndex(l => l.toLowerCase().includes("from"));
  const toIdx = lines.findIndex(l => l.toLowerCase().includes("to"));

  current.from = fromIdx !== -1 ? lines.slice(fromIdx, fromIdx + 4).join(", ") : "";
  current.to = toIdx !== -1 ? lines.slice(toIdx, toIdx + 4).join(", ") : "";
}

function showConfirm() {
  document.getElementById("addressStep").hidden = true;
  document.getElementById("confirmStep").hidden = false;

  document.getElementById("cBarcode").textContent = current.barcode;
  document.getElementById("fromAddr").textContent = current.from;
  document.getElementById("toAddr").textContent = current.to;
  document.getElementById("pin").textContent = current.pincode;
  document.getElementById("mobile").textContent = current.mobile;
}

document.getElementById("okBtn").onclick = () => {
  records.push({ ...current });
  addToList();
  resetState();
};

function addToList() {
  const ul = document.getElementById("scanList");
  const li = document.createElement("li");
  li.textContent = `${current.barcode} | ${current.pincode}`;
  ul.appendChild(li);
}

function resetState() {
  current = { barcode:"", from:"", to:"", pincode:"", mobile:"" };
  resetUI();
}

function resetUI() {
  document.getElementById("barcodeStep").hidden = true;
  document.getElementById("addressStep").hidden = true;
  document.getElementById("confirmStep").hidden = true;
  reader.hidden = true;
}

document.getElementById("exportBtn").onclick = () => {
  let csv = "Barcode,From,To,Pincode,Mobile\n";
  records.forEach(r => {
    csv += `"${r.barcode}","${r.from}","${r.to}","${r.pincode}","${r.mobile}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "courier_export.csv";
  a.click();
};
