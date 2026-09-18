import { useState, useEffect, useRef, useCallback } from 'react';

// SpeechRecognition interface declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface UseSpeechOptions {
  silenceTimeoutMs?: number;
  lang?: string;
  onSilenceComplete?: (transcript: string) => void;
}

export function useSpeechRecognition({
  silenceTimeoutMs = 1600,
  lang = 'vi-VN',
  onSilenceComplete,
}: UseSpeechOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTranscriptRef = useRef('');

  // Check browser support
  useEffect(() => {
    const hasSupport = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    setIsSupported(hasSupport);
    if (!hasSupport) {
      setError('Trình duyệt chưa hỗ trợ Web Speech API. Bạn có thể gõ văn bản trực tiếp.');
    }
  }, []);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;
    setError(null);
    setTranscript('');
    setInterimText('');
    currentTranscriptRef.current = '';
    clearSilenceTimer();

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalChunk += res[0].transcript;
          } else {
            interimChunk += res[0].transcript;
          }
        }

        if (finalChunk) {
          currentTranscriptRef.current = (currentTranscriptRef.current + ' ' + finalChunk).trim();
          setTranscript(currentTranscriptRef.current);
        }
        setInterimText(interimChunk);

        // Reset silence detection timer
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          const fullText = (currentTranscriptRef.current + ' ' + interimChunk).trim();
          if (fullText && onSilenceComplete) {
            onSilenceComplete(fullText);
          }
          stopListening();
        }, silenceTimeoutMs);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Vui lòng cấp quyền truy cập Microphone trong cài đặt trình duyệt.');
        } else if (event.error !== 'no-speech') {
          setError(`Lỗi nhận diện âm thanh: ${event.error}`);
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(`Không thể bật micro: ${errMsg}`);
      setIsListening(false);
    }
  }, [isSupported, lang, silenceTimeoutMs, onSilenceComplete, stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    interimText,
    isSupported,
    error,
    startListening,
    stopListening,
    toggleListening,
    setTranscript,
  };
}
