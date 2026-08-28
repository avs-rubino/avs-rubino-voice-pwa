import { useState, useEffect, useCallback, useRef } from "react";

export function useSpeechSynthesis({ lang = "it-IT", pitch = 1.0, rate = 1.05 } = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const currentUtteranceRef = useRef(null);

  useEffect(() => {
    if (!isSupported) return;

    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const speak = useCallback(
    (text, onEnd) => {
      if (!isSupported || !text) return;

      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.pitch = pitch;
      utterance.rate = rate;

      // Prioritize Italian voice
      const italianVoice = voices.find(
        (v) => v.lang.toLowerCase().startsWith("it") || v.name.toLowerCase().includes("italian")
      );
      if (italianVoice) {
        utterance.voice = italianVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, lang, pitch, rate, voices]
  );

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return {
    isSpeaking,
    speak,
    stop,
    isSupported,
  };
}
