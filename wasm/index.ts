// GhostPixel LSB core.
// Memory layout (managed from JS):
//   PIX .. PIX+pixLen            -> RGBA pixel buffer
//   PIX+pixLen ..                -> message bytes (input for encode, output for decode)
// Bits are stored in the LSB of R, G, B only (alpha is skipped).
// Header = 16-bit magic ("GP") + 32-bit message length = 48 bits.

const PIX: usize = 65536;
const MAGIC: u64 = 0x4750;
const HEADER_BITS: i32 = 48;

function bitOffset(i: i32): usize {
  return PIX + <usize>((i / 3) * 4 + (i % 3));
}

function putBit(i: i32, bit: u8): void {
  const p = bitOffset(i);
  store<u8>(p, (load<u8>(p) & 0xfe) | bit);
}

function getBit(i: i32): u8 {
  return load<u8>(bitOffset(i)) & 1;
}

export function capacityBytes(pixLen: i32): i32 {
  const bits = (pixLen / 4) * 3 - HEADER_BITS;
  return bits > 0 ? bits / 8 : 0;
}

// returns 1 on success, 0 if the message does not fit
export function encode(pixLen: i32, msgLen: i32): i32 {
  if (msgLen > capacityBytes(pixLen)) return 0;
  const msg = PIX + <usize>pixLen;
  const header: u64 = (MAGIC << 32) | <u64>msgLen;
  let bit: i32 = 0;

  for (let b: i32 = HEADER_BITS - 1; b >= 0; b--) {
    putBit(bit++, <u8>((header >> <u64>b) & 1));
  }
  for (let i: i32 = 0; i < msgLen; i++) {
    const byte = load<u8>(msg + <usize>i);
    for (let b: i32 = 7; b >= 0; b--) {
      putBit(bit++, <u8>((byte >> <u8>b) & 1));
    }
  }
  return 1;
}

// returns message length, -1 if no GhostPixel message, -2 if corrupt length
export function decode(pixLen: i32): i32 {
  if ((pixLen / 4) * 3 < HEADER_BITS) return -1;

  let header: u64 = 0;
  let bit: i32 = 0;
  for (let i: i32 = 0; i < HEADER_BITS; i++) {
    header = (header << 1) | <u64>getBit(bit++);
  }
  if ((header >> 32) != MAGIC) return -1;

  const len = <i32>(header & 0xffffffff);
  if (len < 0 || len > capacityBytes(pixLen)) return -2;

  const out = PIX + <usize>pixLen;
  for (let i: i32 = 0; i < len; i++) {
    let byte: u8 = 0;
    for (let b: i32 = 0; b < 8; b++) {
      byte = <u8>((byte << 1) | getBit(bit++));
    }
    store<u8>(out + <usize>i, byte);
  }
  return len;
}
