import React, { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Calendar, Clock, Volume2, ShieldCheck } from "lucide-react";

export function ConfirmationModal({
  isOpen,
  proposal,
  onConfirm,
  onCancel,
  onReplayVoice,
  isApplying = false,
}) {
  const [localStartTime, setLocalStartTime] = useState(proposal?.startTime || "");
  const [localEndTime, setLocalEndTime] = useState(proposal?.endTime || "");
  const [prevProposal, setPrevProposal] = useState(proposal);

  if (proposal !== prevProposal) {
    setPrevProposal(proposal);
    if (proposal) {
      setLocalStartTime(proposal.startTime || "");
      setLocalEndTime(proposal.endTime || "");
    }
  }

  if (!isOpen || !proposal) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const isDeleteAction = proposal?.action === "delete";
  const isClosed = !isDeleteAction && !!proposal.closed;
  const isDateRange = !isDeleteAction && proposal.dateTo && proposal.dateTo !== proposal.dateFrom;
  const isIncomplete = !isDeleteAction && !isClosed && !localStartTime && !localEndTime;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Header Badge */}
        <div className="flex items-center justify-between">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              isDeleteAction
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "bg-teal-500/10 text-teal-400 border border-teal-500/20"
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${isDeleteAction ? "text-rose-400" : "text-teal-400"}`} />
            Human-In-The-Loop Validation
          </div>
          {onReplayVoice && (
            <button
              onClick={onReplayVoice}
              title="Riascolta a voce"
              className={`p-2 rounded-xl bg-slate-800 text-slate-400 transition-colors ${
                isDeleteAction ? "hover:text-rose-400 hover:bg-slate-700" : "hover:text-teal-400 hover:bg-slate-700"
              }`}
            >
              <Volume2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isDeleteAction ? "Conferma Eliminazione Eccezione" : "Conferma Eccezione Oraria"}
          </h2>
          <p className="text-sm text-slate-400">
            {isDeleteAction
              ? "L'assistente ha preparato la cancellazione delle eccezioni per la seguente data. Verifica con attenzione prima di procedere."
              : "L'assistente ha strutturato la seguente modifica. Verifica con attenzione prima di procedere."}
          </p>
        </div>

        {/* Proposal Details Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          
          {/* Status Badge */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tipo Intervento:</span>
            {isDeleteAction ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                Eliminazione / Ripristino Standard
              </span>
            ) : isClosed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                Chiusura Straordinaria
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Variazione Orario
              </span>
            )}
          </div>

          {/* Date info */}
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                isDeleteAction ? "bg-rose-500/10 text-rose-400" : "bg-teal-500/10 text-teal-400"
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {isDeleteAction ? "Data da Eliminare" : isDateRange ? "Periodo Interessato" : "Data Interessata"}
              </p>
              <p className="text-sm font-semibold text-white capitalize">
                {formatDate(isDeleteAction ? proposal.date : proposal.dateFrom)}
              </p>
              {!isDeleteAction && isDateRange && (
                <p className="text-xs text-slate-300">
                  Fino a: <span className="font-semibold capitalize">{formatDate(proposal.dateTo)}</span>
                </p>
              )}
              {isDeleteAction && (
                <p className="text-xs text-rose-300/80 pt-1">
                  Verranno rimosse tutte le variazioni impostate per questo giorno, ripristinando l'orario settimanale predefinito.
                </p>
              )}
            </div>
          </div>

          {/* Time info if not delete and not closed */}
          {!isDeleteAction && !isClosed && (
            <div className="flex items-start gap-3 pt-2 border-t border-slate-800/60">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Orari di Ricevimento
                  </p>
                  {isIncomplete && (
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                      Orario Richiesto
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 mb-1">Inizio</label>
                    <input
                      type="time"
                      aria-label="Orario di inizio"
                      value={localStartTime}
                      onChange={(e) => setLocalStartTime(e.target.value)}
                      placeholder="--:--"
                      className={`w-full px-3 py-2 rounded-xl bg-slate-900 border text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
                        isIncomplete ? "border-amber-500/50 focus:border-amber-500" : "border-slate-700"
                      }`}
                    />
                  </div>
                  <span className="text-slate-500 pt-4 font-bold">-</span>
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 mb-1">Fine</label>
                    <input
                      type="time"
                      aria-label="Orario di fine"
                      value={localEndTime}
                      onChange={(e) => setLocalEndTime(e.target.value)}
                      placeholder="--:--"
                      className={`w-full px-3 py-2 rounded-xl bg-slate-900 border text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
                        isIncomplete ? "border-amber-500/50 focus:border-amber-500" : "border-slate-700"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Warning Alert */}
        {isIncomplete ? (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
            <span>
              <strong>Attenzione:</strong> Non è stato specificato alcun orario. Inserisci almeno un orario di apertura o chiusura a schermo (oppure annulla e usa la voce) per sbloccare la conferma.
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Nessuna modifica verrà applicata sul database senza il tuo click esplicito su <strong>Conferma</strong>.
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isApplying}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-600"
          >
            <XCircle className="w-4 h-4" />
            Annulla / Correggi
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm({
                ...proposal,
                startTime: localStartTime.trim() || undefined,
                endTime: localEndTime.trim() || undefined,
              })
            }
            disabled={isApplying || isIncomplete}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold text-sm shadow-lg transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDeleteAction
                ? "bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 active:from-rose-700 active:to-rose-600 shadow-rose-500/20 focus:ring-rose-400"
                : "bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 active:from-teal-700 active:to-teal-600 shadow-teal-500/20 focus:ring-teal-400"
            }`}
          >
            {isApplying ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Applicazione...
              </span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {isDeleteAction ? "Conferma ed Elimina" : "Conferma e Salva"}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
