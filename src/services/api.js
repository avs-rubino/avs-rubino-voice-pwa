const VOICE_API_BASE_URL = import.meta.env.VITE_VOICE_API_URL || "http://localhost:8080";
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:5000";

/**
 * Send a conversational message and history to the Go Voice Agent microservice.
 * @param {string} message
 * @param {Array<{role: string, content: string}>} history
 * @param {string} token - Firebase ID Token
 * @returns {Promise<{message: string, actionProposal?: any, needsConfirm: boolean}>}
 */
export async function sendChatMessage(message, history = [], token) {
  if (!token) {
    throw new Error("Authentication token is required");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${VOICE_API_BASE_URL}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      history,
    }),
  });

  if (!response.ok) {
    let errorDetail = `Errore API (HTTP ${response.status})`;
    try {
      const errJson = await response.json();
      console.error("❌ [API] sendChatMessage fallito. Payload:", errJson);
      if (errJson.error) {
        errorDetail = `Errore API (HTTP ${response.status}): ${errJson.error}`;
      } else {
        errorDetail = `Errore API (HTTP ${response.status}): Risposta anomala`;
      }
    } catch {
      console.error(`❌ [API] sendChatMessage fallito con status ${response.status} (nessun JSON valido)`);
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Health check for the Go voice service.
 */
export async function checkVoiceApiHealth() {
  try {
    const res = await fetch(`${VOICE_API_BASE_URL}/api/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Apply the confirmed schedule override directly to the clinic backend (Node.js API).
 * @param {Object} override - { closed, dateFrom, dateTo, startTime, endTime }
 * @param {string} token - Firebase ID Token
 * @param {string} clinicLocation - "orariFormia" or "orariSecondoStudio"
 */
export async function applyScheduleOverrideToBackend(override, token, clinicLocation = "orariFormia") {
  if (!token) {
    throw new Error("Authentication token is required");
  }

  const newOverrideEntry = {
    id: `override_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    closed: !!override.closed,
    dateFrom: override.dateFrom,
    dateTo: override.dateTo || override.dateFrom,
    ...(override.closed
      ? {}
      : {
          ...(override.startTime ? { startTime: override.startTime } : {}),
          ...(override.endTime ? { endTime: override.endTime } : {}),
        }),
  };

  const response = await fetch(`${BACKEND_API_BASE_URL}/api/admin/content/override`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      clinicLocation,
      override: newOverrideEntry,
    }),
  });

  if (!response.ok) {
    let errorMsg = `Errore Backend (HTTP ${response.status})`;
    try {
      const errData = await response.json();
      console.error("❌ [API] applyScheduleOverrideToBackend fallito. Payload:", errData);
      if (errData.error) errorMsg = `Errore Backend (HTTP ${response.status}): ${errData.error}`;
    } catch {
      console.error(`❌ [API] applyScheduleOverrideToBackend fallito con status ${response.status} (nessun JSON valido)`);
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Delete schedule overrides for a specific date from the clinic backend (Node.js API).
 * @param {string} date - Date in ISO format YYYY-MM-DD
 * @param {string} token - Firebase ID Token
 * @param {string} clinicLocation - "orariFormia" or "orariSecondoStudio"
 * @returns {Promise<{success: boolean, message: string, deletedCount: number, date: string, clinicLocation: string}>}
 */
export async function deleteScheduleOverrideFromBackend(date, token, clinicLocation = "orariFormia") {
  if (!token) {
    throw new Error("Authentication token is required");
  }
  if (!date) {
    throw new Error("Date parameter is required for deletion");
  }

  const queryParams = new URLSearchParams({
    clinicLocation,
    date,
  });

  const response = await fetch(`${BACKEND_API_BASE_URL}/api/admin/content/override/by-date?${queryParams.toString()}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let errorMsg = `Errore Backend (HTTP ${response.status})`;
    try {
      const errData = await response.json();
      console.error("❌ [API] deleteScheduleOverrideFromBackend fallito. Payload:", errData);
      if (errData.error) errorMsg = `Errore Backend (HTTP ${response.status}): ${errData.error}`;
    } catch {
      console.error(`❌ [API] deleteScheduleOverrideFromBackend fallito con status ${response.status} (nessun JSON valido)`);
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Fetch public clinic content from the backend to retrieve active schedule overrides.
 * @returns {Promise<Object>} The "general_info" content object containing orariFormia/orariSecondoStudio.
 */
export async function fetchPublicContent() {
  const response = await fetch(`${BACKEND_API_BASE_URL}/api/public/content`);

  if (!response.ok) {
    let errorMsg = `Errore Backend (HTTP ${response.status})`;
    try {
      const errData = await response.json();
      console.error("❌ [API] fetchPublicContent fallito. Payload:", errData);
      if (errData.error) errorMsg = `Errore Backend (HTTP ${response.status}): ${errData.error}`;
    } catch {
      console.error(`❌ [API] fetchPublicContent fallito con status ${response.status} (nessun JSON valido)`);
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const generalInfo = Array.isArray(data) ? data.find((item) => item.type === "general_info") : null;

  if (!generalInfo) {
    console.error("❌ [API] fetchPublicContent: nessun elemento 'general_info' trovato nella risposta.");
    throw new Error("Contenuto 'general_info' non trovato nella risposta del backend.");
  }

  return generalInfo;
}

