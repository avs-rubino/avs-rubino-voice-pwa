import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import {
  sendChatMessage,
  applyScheduleOverrideToBackend,
  deleteScheduleOverrideFromBackend,
} from "../services/api";
import { ConfirmationModal } from "./ConfirmationModal";
import { ActiveExceptions } from "./ActiveExceptions";
import {
  Mic,
  MicOff,
  Send,
  Trash2,
  Volume2,
  VolumeX,
  Bot,
  User,
  Building,
  CheckCircle,
  AlertCircle,
  LogOut,
} from "lucide-react";

export function VoiceAssistant() {
  const { currentUser, role, logout, getToken } = useAuth();

  // Chat State
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Ciao! Sono l'assistente vocale di AVS Rubino. Premi il microfono o scrivi per impostare una chiusura o una variazione di orario.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  // Clinic location selector (matching clinic_content keys)
  const [selectedStudio, setSelectedStudio] = useState("orariFormia");

  // Human-in-the-Loop Confirmation State
  const [currentProposal, setCurrentProposal] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isApplyingOverride, setIsApplyingOverride] = useState(false);
  const [refreshExceptions, setRefreshExceptions] = useState(0);

  // Voice Hooks
  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis();

  const handleSpeechResult = async (recognizedText) => {
    if (!recognizedText || !recognizedText.trim()) return;
    await processUserMessage(recognizedText.trim());
  };

  const {
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    isSupported: isSpeechSupported,
    error: speechError,
  } = useSpeechRecognition({
    onResult: handleSpeechResult,
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimTranscript, isProcessing]);

  // Main processing pipeline
  const processUserMessage = async (userText) => {
    if (!userText || isProcessing) return;

    setApiError(null);
    setSuccessNotice(null);
    stopSpeaking();

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 1. Append user message to UI state
    const updatedMessages = [
      ...messages,
      {
        role: "user",
        content: userText,
        timestamp,
      },
    ];
    setMessages(updatedMessages);
    setInputText("");
    setIsProcessing(true);

    try {
      // 2. Format history for Go backend API (last 10 non-error turns, excluding current message)
      const validPriorMessages = messages.filter((m) => !m.isError);
      // Skip initial generic welcome message if present to save tokens
      const conversationTurns = validPriorMessages.filter((m, idx) => !(idx === 0 && m.role === "assistant"));
      const recentHistory = conversationTurns.slice(-10);

      const historyPayload = recentHistory.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content,
      }));

      const token = await getToken();
      const response = await sendChatMessage(userText, historyPayload, token);

      const assistantMsg = {
        role: "assistant",
        content: response.message || "Risposta ricevuta.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        proposal: response.actionProposal || null,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // 3. Play TTS for assistant's response
      speak(assistantMsg.content);

      // 4. Trigger Human-In-The-Loop confirmation if requested
      if (response.needsConfirm && response.actionProposal) {
        setCurrentProposal(response.actionProposal);
        setIsConfirmModalOpen(true);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setApiError(err.message || "Errore durante la comunicazione con il server.");
      const errorMsg = {
        role: "assistant",
        content: "Si è verificato un errore di connessione. Riprova tra poco.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    processUserMessage(inputText.trim());
  };

  const handleMicToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking();
      startListening();
    }
  };

  const handleClearHistory = () => {
    stopSpeaking();
    stopListening();
    setMessages([
      {
        role: "assistant",
        content: "Conversazione reimpostata. Come posso aiutarti con gli orari?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setCurrentProposal(null);
    setIsConfirmModalOpen(false);
    setSuccessNotice(null);
    setApiError(null);
  };

  const handleConfirmProposal = async () => {
    if (!currentProposal) return;
    setIsApplyingOverride(true);
    setApiError(null);

    const studioName = selectedStudio === "orariFormia" ? "Ambulatorio Formia" : "Secondo Studio";
    const studioShort = selectedStudio === "orariFormia" ? "Formia" : "il Secondo Studio";

    try {
      const token = await getToken();

      // Flusso Cancellazione Eccezione
      if (currentProposal.action === "delete") {
        if (!currentProposal.date || !currentProposal.date.trim()) {
          throw new Error("Impossibile procedere: la data da eliminare non è stata specificata correttamente.");
        }

        const deleteResult = await deleteScheduleOverrideFromBackend(
          currentProposal.date.trim(),
          token,
          selectedStudio
        );

        const deletedCount = deleteResult.deletedCount ?? 1;
        setSuccessNotice({
          message: `Eliminate con successo ${deletedCount} eccezione/i per la data specificata.`,
          details: { date: currentProposal.date.trim(), action: "delete" },
          studio: studioName,
        });

        const confirmFeedbackMsg = `Ho eliminato le eccezioni orarie per il giorno ${currentProposal.date.trim()} per ${studioShort}, ripristinando l'orario standard.`;
        const cacheNoticeMsg = "Nota: Se il sito web della clinica è stato visualizzato di recente, potrebbe essere necessario attendere fino a 3 minuti per vedere queste nuove variazioni online a causa della cache.";

        setRefreshExceptions((prev) => prev + 1);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: confirmFeedbackMsg,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
          {
            role: "assistant",
            content: cacheNoticeMsg,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);

        speak(confirmFeedbackMsg);
        setIsConfirmModalOpen(false);
        setCurrentProposal(null);
        return;
      }

      // Flusso Inserimento / Variazione Oraria (set)
      const res = await applyScheduleOverrideToBackend(currentProposal, token, selectedStudio);

      const replacedNotice = res?.replacedPrevious
        ? " (la precedente eccezione per questa data è stata rimossa automaticamente)"
        : "";

      setSuccessNotice({
        message: `Eccezione oraria confermata con successo!${replacedNotice}`,
        details: currentProposal,
        studio: studioName,
      });

      const confirmFeedbackMsg = res?.replacedPrevious
        ? `Ho confermato e salvato l'eccezione oraria per ${studioShort}, sostituendo quella precedentemente impostata.`
        : `Ho confermato e salvato l'eccezione oraria per ${studioShort}.`;
      const cacheNoticeMsg = "Nota: Se il sito web della clinica è stato visualizzato di recente, potrebbe essere necessario attendere fino a 3 minuti per vedere queste nuove variazioni online a causa della cache.";

      setRefreshExceptions((prev) => prev + 1);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: confirmFeedbackMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        {
          role: "assistant",
          content: cacheNoticeMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      speak(confirmFeedbackMsg);
      setIsConfirmModalOpen(false);
      setCurrentProposal(null);
    } catch (err) {
      console.error("Errore durante l'operazione sull'eccezione oraria:", err);
      const errorDetail = err?.message || "Errore di connessione o operazione fallita.";
      setApiError(`Errore durante l'applicazione dell'orario: ${errorDetail}`);

      const errorFeedbackMsg = `Non è stato possibile completare l'operazione: ${errorDetail}. Nessuna modifica è stata applicata.`;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorFeedbackMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      speak("Si è verificato un errore durante l'operazione. Nessuna modifica è stata applicata.");
    } finally {
      setIsApplyingOverride(false);
    }
  };

  const handleCancelProposal = () => {
    setIsConfirmModalOpen(false);
    const cancelMsg = "Nessun problema, ho annullato la modifica. Dimmi come preferisci variare l'orario.";
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: cancelMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    speak(cancelMsg);
  };


  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto w-full bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Mic className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">AVS Rubino Voice</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                PWA v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {currentUser?.email} {role && `(${role})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Location selector */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
            <Building className="w-3.5 h-3.5 text-teal-400" />
            <select
              value={selectedStudio}
              onChange={(e) => setSelectedStudio(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="orariFormia" className="bg-slate-900 text-slate-200">
                Sede Formia
              </option>
              <option value="orariSecondoStudio" className="bg-slate-900 text-slate-200">
                Secondo Studio
              </option>
            </select>
          </div>

          <button
            onClick={handleClearHistory}
            title="Svuota conversazione"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={logout}
            title="Disconnetti"
            className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Location Selector Bar */}
      <div className="sm:hidden px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-400 flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-teal-400" /> Sede attiva:
        </span>
        <select
          value={selectedStudio}
          onChange={(e) => setSelectedStudio(e.target.value)}
          className="bg-slate-800 text-slate-200 px-2 py-1 rounded-lg border border-slate-700 text-xs font-medium focus:outline-none"
        >
          <option value="orariFormia">Sede Formia</option>
          <option value="orariSecondoStudio">Secondo Studio</option>
        </select>
      </div>

      {/* Active Schedule Overrides Panel (Always Visible) */}
      <div className="px-4 sm:px-6 pt-3 flex-shrink-0">
        <ActiveExceptions refreshTrigger={refreshExceptions} selectedStudio={selectedStudio} />
      </div>

      {/* Main Conversation Area */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
        
        {/* Success Banner if an override was confirmed or deleted */}
        {successNotice && (
          <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-teal-300 text-sm font-semibold">
              <CheckCircle className="w-5 h-5 text-teal-400 flex-shrink-0" />
              {successNotice.message}
            </div>
            <div className="text-xs text-slate-300 pl-7 space-y-0.5">
              <p>📍 Sede: <span className="text-white font-medium">{successNotice.studio}</span></p>
              <p>📅 Data: <span className="text-white font-medium">{successNotice.details.date || successNotice.details.dateFrom}</span></p>
              <p>📌 Tipo: <span className="text-white font-medium">{
                successNotice.details.action === "delete"
                  ? "Ripristino Orario Standard"
                  : successNotice.details.closed
                  ? "Chiusura Straordinaria"
                  : `Orario: ${successNotice.details.startTime || ""} - ${successNotice.details.endTime || ""}`
              }</span></p>
            </div>
          </div>
        )}

        {/* API / Speech Warning Banner */}
        {(apiError || speechError) && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{apiError || speechError}</span>
          </div>
        )}

        {/* Message Bubbles */}
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={index}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isUser
                    ? "bg-teal-600 text-white"
                    : msg.isError
                    ? "bg-rose-900/60 text-rose-300 border border-rose-700/50"
                    : "bg-slate-800 text-teal-400 border border-slate-700"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Speech Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 space-y-1.5 shadow-md ${
                  isUser
                    ? "bg-teal-600/90 text-white rounded-tr-none border border-teal-500/40"
                    : msg.isError
                    ? "bg-rose-950/40 border border-rose-800/60 text-rose-200 rounded-tl-none"
                    : "bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-none"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <span className="text-[10px] text-slate-400 opacity-80">{msg.timestamp}</span>

                  {!isUser && !msg.isError && (
                    <button
                      onClick={() => speak(msg.content)}
                      title="Ascolta messaggio"
                      className="p-1 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Interim Speech Transcription Bubble */}
        {isListening && interimTranscript && (
          <div className="flex items-start gap-3 flex-row-reverse animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-teal-600/50 text-white flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-tr-none p-4 bg-teal-900/30 border border-teal-500/30 text-teal-200">
              <p className="text-sm italic flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                {interimTranscript}
              </p>
            </div>
          </div>
        )}

        {/* Waiting / Processing Indicator */}
        {isProcessing && (
          <div className="flex items-start gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-teal-400 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl rounded-tl-none p-4 flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span className="text-xs text-slate-400 ml-2">Elaborazione in corso...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* Central Push-To-Talk and Input Dock */}
      <footer className="p-4 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 space-y-3 flex-shrink-0">
        
        {/* Visualizer when listening */}
        {isListening && (
          <div className="flex items-center justify-center gap-1.5 py-1 text-teal-400 text-xs font-semibold animate-pulse">
            <div className="wave-bar w-1 bg-teal-400 rounded-full [animation-delay:0.1s]"></div>
            <div className="wave-bar w-1 bg-teal-400 rounded-full [animation-delay:0.3s]"></div>
            <div className="wave-bar w-1 bg-teal-400 rounded-full [animation-delay:0.5s]"></div>
            <span className="mx-2">Ti ascolto... Parla pure</span>
            <div className="wave-bar w-1 bg-teal-400 rounded-full [animation-delay:0.2s]"></div>
            <div className="wave-bar w-1 bg-teal-400 rounded-full [animation-delay:0.4s]"></div>
          </div>
        )}

        {/* Center Mic Button & Text Input Form */}
        <div className="flex items-center gap-3">
          
          {/* Big Push-to-Talk Button */}
          <button
            type="button"
            onClick={handleMicToggle}
            disabled={!isSpeechSupported || isProcessing}
            title={isListening ? "Ferma ascolto" : "Parla con l'assistente"}
            className={`p-4 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl focus:outline-none ${
              isListening
                ? "bg-rose-600 text-white mic-active shadow-rose-600/30 scale-105"
                : isSpeaking
                ? "bg-teal-600 text-white shadow-teal-500/30 animate-pulse"
                : "bg-gradient-to-tr from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white shadow-teal-500/20 active:scale-95"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isListening ? (
              <MicOff className="w-6 h-6 animate-pulse" />
            ) : isSpeaking ? (
              <VolumeX className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          {/* Text Input fallback */}
          <form onSubmit={handleTextSubmit} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Oppure scrivi: es. 'Chiuso venerdì prossimo'..."
              disabled={isProcessing}
              className="flex-1 px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-teal-400 disabled:opacity-40 transition-colors focus:outline-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

        </div>
      </footer>

      {/* Human-In-The-Loop Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        proposal={currentProposal}
        onConfirm={handleConfirmProposal}
        onCancel={handleCancelProposal}
        onReplayVoice={() => {
          if (currentProposal) {
            if (currentProposal.action === "delete") {
              speak(`Confermi l'eliminazione delle eccezioni per il giorno ${currentProposal.date}?`);
            } else {
              const dateText = currentProposal.dateFrom;
              const actionText = currentProposal.closed ? "la chiusura totale" : `l'orario ${currentProposal.startTime}`;
              speak(`Confermi ${actionText} per la data ${dateText}?`);
            }
          }
        }}
        isApplying={isApplyingOverride}
      />

    </div>
  );
}
