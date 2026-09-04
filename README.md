# AVS Rubino - Voice Assistant PWA

Progressive Web App (PWA) progettata per il personale dell'Ambulatorio Veterinario Specialistico Rubino. Utilizza un'interfaccia utente vocale (VUI) basata su Web Speech API e intelligenza artificiale per consentire l'aggiornamento rapido degli orari clinici e delle variazioni straordinarie.

## Ecosistema AVS Rubino

Questo repository è uno dei 5 moduli dell'ecosistema digitale dell'Ambulatorio Veterinario Specialistico Rubino. Panoramica completa, architettura e flussi: **[github.com/avs-rubino](https://github.com/avs-rubino)**

| Modulo | Ruolo |
|---|---|
| [avs-rubino-frontend](https://github.com/avs-rubino/avs-rubino-frontend) | Portale web pubblico |
| [avs-rubino-admin](https://github.com/avs-rubino/avs-rubino-admin) | Pannello di amministrazione |
| [avs-rubino-backend](https://github.com/avs-rubino/avs-rubino-backend) | API REST centrale |
| [avs-rubino-voice-api](https://github.com/avs-rubino/avs-rubino-voice-api) | Microservizio NLU vocale |
| **avs-rubino-voice-pwa** | PWA vocale gestione orari |

> **Dipendenze dirette di questo modulo:** [avs-rubino-voice-api](https://github.com/avs-rubino/avs-rubino-voice-api), [avs-rubino-backend](https://github.com/avs-rubino/avs-rubino-backend) (NLU su voice-api, persistenza su backend)

---

## Architettura e Tecnologie

- **Framework**: React 19 (SPA)
- **Build Tool**: Vite 8 con `@vitejs/plugin-react`
- **Styling**: Tailwind CSS v4 con `@tailwindcss/vite`
- **PWA & Offline**: `vite-plugin-pwa`, Service Workers
- **Interfaccia Vocale**: Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition` e `SpeechSynthesis`)
- **Autenticazione**: Firebase Auth con Custom Claims
- **Linter**: Oxlint
- **Testing**: Vitest, React Testing Library, jsdom
- **Hosting**: Firebase Hosting

## Paradigma Human-in-the-Loop (HITL)

A garanzia dell'integrità dei dati operativi, l'applicazione impone il pattern **Human-in-the-Loop** su ogni azione proposta dall'intelligenza artificiale:
1. L'operatore detta la variazione vocale.
2. Il microservizio Voice API produce una proposta d'azione (`ActionProposal`) di tipo inserimento (`action: "set"`) o cancellazione (`action: "delete"`).
3. L'agente non esegue alcuna scrittura autonoma su database.
4. Viene visualizzato a schermo il `ConfirmationModal` con il riepilogo dettagliato dei parametri estratti. In caso di informazioni parziali, si attiva il fallback ibrido touch + voice per il completamento manuale.
5. La mutazione viene inoltrata al backend solo a seguito del click esplicito dell'utente su **"Conferma e Salva"** o **"Conferma ed Elimina"**.

## Prerequisiti

- **Node.js**: >= 18.x
- **npm**: >= 8.x
- **Browser supportato**: Browser moderno conforme allo standard Web Speech API (Google Chrome, Microsoft Edge, Safari) e supporto microfono.

## Setup Locale

1. Installazione delle dipendenze:
   ```bash
   npm install
   ```

2. Configurazione delle variabili d'ambiente:
   ```bash
   cp .env.example .env
   ```

3. Avvio del server di sviluppo:
   ```bash
   npm run dev
   ```
   L'applicazione è disponibile all'indirizzo `http://localhost:5174`.

## Variabili d'Ambiente

| Variabile | Tipo | Descrizione | Default / Esempio | Richiesta |
|---|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | String | API Key del progetto Firebase | - | Sì |
| `VITE_FIREBASE_AUTH_DOMAIN` | String | Dominio di autenticazione Firebase | `project.firebaseapp.com` | Sì |
| `VITE_FIREBASE_PROJECT_ID` | String | ID del progetto Google Cloud / Firebase | `vet-clinics-493413` | Sì |
| `VITE_FIREBASE_STORAGE_BUCKET` | String | Bucket storage Firebase | `project.appspot.com` | Sì |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | String | Sender ID Firebase Messaging | - | Sì |
| `VITE_FIREBASE_APP_ID` | String | ID dell'applicazione web Firebase | - | Sì |
| `VITE_VOICE_API_URL` | String | URL del microservizio NLU Voice API (Go) | `http://localhost:8080` | Sì |
| `VITE_BACKEND_API_URL` | String | URL del backend REST centrale (Node.js) | `http://localhost:5000` | Sì |

## Script Disponibili

| Comando | Descrizione |
|---|---|
| `npm run dev` | Avvia il server di sviluppo locale |
| `npm run build` | Compila l'applicazione e genera i file PWA/Service Worker nella cartella `dist/` |
| `npm run lint` | Esegue l'analisi statica del codice con Oxlint |
| `npm run test` | Esegue la suite di test unitari con Vitest |
| `npm run preview` | Avvia una preview locale della build di produzione |

## Testing

La suite di test automatizzati utilizza **Vitest** e **React Testing Library**:

```bash
npm run test
```

Aree coperte:
- `src/services/api.test.js`: Validazione rotte API REST, composizione query parameter (`clinicLocation`, `date`), passaggio header `Authorization` e gestione codici di stato HTTP.
- `src/components/ConfirmationModal.test.jsx`: Rendering dei flussi `set` e `delete`, visualizzazione campi orari, fallback per dati incompleti e interazioni click Human-in-the-Loop.

## CI/CD e Deployment

Il rilascio in produzione è gestito tramite GitHub Actions (`.github/workflows/deploy.yml`):
- Ad ogni push sul branch `main`, il workflow compila la PWA e distribuisce gli artefatti su **Firebase Hosting** (Target: `vet-clinics-voice-pwa`).
- `firebase.json` impone security headers specifici per l'ambiente browser, tra cui `Permissions-Policy: microphone=(self)` e `X-Frame-Options: DENY`.

<!-- ecosystem: avs-rubino -->
