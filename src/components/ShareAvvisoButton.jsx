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

      {/* Visualizzazione modale Full-Screen (Lightbox) */}
      {isFullscreen && previewUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center animate-fade-in overflow-hidden">
          
          {/* Immagine a tutto schermo */}
          <img
            src={previewUrl}
            alt="Anteprima a grandezza naturale"
            className="w-full h-full object-contain"
          />

          {/* Overlay Azioni Fluttuanti */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 pb-6 sm:pb-8">
            
            {/* Header: Pulsante Chiudi */}
            <div className="flex justify-end">
              <button
                onClick={() => setIsFullscreen(false)}
                aria-label="Chiudi anteprima"
                className="pointer-events-auto p-3.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-800 transition-colors shadow-lg backdrop-blur-sm border border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Footer: Status & Floating Share Button */}
            <div className="flex flex-col items-end gap-3">
              
              {/* Area riscontro per modale */}
              <div role="status" aria-live="polite" className="pointer-events-auto text-sm drop-shadow-md">
                {status === "downloaded" && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-900/80 text-teal-300 font-medium animate-fade-in backdrop-blur-sm border border-white/10">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    Salvato
                  </span>
                )}
                {status === "error" && errorMsg && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-900/80 text-rose-300 font-medium animate-fade-in backdrop-blur-sm border border-white/10">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    Errore
                  </span>
                )}
              </div>

              {/* FAB Condividi */}
              <button
                type="button"
                onClick={handleShare}
                disabled={status === "loading"}
                aria-label="Condividi avviso social dalla vista ingrandita"
                aria-busy={status === "loading"}
                title="Condividi questo avviso"
                className="pointer-events-auto flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-300 text-slate-950 shadow-[0_8px_30px_rgb(0,0,0,0.5)] active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-teal-400/40"
              >
                {status === "loading" ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <Share2 className="w-7 h-7" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
