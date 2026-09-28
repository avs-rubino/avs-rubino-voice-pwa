import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom non implementa il canvas 2D.
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  measureText: vi.fn((t) => ({ width: t.length * 20 })),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  drawImage: vi.fn(),
  beginPath: vi.fn(),
  roundRect: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  set fillStyle(_v) {},
  set font(_v) {},
  set textAlign(_v) {},
  set textBaseline(_v) {},
}));
HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob(['x'], { type: 'image/png' })));

// jsdom non carica risorse: senza questo stub `new Image()` non scatena mai onload/onerror
// e ogni render attenderebbe il timeout completo del logo. Default: errore immediato,
// che esercita il percorso fail-soft. I test che verificano il disegno del logo
// sovrascrivono localmente questo stub per scatenare onload.
global.Image = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }
  set src(_v) {
    setTimeout(() => this.onerror?.(new Error('jsdom: image load non supportato')), 0);
  }
};

// jsdom non implementa le Object URL: servono per il percorso di fallback download.
URL.createObjectURL = vi.fn(() => 'blob:mock-url');
URL.revokeObjectURL = vi.fn();
