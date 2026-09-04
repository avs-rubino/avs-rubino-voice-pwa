import { useState, useEffect, useRef, useCallback } from "react";

export function useSpeechRecognition({ onResult, onEnd, onError, lang = "it-IT" } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const isSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const [error, setError] = useState(isSupported ? null : "Il browser non supporta il riconoscimento vocale Web Speech API.");

  const recognitionRef = useRef(null);

  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onResult, onEnd, onError]);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let currentInterim = "";
      let finalTranscriptText = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscriptText += item[0].transcript;
        } else {
          currentInterim += item[0].transcript;
        }
      }

      setInterimTranscript(currentInterim);

      if (finalTranscriptText) {
        setTranscript(finalTranscriptText);
        setInterimTranscript("");
        if (onResultRef.current) {
          onResultRef.current(finalTranscriptText);
        }
      }
    };

    recognition.onerror = (event) => {
      // Ignore normal 'no-speech' or 'aborted' as standard cancellation
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
        setError(`Errore microfono: ${event.error}`);
        if (onErrorRef.current) {
          onErrorRef.current(event.error);
        }
      }
      setIsListening(false);
      setInterimTranscript("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      if (onEndRef.current) {
        onEndRef.current();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // ignore cleanup abort error
      }
    };
  }, [isSupported, lang]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      setTranscript("");
      setInterimTranscript("");
      setError(null);
      recognitionRef.current.start();
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.warn("Failed to stop speech recognition:", err);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
