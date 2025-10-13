import { useState, useEffect, useRef, useCallback } from 'react';
import type { SpeechRecognition } from '../types';

interface UseSpeechRecognitionOptions {
  onResult: (transcript: string) => void;
  continuous?: boolean;
  onError?: (errorType: string) => void;
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'checking';

export const useSpeechRecognition = ({
  onResult,
  continuous = false,
  onError,
}: UseSpeechRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>('checking');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (typeof navigator.permissions === 'undefined') {
        setPermissionState('prompt');
        return;
    }
      
    navigator.permissions.query({ name: 'microphone' as PermissionName }).then((permissionStatus) => {
      setPermissionState(permissionStatus.state as PermissionState);
      permissionStatus.onchange = () => {
        setPermissionState(permissionStatus.state as PermissionState);
      };
    }).catch((err) => {
        console.error("Permission API query failed:", err);
        setPermissionState('prompt');
    });
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening && permissionState !== 'denied') {
      try {
        recognitionRef.current.lang = 'hu-HU';
        recognitionRef.current.start();
      } catch (err) {
        // The browser's SpeechRecognition API can throw an "InvalidStateError" DOMException
        // if .start() is called when it is already starting. This can happen in React
        // due to the asynchronous nature of state updates and effects. We can safely
        // ignore this specific error, as it means the desired state (listening) is
        // already being entered.
        if ((err as DOMException).name !== 'InvalidStateError') {
            console.error('Error starting speech recognition:', err);
        }
      }
    }
  }, [isListening, permissionState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = continuous;
    recognition.interimResults = false;
    recognition.lang = 'hu-HU';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0].transcript)
        .join('')
        .trim();

      if (transcript) {
        onResultRef.current(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setPermissionState('denied');
        console.warn("Speech recognition info: Microphone access was denied by the user.");
        onErrorRef.current?.(event.error);
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn(`Speech recognition error: ${event.error}`);
        onErrorRef.current?.(event.error);
      }
    };

    return () => {
      recognition.stop();
    };
  }, [continuous]);

  return { isListening, isSupported, startListening, stopListening, permissionState };
};
