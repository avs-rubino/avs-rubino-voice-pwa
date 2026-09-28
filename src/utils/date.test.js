import { describe, it, expect, vi, afterEach } from "vitest";
import { formatItalianDate } from "./date";

describe("formatItalianDate utility", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("23: formatta correttamente una data valida contenente giorno e mese per esteso", () => {
    const formatted = formatItalianDate("2026-09-25");
    expect(formatted).toContain("25");
    expect(formatted.toLowerCase()).toContain("settembre");
    expect(formatted).toContain("2026");
  });

  it("24: ritorna l'input invariato per valori falsy (null/undefined/stringa vuota) o tipi non-stringa che scatenano il catch di split", () => {
    expect(formatItalianDate("")).toBe("");
    expect(formatItalianDate(null)).toBe("");
    expect(formatItalianDate(undefined)).toBe("");
    expect(formatItalianDate(12345)).toBe(12345);
    const malformedObj = { date: "2026-09-25" };
    expect(formatItalianDate(malformedObj)).toBe(malformedObj);
    // Nota: una stringa non ISO come "abc" non lancia in .split("-"), produce new Date(NaN, NaN, NaN)
    // e toLocaleDateString restituisce "Invalid Date"
    expect(formatItalianDate("abc")).toBe("Invalid Date");
  });

  it("25: applica timeZone esplicito nelle opzioni di toLocaleDateString", () => {
    const spy = vi.spyOn(Date.prototype, "toLocaleDateString");

    formatItalianDate("2026-09-25");

    expect(spy).toHaveBeenCalled();
    const optionsPassed = spy.mock.calls[0][1];
    expect(optionsPassed).toBeDefined();
    expect(optionsPassed.timeZone).toBe("Europe/Rome");
  });
});
