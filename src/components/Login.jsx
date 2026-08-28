import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, Mic, AlertCircle, Sparkles } from "lucide-react";

export function Login() {
  const { loginWithEmail, loginWithGoogle, loginAsGuest, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      setLocalError(err.message || "Errore durante l'accesso");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError("");
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setLocalError(err.message || "Errore durante l'accesso Google");
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        
        {/* Logo / Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-400 text-white shadow-lg shadow-teal-500/25 mb-1">
            <Mic className="w-7 h-7 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            AVS Rubino Voice
          </h1>
          <p className="text-xs text-slate-400">
            Assistente vocale per la gestione orari ambulatorio
          </p>
        </div>

        {/* Error Alert */}
        {displayError && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@avsrubino.it"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 active:from-teal-700 active:to-teal-600 text-white font-semibold text-sm shadow-lg shadow-teal-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50"
          >
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full"></div>
          <span className="bg-slate-900 px-3 text-xs text-slate-500 uppercase tracking-wider">oppure</span>
        </div>

        {/* Google Sign-in */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-medium text-sm border border-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-teal-400" />
          Accedi con Google
        </button>

        {/* Local Test Mode Button (solo in ambiente di sviluppo) */}
        {import.meta.env.DEV && (
          <div className="pt-2 border-t border-slate-800/60 text-center">
            <button
              type="button"
              onClick={loginAsGuest}
              className="text-xs text-teal-400 hover:text-teal-300 underline font-medium transition-colors cursor-pointer"
            >
              🧪 Modalità Test Locale (Sviluppo)
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
