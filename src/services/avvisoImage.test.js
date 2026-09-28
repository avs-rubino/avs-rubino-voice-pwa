import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildAvvisoText,
  buildAvvisoFilename,
  renderAvvisoImage,
  shareAvvisoImage,
  buildAvvisoFromResponse,
  STUDIO_LABELS,
} from "./avvisoImage";

describe("avvisoImage service", () => {
  const originalCanShare = navigator.canShare;
  const originalShare = navigator.share;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalCanShare !== undefined) {
      Object.defineProperty(navigator, "canShare", {
        value: originalCanShare,
        configurable: true,
        writable: true,
      });
    } else {
      delete navigator.canShare;
    }
    if (originalShare !== undefined) {
      Object.defineProperty(navigator, "share", {
        value: originalShare,
        configurable: true,
        writable: true,
      });
    } else {
      delete navigator.share;
    }
  });

  describe("Composizione Testo (Funzioni Pure)", () => {
    it("1: closed: true, giorno singolo -> contiene 'sarà chiuso' e la data formattata", () => {
      const override = {
        dateFrom: "2026-09-25",
        closed: true,
      };
      const res = buildAvvisoText(override, "orariFormia");
      expect(res).not.toBeNull();
      expect(res.bodyLines[0]).toContain("sarà chiuso");
      expect(res.bodyLines[0]).toContain("25");
      expect(res.bodyLines[0].toLowerCase()).toContain("settembre");
      expect(res.bodyLines[0]).toContain("2026");
    });

    it("2: closed: true, intervallo reale (dateTo !== dateFrom) -> contiene 'da ... a ...' con entrambe le date", () => {
      const override = {
        dateFrom: "2026-09-25",
        dateTo: "2026-09-27",
        closed: true,
      };
      const res = buildAvvisoText(override, "orariFormia");
      expect(res).not.toBeNull();
      expect(res.bodyLines[0]).toMatch(/da .+ a .+/);
      expect(res.bodyLines[0]).toContain("25");
      expect(res.bodyLines[0]).toContain("27");
    });

    it("3: [V4] Anti-trappola §1.8: dateTo === dateFrom (singolo giorno) non deve produrre 'da ... a ...', e copre dateTo: null", () => {
      const singleDayOverride = {
        dateFrom: "2026-09-25",
        dateTo: "2026-09-25",
        closed: true,
      };
      const res1 = buildAvvisoText(singleDayOverride, "orariFormia");
      expect(res1.bodyLines[0]).not.toContain("da ");
      expect(res1.bodyLines[0]).not.toContain(" a ");
      // La data deve comparire una sola volta
      const occurrences = (res1.bodyLines[0].match(/25/g) || []).length;
      expect(occurrences).toBe(1);

      const nullDateToOverride = {
        dateFrom: "2026-09-25",
        dateTo: null,
        closed: true,
      };
      const res2 = buildAvvisoText(nullDateToOverride, "orariFormia");
      expect(res2.bodyLines[0]).not.toContain("da ");
      expect(res2.bodyLines[0]).not.toContain(" a ");
    });

    it("4: startTime + endTime -> 'sarà aperto ... dalle 09:30 alle 13:00' (verbo precede la data)", () => {
      const override = {
        dateFrom: "2026-09-25",
        startTime: "09:30",
        endTime: "13:00",
        closed: false,
      };
      const res = buildAvvisoText(override, "orariFormia");
      expect(res.bodyLines[0]).toContain("sarà aperto");
      expect(res.bodyLines[0]).toContain("dalle 09:30 alle 13:00");
      // Verifica ordine simmetrico: 'sarà aperto' compare prima di '25'
      const openIdx = res.bodyLines[0].indexOf("sarà aperto");
      const dateIdx = res.bodyLines[0].indexOf("25");
      expect(openIdx).toBeLessThan(dateIdx);
    });

    it("5: solo startTime (fallback §1.4) -> 'sarà aperto ... dalle 09:30' senza 'alle' finale", () => {
      const override = {
        dateFrom: "2026-09-25",
        startTime: "09:30",
        closed: false,
      };
      const res = buildAvvisoText(override, "orariFormia");
      expect(res.bodyLines[0]).toContain("sarà aperto");
      expect(res.bodyLines[0]).toContain("dalle 09:30");
      expect(res.bodyLines[0]).not.toMatch(/\balle\b/);
    });

    it("6: solo endTime (fallback §1.4) -> 'sarà aperto ... fino alle 13:00'", () => {
      const override = {
        dateFrom: "2026-09-25",
        endTime: "13:00",
        closed: false,
      };
      const res = buildAvvisoText(override, "orariFormia");
      expect(res.bodyLines[0]).toContain("sarà aperto");
      expect(res.bodyLines[0]).toContain("fino alle 13:00");
      expect(res.bodyLines[0]).not.toContain("dalle");
    });

    it("7: closed: false senza orari -> ritorna null senza lanciare eccezioni", () => {
      const override = {
        dateFrom: "2026-09-25",
        closed: false,
      };
      expect(() => {
        const res = buildAvvisoText(override, "orariFormia");
        expect(res).toBeNull();
      }).not.toThrow();
    });

    it("8: clinicLocation: orariFormia vs orariSecondoStudio vs chiave sconosciuta (fallback Formia)", () => {
      const override = { dateFrom: "2026-09-25", closed: true };

      const resFormia = buildAvvisoText(override, "orariFormia");
      expect(resFormia.bodyLines[0]).toContain(STUDIO_LABELS.orariFormia);

      const resSecondo = buildAvvisoText(override, "orariSecondoStudio");
      expect(resSecondo.bodyLines[0]).toContain(STUDIO_LABELS.orariSecondoStudio);

      const resUnknown = buildAvvisoText(override, "studioInesistente");
      expect(resUnknown.bodyLines[0]).toContain(STUDIO_LABELS.orariFormia);
    });

    it("9: Test anti-D5: il testo non contiene mai 'oggi', 'domani', 'ieri'", () => {
      const cases = [
        { dateFrom: "2026-09-25", closed: true },
        { dateFrom: "2026-09-25", dateTo: "2026-09-28", closed: true },
        { dateFrom: "2026-09-25", startTime: "09:00", endTime: "12:00", closed: false },
        { dateFrom: "2026-09-25", startTime: "09:00", closed: false },
        { dateFrom: "2026-09-25", endTime: "12:00", closed: false },
      ];

      for (const c of cases) {
        const text = buildAvvisoText(c, "orariFormia");
        if (text) {
          const body = text.bodyLines.join(" ");
          expect(body).not.toMatch(/\b(oggi|domani|ieri)\b/i);
        }
      }
    });

    it("10: buildAvvisoFilename con dateFrom valorizzato vs fallback 'comunicazione'", () => {
      expect(buildAvvisoFilename({ dateFrom: "2026-09-25" })).toBe("avviso-avs-rubino-2026-09-25.png");
      expect(buildAvvisoFilename({})).toBe("avviso-avs-rubino-comunicazione.png");
      expect(buildAvvisoFilename(null)).toBe("avviso-avs-rubino-comunicazione.png");
      expect(buildAvvisoFilename({})).not.toContain("undefined");
    });
  });

  describe("Rendering Canvas", () => {
    it("11: renderAvvisoImage ritorna un Blob con type === 'image/png'", async () => {
      const text = {
        heading: "AVVISO",
        bodyLines: ["L'Ambulatorio Veterinario Specialistico Rubino sarà chiuso venerdì 25 settembre 2026"],
        footerLines: ["avsrubino.it"],
      };
      const blob = await renderAvvisoImage(text, { logoTimeoutMs: 10 });
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/png");
    });

    it("12: logo che fallisce (stub di default) -> risolve con un Blob e drawImage non viene chiamato", async () => {
      let drawImageCalled = false;
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = vi.fn(function () {
        const ctx = origGetContext.call(this);
        ctx.drawImage = vi.fn(() => {
          drawImageCalled = true;
        });
        return ctx;
      });

      const text = {
        heading: "AVVISO",
        bodyLines: ["Testo"],
        footerLines: ["avsrubino.it"],
      };

      const blob = await renderAvvisoImage(text, { logoTimeoutMs: 10 });
      expect(blob).toBeInstanceOf(Blob);
      expect(drawImageCalled).toBe(false);

      HTMLCanvasElement.prototype.getContext = origGetContext;
    });

    it("13: logo che carica -> drawImage chiamato una volta con dimensioni 192x192", async () => {
      const originalImage = global.Image;
      global.Image = class {
        constructor() {
          this.onload = null;
          this.onerror = null;
        }
        set src(_v) {
          setTimeout(() => this.onload?.(), 0);
        }
      };

      let drawImageParams = null;
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = vi.fn(function () {
        const ctx = origGetContext.call(this);
        ctx.drawImage = vi.fn((img, x, y, w, h) => {
          drawImageParams = { img, x, y, w, h };
        });
        return ctx;
      });

      const text = {
        heading: "AVVISO",
        bodyLines: ["Testo"],
        footerLines: ["avsrubino.it"],
      };

      const blob = await renderAvvisoImage(text, { logoTimeoutMs: 50 });
      expect(blob).toBeInstanceOf(Blob);
      expect(drawImageParams).not.toBeNull();
      expect(drawImageParams.w).toBe(192);
      expect(drawImageParams.h).toBe(192);

      global.Image = originalImage;
      HTMLCanvasElement.prototype.getContext = origGetContext;
    });

    it("14: [R4] Il contesto riceve textBaseline = 'top'", async () => {
      const textBaselineSpy = vi.fn();
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = vi.fn(function () {
        const ctx = origGetContext.call(this);
        Object.defineProperty(ctx, "textBaseline", {
          set: textBaselineSpy,
          configurable: true,
        });
        return ctx;
      });

      const text = {
        heading: "AVVISO",
        bodyLines: ["Testo"],
        footerLines: ["avsrubino.it"],
      };

      await renderAvvisoImage(text, { logoTimeoutMs: 10 });
      expect(textBaselineSpy).toHaveBeenCalledWith("top");

      HTMLCanvasElement.prototype.getContext = origGetContext;
    });

    it("15: testo lungo su più righe (intervallo di date) -> fillText chiamato più volte del caso a riga singola", async () => {
      let fillTextCalls = 0;
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = vi.fn(function () {
        const ctx = origGetContext.call(this);
        ctx.fillText = vi.fn(() => {
          fillTextCalls++;
        });
        return ctx;
      });

      const shortText = {
        heading: "AVVISO",
        bodyLines: ["Chiusura straordinaria"],
        footerLines: ["avsrubino.it"],
      };
      fillTextCalls = 0;
      await renderAvvisoImage(shortText, { logoTimeoutMs: 10 });
      const shortCalls = fillTextCalls;

      const longText = {
        heading: "AVVISO",
        bodyLines: [
          "L'Ambulatorio Veterinario Specialistico Rubino sarà aperto da venerdì 25 settembre 2026 a domenica 27 settembre 2026 dalle 09:30 alle 13:00",
        ],
        footerLines: ["avsrubino.it"],
      };
      fillTextCalls = 0;
      await renderAvvisoImage(longText, { logoTimeoutMs: 10 });
      const longCalls = fillTextCalls;

      expect(longCalls).toBeGreaterThan(shortCalls);

      HTMLCanvasElement.prototype.getContext = origGetContext;
    });
  });

  describe("Condivisione (shareAvvisoImage)", () => {
    it("16: canShare assente -> percorso download con rilascio ritardato di 1000ms", async () => {
      vi.useFakeTimers();
      const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      delete navigator.canShare;

      const blob = new Blob(["test"], { type: "image/png" });
      const res = await shareAvvisoImage(blob, "avviso.png", "Test share");

      expect(res).toEqual({ method: "download" });
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(anchorClickSpy).toHaveBeenCalled();
      // Non ancora revocato sincronicamente
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      // Avanza il timer di 1000ms
      vi.advanceTimersByTime(1000);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

      anchorClickSpy.mockRestore();
      vi.useRealTimers();
    });

    it("17: canShare vero -> navigator.share chiamato con file di lunghezza 1 -> { method: 'share' }", async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      const canShareMock = vi.fn().mockReturnValue(true);

      Object.defineProperty(navigator, "canShare", { value: canShareMock, configurable: true, writable: true });
      Object.defineProperty(navigator, "share", { value: shareMock, configurable: true, writable: true });

      const blob = new Blob(["test"], { type: "image/png" });
      const res = await shareAvvisoImage(blob, "avviso.png", "Test share");

      expect(res).toEqual({ method: "share" });
      expect(shareMock).toHaveBeenCalledTimes(1);
      const callArg = shareMock.mock.calls[0][0];
      expect(callArg.files).toHaveLength(1);
      expect(callArg.text).toBe("Test share");
    });

    it("18: navigator.share che rigetta con AbortError -> { method: 'aborted' } e nessun download", async () => {
      const abortErr = new Error("User cancelled");
      abortErr.name = "AbortError";
      const shareMock = vi.fn().mockRejectedValue(abortErr);
      const canShareMock = vi.fn().mockReturnValue(true);

      Object.defineProperty(navigator, "canShare", { value: canShareMock, configurable: true, writable: true });
      Object.defineProperty(navigator, "share", { value: shareMock, configurable: true, writable: true });
      vi.clearAllMocks();

      const blob = new Blob(["test"], { type: "image/png" });
      const res = await shareAvvisoImage(blob, "avviso.png", "Test share");

      expect(res).toEqual({ method: "aborted" });
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it("19: [R4] navigator.share che rigetta con errore generico -> fallback a download", async () => {
      const genericErr = new Error("Permission denied by OS");
      const shareMock = vi.fn().mockRejectedValue(genericErr);
      const canShareMock = vi.fn().mockReturnValue(true);
      const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      Object.defineProperty(navigator, "canShare", { value: canShareMock, configurable: true, writable: true });
      Object.defineProperty(navigator, "share", { value: shareMock, configurable: true, writable: true });

      const blob = new Blob(["test"], { type: "image/png" });
      const res = await shareAvvisoImage(blob, "avviso.png", "Test share");

      expect(res).toEqual({ method: "download" });
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);

      anchorClickSpy.mockRestore();
    });
  });

  describe("Orchestratore (buildAvvisoFromResponse)", () => {
    it("20: con res.override completo e fallbackProposal parziale -> usa res.override completo (regola §1.4)", async () => {
      const res = {
        override: {
          dateFrom: "2026-09-25",
          startTime: "09:30",
          endTime: "13:00",
          closed: false,
        },
      };
      const fallbackProposal = {
        dateFrom: "2026-09-25",
        startTime: "09:30",
        closed: false,
      };

      const avviso = await buildAvvisoFromResponse(res, fallbackProposal, "orariFormia", { logoTimeoutMs: 10 });
      expect(avviso).not.toBeNull();
      expect(avviso.shareText).toContain("09:30");
      expect(avviso.shareText).toContain("13:00");
    });

    it("21: res senza campo override -> usa fallbackProposal e produce comunque l'avviso", async () => {
      const res = {};
      const fallbackProposal = {
        dateFrom: "2026-09-25",
        closed: true,
      };

      const avviso = await buildAvvisoFromResponse(res, fallbackProposal, "orariFormia", { logoTimeoutMs: 10 });
      expect(avviso).not.toBeNull();
      expect(avviso.shareText).toContain("sarà chiuso");
      expect(avviso.filename).toBe("avviso-avs-rubino-2026-09-25.png");
    });

    it("22: override non rappresentabile (closed: false, nessun orario) -> ritorna null senza lanciare", async () => {
      const res = {
        override: {
          dateFrom: "2026-09-25",
          closed: false,
        },
      };

      const avviso = await buildAvvisoFromResponse(res, null, "orariFormia", { logoTimeoutMs: 10 });
      expect(avviso).toBeNull();
    });
  });
});
