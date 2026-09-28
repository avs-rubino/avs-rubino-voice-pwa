import { formatItalianDate } from "../utils/date";

export const STUDIO_LABELS = {
  orariFormia: "L'Ambulatorio Veterinario Specialistico Rubino",
  orariSecondoStudio: "Il Secondo Studio",
};

export const AVVISO_THEME = {
  gradientFrom: "#14b8a6", // teal-500
  gradientTo: "#0f766e",   // teal-700
  card: "rgba(2, 6, 23, 0.35)", // slate-950 translucido
  heading: "#99f6e4",      // teal-200
  text: "#ffffff",
  footer: "rgba(255, 255, 255, 0.85)",
};

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const TEXT_MAX_W = 888;      // 1080 - 2*96
const CARD_INSET_X = 72;
const CARD_PADDING_Y = 60;
const CARD_RADIUS = 48;
const LOGO_SIZE = 192;
const GAP_AFTER_LOGO = 48;
const HEADING_H = 64;
const GAP_AFTER_HEADING = 56;
const LINE_H_BODY = 88;
const GAP_BEFORE_FOOTER = 72;
const LINE_H_FOOTER = 56;

/**
 * Costruisce il testo dell'avviso a partire dall'override e dalla sede.
 * Funzione pura senza dipendenze asincrone.
 * @param {Object} override - Oggetto eccezione { dateFrom, dateTo, closed, startTime, endTime }
 * @param {string} clinicLocation - Chiave sede ("orariFormia" | "orariSecondoStudio")
 * @returns {{ heading: string, bodyLines: string[], footerLines: string[] } | null}
 */
export function buildAvvisoText(override, clinicLocation) {
  if (!override?.dateFrom) return null;

  const S = STUDIO_LABELS[clinicLocation] || STUDIO_LABELS.orariFormia;

  // Rilevamento intervallo obbligatorio (§1.8)
  const isRange = Boolean(override.dateTo) && override.dateTo !== override.dateFrom;
  const D = isRange
    ? `da ${formatItalianDate(override.dateFrom)} a ${formatItalianDate(override.dateTo)}`
    : formatItalianDate(override.dateFrom);

  let bodyText = "";

  if (override.closed) {
    bodyText = `${S} sarà chiuso ${D}`;
  } else if (override.startTime && override.endTime) {
    bodyText = `${S} sarà aperto ${D} dalle ${override.startTime} alle ${override.endTime}`;
  } else if (override.startTime) {
    bodyText = `${S} sarà aperto ${D} dalle ${override.startTime}`;
  } else if (override.endTime) {
    bodyText = `${S} sarà aperto ${D} fino alle ${override.endTime}`;
  } else {
    // Percorso difensivo irraggiungibile in produzione (§1.9)
    return null;
  }

  return {
    heading: "AVVISO",
    bodyLines: [bodyText],
    footerLines: ["avsrubino.it"],
  };
}

/**
 * Genera il nome del file immagine per l'avviso.
 * @param {Object} override
 * @returns {string}
 */
export function buildAvvisoFilename(override) {
  return `avviso-avs-rubino-${override?.dateFrom || "comunicazione"}.png`;
}

/**
 * Suddivide un testo in righe che non superano maxWidth misurate sul canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string[]}
 */
export function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Carica l'immagine del logo in modo fail-soft. Non rigetta mai.
 * @param {string} src
 * @param {number} timeoutMs
 * @returns {Promise<HTMLImageElement | null>}
 */
function loadLogoSafe(src, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    const img = new Image();
    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(img);
      }
    };
    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    };
    img.src = src;
  });
}

/**
 * Esegue il rendering 9:16 su Canvas client-side dell'avviso.
 * Nota: Il rendering dipende dai font del dispositivo, quindi l'output può variare leggermente tra device.
 * @param {{ heading: string, bodyLines: string[], footerLines: string[] }} text
 * @param {{ logoTimeoutMs?: number, logoSrc?: string }} [options]
 * @returns {Promise<Blob>}
 */
export async function renderAvvisoImage(text, options = {}) {
  const { logoTimeoutMs = 3000, logoSrc = "/avviso-logo.svg" } = options;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Impossibile ottenere il contesto 2D del canvas");
  }

  // 1. Sfondo a gradiente teal
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bgGrad.addColorStop(0, AVVISO_THEME.gradientFrom);
  bgGrad.addColorStop(1, AVVISO_THEME.gradientTo);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 2. Configurazione tipografica base
  ctx.textAlign = "center";
  // [R4] ctx.textBaseline = "top" è obbligatorio per l'algoritmo a cursore discendente
  ctx.textBaseline = "top";

  // 3. Caricamento fail-soft del logo
  const logoImg = await loadLogoSafe(logoSrc, logoTimeoutMs);
  const logoDisponibile = Boolean(logoImg);

  // 4. Calcolo righe wrapped per altezza dinamica
  ctx.font = `bold 68px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
  const bodyWrapped = text.bodyLines.flatMap((l) => wrapText(ctx, l, TEXT_MAX_W));

  // 5. Calcolo altezza card e posizione Y centrata
  const contentH =
    (logoDisponibile ? LOGO_SIZE + GAP_AFTER_LOGO : 0) +
    HEADING_H +
    GAP_AFTER_HEADING +
    bodyWrapped.length * LINE_H_BODY +
    GAP_BEFORE_FOOTER +
    text.footerLines.length * LINE_H_FOOTER;

  const cardH = contentH + 2 * CARD_PADDING_Y;
  const cardY = (CANVAS_H - cardH) / 2;
  const cardW = CANVAS_W - 2 * CARD_INSET_X;

  // 6. Disegno card semi-trasparente
  ctx.fillStyle = AVVISO_THEME.card;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(CARD_INSET_X, cardY, cardW, cardH, CARD_RADIUS);
  } else {
    ctx.rect(CARD_INSET_X, cardY, cardW, cardH);
  }
  ctx.fill();

  // 7. Disegno contenuti in sequenza a cursore discendente
  let cursorY = cardY + CARD_PADDING_Y;

  // Logo
  if (logoDisponibile && logoImg) {
    const logoX = (CANVAS_W - LOGO_SIZE) / 2;
    ctx.drawImage(logoImg, logoX, cursorY, LOGO_SIZE, LOGO_SIZE);
    cursorY += LOGO_SIZE + GAP_AFTER_LOGO;
  }

  // Heading
  ctx.font = `bold ${HEADING_H}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
  ctx.fillStyle = AVVISO_THEME.heading;
  ctx.fillText(text.heading, CANVAS_W / 2, cursorY);
  cursorY += HEADING_H + GAP_AFTER_HEADING;

  // Body
  ctx.font = `bold 68px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
  ctx.fillStyle = AVVISO_THEME.text;
  for (const line of bodyWrapped) {
    ctx.fillText(line, CANVAS_W / 2, cursorY);
    cursorY += LINE_H_BODY;
  }

  // Footer
  cursorY += GAP_BEFORE_FOOTER;
  ctx.font = `500 40px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
  ctx.fillStyle = AVVISO_THEME.footer;
  for (const line of text.footerLines) {
    ctx.fillText(line, CANVAS_W / 2, cursorY);
    cursorY += LINE_H_FOOTER;
  }

  // 8. Esportazione Blob PNG
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("toBlob ha restituito null"));
    }, "image/png");
  });
}

/**
 * Condivide l'immagine tramite Web Share API o fallback download.
 * Catena a tre stadi:
 * 1. navigator.share() se supportato
 * 2. Se share rifiuta con errore non-AbortError, fallback a download
 * 3. Fallback download con rilascio URL ritardato di 1000ms
 * @param {Blob} blob
 * @param {string} filename
 * @param {string} shareText
 * @returns {Promise<{ method: "share" | "download" | "aborted" }>}
 */
export async function shareAvvisoImage(blob, filename, shareText) {
  const file = new File([blob], filename, { type: "image/png" });

  // Stadio 1: Web Share API
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: "Avviso AVS Rubino",
        text: shareText,
      });
      return { method: "share" };
    } catch (err) {
      if (err?.name === "AbortError") {
        return { method: "aborted" };
      }
      // Stadio 2: Errore diverso da AbortError (es. permessi/OS) -> tentare fallback download
    }
  }

  // Stadio 3: Fallback Download programmatico
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Rilascio ritardato di 1000ms per evitare corruzione su Safari/Firefox/Chrome
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  return { method: "download" };
}

/**
 * Costruisce l'avviso condivisibile a partire dalla response del backend.
 * Usa res.override (già completato dal merge server-side con i default settimanali),
 * con fallback sulla proposta solo per robustezza. Vedi §1.4 del piano.
 * @param {Object} res - Response ricevuta dal backend
 * @param {Object} fallbackProposal - Proposta attiva nella GUI
 * @param {string} clinicLocation - Sede attiva
 * @param {Object} [options] - Opzioni (timeout logo, ecc.)
 * @returns {Promise<{blob: Blob, filename: string, shareText: string} | null>}
 */
export async function buildAvvisoFromResponse(res, fallbackProposal, clinicLocation, options = {}) {
  const savedOverride = res?.override || fallbackProposal;
  if (!savedOverride) return null;

  const text = buildAvvisoText(savedOverride, clinicLocation);
  if (!text) return null;

  const blob = await renderAvvisoImage(text, options);
  return {
    blob,
    filename: buildAvvisoFilename(savedOverride),
    shareText: text.bodyLines.join(" "),
  };
}
