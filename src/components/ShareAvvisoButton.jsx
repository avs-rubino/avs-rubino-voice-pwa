import React, { useState, useEffect } from "react";
import { Share2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { shareAvvisoImage } from "../services/avvisoImage";

/**
 * Pulsante per la condivisione / download dell'immagine avviso con anteprima grafica.
 * @param {{ blob: Blob, filename: string, shareText: string }} props
 */
export function ShareAvvisoButton({ blob, filename, shareText }) {
  const [status, setStatus] = useState("idle"); // "idle" | "loading" | "downloaded" | "error"
  const [errorMsg, setErrorMsg] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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
    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Anteprima avviso"
          className="w-20 sm:w-24 h-auto rounded-xl border border-slate-700 shadow-md shrink-0"
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
  );
}
