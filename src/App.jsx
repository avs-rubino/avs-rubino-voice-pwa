import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Login } from "./components/Login";
import { VoiceAssistant } from "./components/VoiceAssistant";
import { Mic } from "lucide-react";

function MainContent() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-200 space-y-4">
        <div className="p-4 rounded-3xl bg-teal-500/10 text-teal-400 border border-teal-500/20 animate-pulse">
          <Mic className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"></span>
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:0.2s]"></span>
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:0.4s]"></span>
        </div>
        <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">
          Caricamento AVS Voice...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return <VoiceAssistant />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
