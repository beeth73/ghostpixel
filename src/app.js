"use strict";

const PIX_OFF = 65536; // must match PIX in wasm/index.ts
const $ = (id) => document.getElementById(id);

let wasm = null;
let memory = null;

// ---------- WASM setup ----------
async function initWasm() {
  const res = await fetch("wasm/stego.wasm");
  const bytes = await res.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes, {
    env: {
      abort() {
        throw new Error("WASM aborted");
      },
    },
  });
  wasm = instance.exports;
  memory = wasm.memory;
}

function ensureMemory(extraBytes) {
  const needed = PIX_OFF + extraBytes;
  const current = memory.buffer.byteLength;
  if (needed > current) {
    memory.grow(Math.ceil((needed - current) / 65536));
  }
}

// ---------- Image helpers ----------
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => reject(new Error("Could not load that image."));
    img.src = url;
  });
}

function imageToCanvas(img) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { canvas, ctx, imageData };
}

function setStatus(el, msg, type = "") {
  el.textContent = msg;
  el.className = "status " + type;
}

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active");
  });
});

// ---------- Hide ----------
$("hideFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const img = await loadImage(file);
    const pixLen = img.naturalWidth * img.naturalHeight * 4;
    const cap = wasm.capacityBytes(pixLen);
    $("capacity").textContent =
      `${img.naturalWidth}×${img.naturalHeight}px · capacity ≈ ${cap.toLocaleString()} bytes`;
  } catch (err) {
    $("capacity").textContent = err.message;
  }
});

$("hideBtn").addEventListener("click", async () => {
  const status = $("hideStatus");
  const file = $("hideFile").files[0];
  const text = $("secret").value;

  if (!file) return setStatus(status, "Pick a cover image first.", "err");
  if (!text) return setStatus(status, "Enter a secret message.", "err");

  try {
    const img = await loadImage(file);
    const { canvas, ctx, imageData } = imageToCanvas(img);
    const data = imageData.data;
    const pixLen = data.length;

    // Force opaque alpha, otherwise canvas premultiplication corrupts the LSBs
    for (let i = 3; i < pixLen; i += 4) data[i] = 255;

    const msg = new TextEncoder().encode(text);
    ensureMemory(pixLen + msg.length);

    new Uint8Array(memory.buffer, PIX_OFF, pixLen).set(data);
    new Uint8Array(memory.buffer, PIX_OFF + pixLen, msg.length).set(msg);

    const ok = wasm.encode(pixLen, msg.length);
    if (!ok) {
      const cap = wasm.capacityBytes(pixLen);
      return setStatus(
        status,
        `Message too long (${msg.length} bytes). This image holds ${cap} bytes.`,
        "err"
      );
    }

    data.set(new Uint8Array(memory.buffer, PIX_OFF, pixLen));
    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      $("hidePreview").src = url;
      $("download").href = url;
      $("hideResult").hidden = false;
      setStatus(status, `Hidden ${msg.length} bytes. Download the PNG below.`, "ok");
    }, "image/png");
  } catch (err) {
    setStatus(status, err.message, "err");
  }
});

// ---------- Reveal ----------
$("revealBtn").addEventListener("click", async () => {
  const status = $("revealStatus");
  const out = $("revealOut");
  out.hidden = true;

  const file = $("revealFile").files[0];
  if (!file) return setStatus(status, "Pick a PNG first.", "err");

  try {
    const img = await loadImage(file);
    const { imageData } = imageToCanvas(img);
    const pixLen = imageData.data.length;

    ensureMemory(pixLen + Math.ceil(pixLen / 8) + 16);
    new Uint8Array(memory.buffer, PIX_OFF, pixLen).set(imageData.data);

    const len = wasm.decode(pixLen);
    if (len === -1) return setStatus(status, "No hidden GhostPixel message found.", "err");
    if (len === -2) return setStatus(status, "Hidden data looks corrupted.", "err");

    const bytes = new Uint8Array(memory.buffer, PIX_OFF + pixLen, len).slice();
    out.textContent = new TextDecoder().decode(bytes);
    out.hidden = false;
    setStatus(status, `Recovered ${len} bytes.`, "ok");
  } catch (err) {
    setStatus(status, err.message, "err");
  }
});

// ---------- Boot ----------
initWasm().catch((err) => {
  console.error(err);
  alert("Failed to load WASM. Did you run `npm run build` and serve over http?");
});
