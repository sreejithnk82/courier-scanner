let currentBarcode = "";
let cropRect = null;
let db;
let stream;

/* ------------------ INIT ------------------ */
document.addEventListener("DOMContentLoaded", () => {
  initDB();
  bindUI();
  loadList();
});

/* ------------------ UI ------------------ */
function bindUI() {
  scanNewBtn.onclick = startBarcodeScan;
  barcodeNextBtn.onclick = startAddressCamera;
  captureBtn.onclick = captureAndOCR;
  okBtn.onclick = saveRecord;
  exportBtn.onclick = exportCSV;
}

function showScreen(id) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* ------------------ BARCODE ------------------ */
const codeReader = new ZXing.BrowserMultiFormatReader();

function startBarcodeScan() {
  showScreen("barcodeScreen");
  barcodeText.innerText = "";
  barcodeNextBtn.disabled = true;

  codeReader.decodeFromVideoDevice(null, barcodeVideo, (result) => {
    if (result) {
      if (isDuplicate(result.text)) {
        alert("Duplicate barcode!");
        return;
      }
      currentBarcode = result.text;
      barcodeText.innerText = result.text;
      barcodeNextBtn.disabled = false;
      codeReader.reset();
    }
  });
}

/* ------------------ ADDRESS CAMERA ------------------ */
async function startAddressCamera() {
  showScreen("captureScreen");

  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  addressVideo.srcObject = stream;
  addressVideo.play();

  initCropUI();
}

/* ------------------ CROPPING UI ------------------ */
function initCropUI() {
  const canvas = overlayCanvas;
  const ctx = canvas.getContext("2d");

  canvas.width = addressVideo.clientWidth;
  canvas.height = addressVideo.clientHeight;

  let startX, startY, dragging = false;

  canvas.onmousedown = e => {
    dragging = true;
    startX = e.offsetX;
    startY = e.offsetY;
  };

  canvas.onmousemove = e => {
    if (!dragging) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, e.offsetX - startX, e.offsetY - startY);
  };

  canvas.onmouseup = e => {
    dragging = false;
    cropRect = {
      x: startX,
      y: startY,
      w: e.offsetX - startX,
      h: e.offsetY - startY
    };
  };
}

/* ------------------ CAPTURE + OCR ------------------ */
function captureAndOCR() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const vw = addressVideo.videoWidth;
  const vh = addressVideo.videoHeight;

  canvas.width = vw;
  canvas.height = vh;

  ctx.drawImage(addressVideo, 0, 0);

  let img = ctx.getImageData(
    cropRect.x * vw / overlayCanvas.width,
    cropRect.y * vh / overlayCanvas.height,
    cropRect.w * vw / overlayCanvas.width,
    cropRect.h * vh / overlayCanvas.height
  );

  preprocessImage(img);
  ctx.putImageData(img, 0, 0);

  runOCR(canvas.toDataURL());
}

/* ------------------ IMAGE PREPROCESS ------------------ */
function preprocessImage(img) {
  for (let i = 0; i < img.data.length; i += 4) {
    const gray =
      0.299 * img.data[i] +
      0.587 * img.data[i + 1] +
      0.114 * img.data[i + 2];

    const threshold = gray > 140 ? 255 : 0;

    img.data[i] = img.data[i + 1] = img.data[i + 2] = threshold;
  }
}

/* ------------------ OCR ------------------ */
async function runOCR(image) {
  const result = await Tesseract.recognize(image, "eng");
  fillEditForm(result.data.text);
}

/* ------------------ PARSE ------------------ */
function fillEditForm(text) {
  showScreen("editScreen");

  editBarcode.value = currentBarcode;
  editAddress.value = text;

  const pin = text.match(/\b\d{6}\b/);
  if (pin) editPin.value = pin[0];

  const phone = text.match(/\b\d{10}\b/);
  if (phone) editPhone.value = phone[0];
}

/* ------------------ STORAGE ------------------ */
function initDB() {
  const req = indexedDB.open("CourierDB", 1);
  req.onupgradeneeded = e => {
    db = e.target.result;
    db.createObjectStore("records", { keyPath: "barcode" });
  };
  req.onsuccess = e => db = e.target.result;
}

function saveRecord() {
  const rec = {
    barcode: editBarcode.value,
    name: editName.value,
    address: editAddress.value,
    pin: editPin.value,
    phone: editPhone.value
  };

  const tx = db.transaction("records", "readwrite");
  tx.objectStore("records").add(rec);
  tx.oncomplete = () => {
    showScreen("homeScreen");
    loadList();
  };
}

function loadList() {
  if (!db) return;
  const tx = db.transaction("records", "readonly");
  const req = tx.objectStore("records").getAll();
  req.onsuccess = () => {
    recordList.innerHTML = "";
    req.result.forEach(r => {
      const li = document.createElement("li");
      li.innerText = `${r.barcode} – ${r.pin}`;
      recordList.appendChild(li);
    });
  };
}

function isDuplicate(barcode) {
  // quick UI-level check
  return document.body.innerText.includes(barcode);
}

/* ------------------ CSV ------------------ */
function exportCSV() {
  const tx = db.transaction("records", "readonly");
  const req = tx.objectStore("records").getAll();
  req.onsuccess = () => {
    let csv = "Barcode,Name,Address,PIN,Phone\n";
    req.result.forEach(r => {
      csv += `"${r.barcode}","${r.name}","${r.address}","${r.pin}","${r.phone}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "courier.csv";
    a.click();
  };
}
