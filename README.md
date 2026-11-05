# 👻 GhostPixel

**LSB image steganography in the browser, built with vanilla JavaScript and WebAssembly.**

![Status](https://img.shields.io/badge/status-complete-brightgreen)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?logo=javascript&logoColor=black)
![WebAssembly](https://img.shields.io/badge/WebAssembly-AssemblyScript-654FF0?logo=webassembly&logoColor=white)
![Runs](https://img.shields.io/badge/runs-100%25%20client--side-blue)

GhostPixel hides a text message inside the pixels of an image, and extracts it again, without changing how the image looks. Everything runs locally in your browser. No file or message is ever uploaded to a server.

---

## Academic Details

| | |
|---|---|
| **Institution** | Fr. Conceicao Rodrigues College of Engineering, Bandra (West), Mumbai |
| **Department** | Computer Engineering |
| **Academic Year** | 2026-27 |
| **Class / Semester** | TE, Semester V |
| **Course** | Cyber Security |
| **Assessment** | Mini-project (practical exam) |
| **Project Title** | GhostPixel: Image Steganography Tool |

## Team

| Name | Roll No. | GitHub |
|---|---|---|
| Bhushan Ladgaonkar | 10611 | [@Beeth73](https://github.com/Beeth73) |
| Sakshi | 10895 | [@sakshi84659-dev](https://github.com/sakshi84659-dev) |

---

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Testing and Security Evaluation](#testing-and-security-evaluation)
- [Limitations](#limitations)
- [Ethical Use](#ethical-use)
- [Future Work](#future-work)
- [Mapping to the Assessment Rubric](#mapping-to-the-assessment-rubric)
- [References](#references)

---

## Features

- **Hide** a text message inside any image and download the result as a PNG.
- **Reveal** a hidden message from a GhostPixel PNG.
- **Capacity check**: shows how many bytes a chosen image can hold before you start typing.
- **Magic-number header**: Reveal can tell "no hidden message" apart from real data.
- **Fast core**: the bit manipulation is done in WebAssembly, so even 14-megapixel photos are processed quickly.
- **Private by design**: 100% client-side. Nothing leaves your machine.
- **Zero runtime dependencies**: no frameworks, only HTML, CSS, JS and one `.wasm` file.

## How It Works

GhostPixel uses **Least Significant Bit (LSB) steganography**. Each colour channel of a pixel is an 8-bit number. Changing only the lowest bit alters the value by at most 1 out of 255, which the human eye cannot see. We store one message bit in the lowest bit of each **R, G and B** channel (alpha is skipped).

```text
Original pixel   R = 1100 1010   G = 0111 0001   B = 1010 0110
Message bits           1               0               1
Stego pixel      R = 1100 1011   G = 0111 0000   B = 1010 0111
```

Every hidden message starts with a 48-bit header:

| Field | Size | Purpose |
|---|---|---|
| Magic | 16 bits | `0x4750` (ASCII "GP") marks the image as a GhostPixel image |
| Length | 32 bits | Number of message bytes that follow |

For the full design, diagrams and memory layout, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## Tech Stack

| Layer | Technology |
|---|---|
| UI | HTML5, CSS3, vanilla JavaScript (ES2020) |
| Image access | Canvas API (`getImageData`, `putImageData`, `toBlob`) |
| Core algorithm | AssemblyScript compiled to WebAssembly |
| Build | `assemblyscript` (`asc`) via npm |
| Dev server | Python 3 `http.server` (any static server works) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer (with npm)
- Python 3 (only used as a simple static file server)
- A modern browser (Chrome, Edge, Firefox, Safari)

### Install and run

```bash
# 1. Clone
git clone https://github.com/Beeth73/ghostpixel.git
cd ghostpixel

# 2. Install the compiler
npm install

# 3. Build the WebAssembly module
npm run build

# 4. Start a local server
npm start
```

Open **http://localhost:8000** in your browser.

> **Why a server?** Browsers block `fetch()` of `.wasm` files from `file://` URLs, so `index.html` must be served over HTTP.

The compiled `wasm/stego.wasm` is committed to the repo, so you can skip steps 2 and 3 and just run `npm start`.

### Deploy on GitHub Pages (optional)

1. Go to **Settings → Pages**.
2. Set the source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site will be live at `https://beeth73.github.io/ghostpixel/`.

## Usage

**Hide a message**

1. Open the **Hide** tab and choose a cover image. The capacity is displayed.
2. Type your secret message.
3. Click **Hide message**, then **Download PNG**.

**Reveal a message**

1. Open the **Reveal** tab and choose the downloaded PNG.
2. Click **Reveal message** to see the hidden text.

> **Always share the output as PNG.** JPEG is lossy and destroys the hidden bits.

## Project Structure

```text
ghostpixel/
├── index.html          # UI: Hide and Reveal tabs
├── src/
│   ├── app.js          # File input, canvas I/O, WASM glue
│   └── style.css       # Styling
├── wasm/
│   ├── index.ts        # AssemblyScript source (encode / decode core)
│   └── stego.wasm      # Compiled module (generated by npm run build)
├── ARCHITECTURE.md     # Design, diagrams, memory layout
├── package.json        # Scripts: build, start
└── README.md
```

## Testing and Security Evaluation

| # | Test | Expected result | Result |
|---|---|---|---|
| 1 | Hide a message, download the PNG, reveal it | Original text is recovered | Pass |
| 2 | Reveal from an untouched, ordinary PNG | "No hidden GhostPixel message found." | Pass |
| 3 | Convert the stego PNG to JPEG, then reveal | Message is lost (lossy compression) | Expected failure |
| 4 | Message larger than image capacity | Rejected with a capacity error | Pass |
| 5 | Independent decode in Python (not using the WASM code) | Header `0x4750`, length and text match | Pass |

**Independent verification.** A 4320×3240 stego image was decoded with a separate Python script. It read the header as `47 50 00 00 00 14` (magic `GP`, length 20) and recovered the exact message, confirming the bit order and layout are correct and the format is well defined.

**Security observations**

- **Imperceptibility**: changing only the lowest bit of a channel changes its value by at most 1, which is invisible to the eye.
- **Detectability**: LSB embedding is detectable by statistical steganalysis (for example chi-square or RS analysis), especially when the payload is large.
- **Confidentiality**: the message is hidden, not encrypted. Anyone who knows the format can extract it.
- **Robustness**: not robust against JPEG compression, resizing, cropping or filters.

## Limitations

- The message is **not encrypted**. Hiding is not the same as protecting.
- Output must stay **PNG** (lossless). Any lossy re-encoding destroys the data.
- Embedding is **sequential**, which makes it easier to detect than randomised embedding.
- Text messages only (the core works on raw bytes, so files could be added).
- Very large images need enough browser memory to hold a copy of the pixels in WASM.

## Ethical Use

Steganography is a dual-use technique. It has legitimate uses (watermarking, privacy, censorship resistance) but can also be misused to conceal malicious data. This project is built **for education** as part of a cyber security course. Use it responsibly and in line with applicable law, including the Indian IT Act, 2000.

## Future Work

- Optional password-based encryption (AES-GCM through the Web Crypto API) before embedding.
- Pseudo-random pixel selection seeded by a key, to resist steganalysis.
- Support for hiding arbitrary files, not just text.
- A built-in LSB-plane visualiser and a chi-square detector for the demo.
- Error-correcting codes to survive mild image modification.

## Mapping to the Assessment Rubric

| Rubric item | Marks | Where it is covered |
|---|---|---|
| Problem definition, objectives and literature survey | 5 | [How It Works](#how-it-works), [References](#references) |
| System design and methodology | 5 | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Implementation and functionality | 10 | `wasm/index.ts`, `src/app.js`, `index.html` |
| Testing, results and security evaluation | 5 | [Testing and Security Evaluation](#testing-and-security-evaluation) |
| Project presentation, demonstration and viva voce | 5 | Live demo via `npm start` |

## References

1. N. Provos and P. Honeyman, "Hide and Seek: An Introduction to Steganography," *IEEE Security & Privacy*, 2003.
2. A. Cheddad, J. Condell, K. Curran and P. McKevitt, "Digital image steganography: Survey and analysis of current methods," *Signal Processing*, 2010.
3. [WebAssembly documentation](https://webassembly.org/)
4. [AssemblyScript documentation](https://www.assemblyscript.org/)
5. [MDN: Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
6. Information Technology Act, 2000 (India), as amended in 2008.
