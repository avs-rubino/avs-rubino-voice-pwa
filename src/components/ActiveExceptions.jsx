import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Info, Calendar, Clock, AlertCircle, RefreshCw, X, Building } from 'lucide-react';
import { fetchPublicContent } from '../services/api';

/**
 * Formats a date string YYYY-MM-DD into a localized readable Italian date.
 * Example: '2026-08-30' -> '30 ago 2026'
 */
function formatDateItalian(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Filter and sort overrides that are still active (today or future).
 * Uses ISO YYYY-MM-DD comparison.
 */
function getActiveOverrides(overrides = []) {
  if (!Array.isArray(overrides)) return [];
  const todayIso = new Date().toISOString().split('T')[0];

  return overrides
    .filter((ovr) => {
      const endDate = ovr.dateTo || ovr.dateFrom;
      return typeof endDate === 'string' && endDate >= todayIso;
    })
    .sort((a, b) => (a.dateFrom || '').localeCompare(b.dateFrom || ''));
}

export function ActiveExceptions({ refreshTrigger = 0, selectedStudio = 'orariFormia' }) {
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInfoBanner, setShowInfoBanner] = useState(false);
  const [activeTab, setActiveTab] = useState(selectedStudio);

  // Sync activeTab if selectedStudio changes from parent
  useEffect(() => {
    if (selectedStudio) {
      setActiveTab(selectedStudio);
    }
  }, [selectedStudio]);

  const loadExceptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPublicContent();
      setContent(data);
    } catch (err) {
      console.error('❌ [ActiveExceptions] Errore caricamento eccezioni:', err);
      setError('Impossibile recuperare le eccezioni attive.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions, refreshTrigger]);

  const activeOverridesFormia = useMemo(() => {
    return getActiveOverrides(content?.orariFormia?.overrides);
  }, [content]);

  const activeOverridesSecondoStudio = useMemo(() => {
    return getActiveOverrides(content?.orariSecondoStudio?.overrides);
  }, [content]);

  const currentOverrides = activeTab === 'orariFormia' ? activeOverridesFormia : activeOverridesSecondoStudio;
  const currentCount = currentOverrides.length;

  return (
    <section 
      aria-labelledby="active-exceptions-heading"
      className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3.5 sm:p-4 text-slate-100 shadow-lg space-y-3 transition-all duration-200"
    >
      {/* Header with Title, Count badge, Info Icon & Refresh */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Calendar className="w-4 h-4" />
          </div>
          <h2 id="active-exceptions-heading" className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight">
            Eccezioni Orarie Attive
          </h2>
          <span 
            aria-label={`${currentCount} eccezioni attive nella sede corrente`}
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30 transition-all"
          >
            {currentCount} {currentCount === 1 ? 'attiva' : 'attive'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Info (i) button */}
          <button
            type="button"
            onClick={() => setShowInfoBanner((prev) => !prev)}
            title="Informazioni sui tempi di aggiornamento del sito"
            aria-label="Informazioni sulla cache del sito"
            aria-expanded={showInfoBanner}
            className={`p-1.5 rounded-xl border transition-colors ${
              showInfoBanner
                ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-teal-300 hover:bg-slate-800'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={loadExceptions}
            disabled={isLoading}
            title="Ricarica eccezioni"
            aria-label="Ricarica eccezioni"
            className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Info Banner on 3-Minute Website Cache */}
      {showInfoBanner && (
        <div 
          role="region" 
          aria-label="Avviso aggiornamento cache"
          className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/30 text-teal-200 text-xs flex items-start justify-between gap-2.5 animate-fade-in"
        >
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed text-teal-100/90 text-[11px] sm:text-xs">
              <strong className="text-teal-300 font-semibold">Nota di sincronizzazione:</strong> Se il sito web pubblico della clinica è stato visualizzato di recente, potrebbe essere necessario attendere fino a <strong className="text-teal-300 font-semibold">3 minuti</strong> prima che le nuove variazioni orarie siano visibili online a causa della cache.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInfoBanner(false)}
            title="Chiudi avviso"
            aria-label="Chiudi avviso"
            className="text-teal-400/80 hover:text-teal-200 p-0.5 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Studio Selector Tabs for mobile responsiveness */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800/60">
        <button
          type="button"
          onClick={() => setActiveTab('orariFormia')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'orariFormia'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Building className="w-3 h-3" />
          <span>Formia ({activeOverridesFormia.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orariSecondoStudio')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'orariSecondoStudio'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Building className="w-3 h-3" />
          <span>2° Studio ({activeOverridesSecondoStudio.length})</span>
        </button>
      </div>

      {/* Content Area */}
      {isLoading && !content ? (
        <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <div className="w-3 h-3 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <span>Caricamento eccezioni attive...</span>
        </div>
      ) : error ? (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : currentOverrides.length === 0 ? (
        <div className="py-3 px-2 text-center text-xs text-slate-400 bg-slate-950/30 rounded-xl border border-slate-800/30">
          Nessuna eccezione oraria attiva per questa sede.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {currentOverrides.map((ovr, idx) => {
            const isRange = ovr.dateTo && ovr.dateTo !== ovr.dateFrom;
            const dateLabel = isRange
              ? `${formatDateItalian(ovr.dateFrom)} → ${formatDateItalian(ovr.dateTo)}`
              : formatDateItalian(ovr.dateFrom);

            return (
              <div
                key={ovr.id || `ovr-${idx}`}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                  <span className="font-medium text-slate-200 truncate">
                    {dateLabel}
                  </span>
                </div>

                <div className="flex-shrink-0">
                  {ovr.closed ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      Chiuso
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {ovr.startTime || ''} - {ovr.endTime || ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
