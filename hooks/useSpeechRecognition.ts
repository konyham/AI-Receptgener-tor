import { useState, useEffect, useRef, useCallback } from 'react';
// FIX: Corrected import path to be relative.
import type { SpeechRecognition, SpeechRecognitionErrorEvent } from '../types';

interface UseSpeechRecognitionOptions {
  onResult: (transcript: string, isFinal: boolean) => void;
  continuous?: boolean;
  interimResults?: boolean;
  onError?: (errorType: string) => void;
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'checking';

export const useSpeechRecognition = ({
  onResult,
  continuous = false,
  interimResults = false,
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
        if ((err as DOMException).name !== 'InvalidStateError') {
            console.error('Error starting speech recognition:', err);
        }
      }
    }
  }, [isListening, permissionState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // FIX: Cast window to `any` to access browser-prefixed SpeechRecognition APIs without TypeScript errors.
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = 'hu-HU';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const transcript = (finalTranscript || interimTranscript).trim();
      const isFinal = !!finalTranscript.trim();

      if (transcript) {
        onResultRef.current(transcript, isFinal);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setPermissionState('denied');
        console.warn("Speech recognition info: Microphone access was denied by the user.");
        onErrorRef.current?.(event.error);
      } else if (event.error === 'network') {
        console.warn('Speech recognition network error. This can happen on long continuous sessions.');
        // This error often triggers an 'onend' event, so the system should try to restart itself.
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn(`Speech recognition error: ${event.error}`);
        onErrorRef.current?.(event.error);
      }
    };

    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      if (recognitionRef.current) {
          recognitionRef.current.abort();
      }
    };
  }, [continuous, interimResults]);

  return { isListening, isSupported, startListening, stopListening, permissionState };
};
