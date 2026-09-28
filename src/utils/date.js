// Formattazione data e fuso orario risolti: costruisce la data come mezzogiorno UTC
// e usa timeZone: "Europe/Rome" alle opzioni di toLocaleDateString.
/**
 * Formatta una data in formato YYYY-MM-DD per esteso in italiano.
 * Move puro da ConfirmationModal.jsx.
 * @param {string} dateStr - Data in formato YYYY-MM-DD
 * @returns {string} Data formattata per esteso (es. "venerdì 25 settembre 2026")
 */
export function formatItalianDate(dateStr) {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return date.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Rome",
    });
  } catch {
    return dateStr;
  }
}
