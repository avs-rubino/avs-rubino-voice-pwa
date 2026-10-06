import React, { useState, useEffect } from "react";
import { Share2, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { shareAvvisoImage } from "../services/avvisoImage";

/**
 * Pulsante per la condivisione / download dell'immagine avviso con anteprima grafica.
 * @param {{ blob: Blob, filename: string, shareText: string }} props
 */
export function ShareAvvisoButton({ blob, filename, shareText }) {
  const [status, setStatus] = useState("idle"); // "idle" | "loading" | "downloaded" | "error"
  const [errorMsg, setErrorMsg] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!blob) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  const handleShare = async () => {
    if (!blob || status === "loading") return;
    setStatus("loading");
    setErrorMsg(null);

    try {
      const result = await shareAvvisoImage(blob, filename, shareText);
      if (result.method === "download") {
        setStatus("downloaded");
      } else {
        // "share" o "aborted" -> reset a idle
        setStatus("idle");
      }
    } catch (err) {
      console.error("Errore durante la condivisione dell'avviso:", err);
      setErrorMsg(err.message || "Impossibile condividere o scaricare l'avviso");
      setStatus("error");
    }
  };

  return (
    <>
      {/* Visualizzazione compatta standard (dock) */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Anteprima avviso"
            onClick={() => setIsFullscreen(true)}
            title="Clicca per ingrandire"
            className="w-20 sm:w-24 h-auto rounded-xl border border-slate-700 shadow-md shrink-0 cursor-pointer hover:opacity-90 hover:scale-105 transition-all"
          />
        )}

        <div className="flex flex-col items-center sm:items-start gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleShare}
            disabled={status === "loading"}
            aria-label="Condividi avviso social"
            aria-busy={status === "loading"}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Condivisione in corso...</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Condividi avviso</span>
              </>
            )}
          </button>

          {/* Area riscontro per accessibilità (role="status" e aria-live="polite") */}
          <div role="status" aria-live="polite" className="text-xs min-h-[1.25rem] flex items-center justify-center sm:justify-start w-full">
            {status === "downloaded" && (
              <span className="inline-flex items-center gap-1.5 text-teal-300 font-medium animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                Immagine scaricata
              </span>
            )}
            {status === "error" && errorMsg && (
              <span className="inline-flex items-center gap-1.5 text-rose-300 font-medium animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                {errorMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visualizzazione modale a tutto schermo */}
      {isFullscreen && previewUrl && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-fade-in">
          {/* Pulsante di chiusura (X) in alto a destra */}
          <button
            onClick={() => setIsFullscreen(false)}
            aria-label="Chiudi anteprima"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Immagine ingrandita */}
          <img
            src={previewUrl}
            alt="Anteprima a grandezza naturale"
            className="max-w-full max-h-[65vh] sm:max-h-[75vh] object-contain rounded-2xl shadow-2xl mb-6 border border-slate-700/50"
          />
          
          {/* Contenitore Pulsante Condivisione Modal */}
          <div className="flex flex-col items-center gap-2 w-full max-w-sm">
            <button
              type="button"
              onClick={handleShare}
              disabled={status === "loading"}
              aria-label="Condividi avviso social dalla vista ingrandita"
              aria-busy={status === "loading"}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold shadow-lg shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Condivisione in corso...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  <span>Condividi questo avviso</span>
                </>
              )}
            </button>

            {/* Area riscontro per modale */}
            <div role="status" aria-live="polite" className="text-sm min-h-[1.5rem] flex items-center justify-center w-full">
              {status === "downloaded" && (
                <span className="inline-flex items-center gap-1.5 text-teal-300 font-medium animate-fade-in text-center">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  Immagine scaricata con successo
                </span>
              )}
              {status === "error" && errorMsg && (
                <span className="inline-flex items-center gap-1.5 text-rose-300 font-medium animate-fade-in text-center">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  {errorMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
