# AVS Rubino - Voice Assistant PWA

Applicazione Progressive Web App (PWA) sperimentale, pensata per il personale dell'Ambulatorio Veterinario Specialistico Rubino. Sfruttando interfacce vocali (Voice User Interface), permette di comunicare a voce con l'IA per segnalare variazioni repentine di orario (es. assenze, chiusure straordinarie, urgenze).

## 🏛️ Ecosistema AVS Rubino

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

## 🚀 Tecnologie Utilizzate
- **Core:** React 19, Vite
- **Styling:** Tailwind CSS v4
- **Testing:** Vitest, React Testing Library, `@testing-library/jest-dom`, `jsdom`
- **Interfaccia Vocale:** Web Speech API (Speech Recognition per la registrazione audio STT, Speech Synthesis per la risposta vocale TTS).
- **PWA Setup:** `vite-plugin-pwa`, Service Workers.

## 🛡️ Paradigma HITL (Human-in-the-Loop)
Per prevenire allucinazioni o alterazioni errate dei dati in produzione generate dall'IA, questa applicazione adotta rigorosamente il pattern di sicurezza **Human-in-the-Loop**. 
- L'Assistente Vocale elabora l'audio e struttura una `ActionProposal` (JSON) per:
  - **Inserimento/Variazione (`action: "set"`)**: proposta di chiusura o cambio orario.
  - **Eliminazione (`action: "delete"`)**: proposta di cancellazione di tutte le eccezioni per una data e ripristino dell'orario standard.
- La proposta **non** viene mai eseguita in modo autonomo dall'agente.
- Compare a schermo il `ConfirmationModal` con badge e riepilogo dati dedicato. Se la proposta manca di parametri chiave (es. orari parziali), si attiva un **Fallback Ibrido (Touch + Voice)**: la sintesi vocale avverte l'operatore e la GUI sblocca dei time-picker per completare l'input manualmente. Richiede sempre un click manuale esplicito (**"Conferma e Salva"** o **"Conferma ed Elimina"**) per sbloccare la transazione.
- L'invocazione verso il backend avviene via:
  - `POST /api/admin/content/override` per inserimenti (con notifica vocale/visiva se un'eccezione preesistente viene sostituita automaticamente via `replacedPrevious: true`).
  - `DELETE /api/admin/content/override/by-date?clinicLocation=...&date=...` per le cancellazioni per data.

## 📋 Prerequisiti e Compabilità
- **Node.js:** v18.x o superiore.
- L'utilizzo richiede un browser moderno con supporto nativo per la `Web Speech API` (es. Google Chrome, Safari, Microsoft Edge). L'accesso al microfono è protetto dalle `Permissions-Policy`.

## 🛠️ Avvio Locale e Test

1. Installa i pacchetti Node:
   ```bash
   npm install
   ```

2. Configura le variabili locali copiando il template:
   ```bash
   cp .env.example .env
   ```
   Questa applicazione interroga sia la *Voice API* (motore IA, porta 8080) sia il *Backend Node* (persistenza DB, porta 5000). Modifica gli URL nel `.env` in base alle tue istanze.

3. Esegui la test suite automatizzata (Vitest):
   ```bash
   npm run test
   ```
   Esegue la suite di test unitari e di componenti, inclusi:
   - `src/services/api.test.js`: validazione URL, query parameters `clinicLocation`/`date`, header `Authorization` e gestione errori HTTP.
   - `src/components/ConfirmationModal.test.jsx`: verifica rendering dedicato per `delete` vs `set`, blocco orari ed eventi click HITL.

4. Esegui il dev server:
   ```bash
   npm run dev
   ```
   Server PWA attivo di default su `http://localhost:5174`.

## 🏗️ Build & Integrazione Continua
Il processo di build compila sia l'interfaccia React che il Service Worker (manifest, caching offline, icone SVG maskable).
```bash
npm run build
```

Il progetto è integrato in GitHub Actions. Un push al ramo `main` farà partire l'azione che genera l'applicazione statica e la pubblicherà su **Firebase Hosting** (Target: `vet-clinics-voice-pwa`), assicurandosi di incollare i rigidi **Security Headers** descritti in `firebase.json` (`X-Frame-Options: DENY`, `HSTS`, `Permissions-Policy: microphone=(self)`).

