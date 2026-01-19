document.addEventListener("DOMContentLoaded", () => {

  let qr;
  let records = [];
  let current = {};

  const scanNewBtn = document.getElementById("scanNewBtn");
  const reader = document.getElementById("reader");
  const status = document.getElementById("status");
  const okBtn = document.getElementById("okBtn");
  const exportBtn = document.getElementById("exportBtn");

  scanNewBtn.onclick = startBarcodeScan;

  function startBarcodeScan() {
    resetUI();
    status.textContent = "Scanning barcode...";
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
    reader.hidden = true;

    current = { barcode: text };
    status.textContent = "Barcode detected. Scanning address...";

    setTimeout(startAddressScan, 500);
  }

  function startAddressScan() {
    reader.hidden = false;

    qr.start(
      { facingMode: "environment" },
      { fps: 5, qrbox: 300 },
      () => {}
    );

    setTimeout(captureAndOCR, 2500);
  }

  async function captureAndOCR() {
    const video = document.querySelector("#reader video");
    const canvas = document.getElementById("snapshot");
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    qr.stop();
    reader.hidden = true;

    status.textContent = "Processing address...";

    const result = await Tesseract.recognize(canvas, "eng");
    fillForm(result.data.text);
  }

  function fillForm(text) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    const pin = text.match(/\b\d{6}\b/);
    const mob = text.match(/\b\d{10}\b/);

    document.getElementById("name").value = lines[0] || "";
    document.getElementById("address").value = lines.slice(1).join(", ");
    document.getElementById("pincode").value = pin ? pin[0] : "";
    document.getElementById("mobile").value = mob ? mob[0] : "";

    status.textContent = "";
    document.getElementById("editForm").hidden = false;
  }

  okBtn.onclick = () => {
    current.name = document.getElementById("name").value;
    current.address = document.getElementById("address").value;
    current.pincode = document.getElementById("pincode").value;
    current.mobile = document.getElementById("mobile").value;

    records.push({ ...current });
    addToList(current);

    resetState();
  };

  function addToList(item) {
    const li = document.createElement("li");
    li.textContent = `${item.barcode} | ${item.pincode}`;
    document.getElementById("scanList").appendChild(li);
  }

  function resetState() {
    current = {};
    document.getElementById("editForm").hidden = true;
    status.textContent = "";
  }

  function resetUI() {
    document.getElementById("editForm").hidden = true;
    reader.hidden = true;
    status.textContent = "";
  }

  exportBtn.onclick = () => {
    let csv = "Barcode,Name,Address,Pincode,Mobile\n";
    records.forEach(r => {
      csv += `"${r.barcode}","${r.name}","${r.address}","${r.pincode}","${r.mobile}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "courier_export.csv";
    a.click();
  };

});
