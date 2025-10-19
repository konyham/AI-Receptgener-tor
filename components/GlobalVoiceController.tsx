import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useNotification } from '../contexts/NotificationContext';

interface GlobalVoiceControllerProps {
  onCommand: (transcript: string) => void;
  isProcessing: boolean;
  onTranscriptUpdate: (transcript: string | null) => void;
  onActivate: () => void;
}

type Mode = 'IDLE' | 'LISTENING_FOR_WAKE_WORD' | 'AWAITING_COMMAND' | 'LISTENING_FOR_COMMAND';

const GlobalVoiceController: React.FC<GlobalVoiceControllerProps> = ({ onCommand, isProcessing, onTranscriptUpdate, onActivate }) => {
  const [isHandsFreeActive, setIsHandsFreeActive] = useState(false);
  const [mode, setMode] = useState<Mode>('IDLE');
  const commandTimeoutRef = useRef<number | null>(null);
  const { showNotification } = useNotification();
  const lastTranscript = useRef('');

  const speak = useCallback((text: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hu-HU';
    utterance.rate = 1.1;
    if (onEnd) utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleResult = (transcript: string, isFinal: boolean) => {
    onTranscriptUpdate(transcript);

    if (mode === 'LISTENING_FOR_WAKE_WORD' && transcript.toLowerCase().includes('oké miki')) {
      stopListening();
      speak("Hallgatom...", () => {
        setMode('LISTENING_FOR_COMMAND');
      });
    } else if (mode === 'LISTENING_FOR_COMMAND' && isFinal && transcript.trim() && transcript !== lastTranscript.current) {
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
      lastTranscript.current = transcript;
      onCommand(transcript);
      setMode('LISTENING_FOR_WAKE_WORD');
    }
  };
  
  const handleSpeechError = (error: string) => {
      if (error === 'not-allowed') {
          showNotification('A mikrofon használata le van tiltva. A funkcióhoz engedélyezze a böngészőben.', 'info');
      }
  };

  const { isListening, startListening, stopListening, permissionState } = useSpeechRecognition({
    onResult: handleResult,
    continuous: true,
    interimResults: true,
    onError: handleSpeechError,
  });

  useEffect(() => {
    if (isHandsFreeActive && permissionState === 'granted' && !isListening) {
      startListening();
      setMode('LISTENING_FOR_WAKE_WORD');
    } else if (!isHandsFreeActive && isListening) {
      stopListening();
      setMode('IDLE');
    }
  }, [isHandsFreeActive, isListening, permissionState, startListening, stopListening]);

  useEffect(() => {
    if (mode === 'LISTENING_FOR_COMMAND') {
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = window.setTimeout(() => {
        setMode('LISTENING_FOR_WAKE_WORD');
      }, 8000);
    }
    return () => {
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    };
  }, [mode]);
  
  const toggleHandsFree = () => {
      if (permissionState !== 'granted') {
          showNotification("A hangvezérléshez engedélyezze a mikrofon használatát.", "info");
      }
      if (isHandsFreeActive) {
        onTranscriptUpdate(null);
      } else {
        onActivate();
      }
      setIsHandsFreeActive(prev => !prev);
  }

  let statusText = "Kikapcsolva";
  if (isHandsFreeActive) {
    if (isProcessing) statusText = "Feldolgozás...";
    else if (mode === 'LISTENING_FOR_WAKE_WORD') statusText = "Figyelek az 'Oké, Miki!'-re...";
    else if (mode === 'LISTENING_FOR_COMMAND') statusText = "Hallgatom a parancsot...";
  }
  if (permissionState === 'denied') statusText = "Mikrofon letiltva";

  return (
    <div className="flex items-center gap-3">
        <label className="flex items-center cursor-pointer">
            <div className="relative">
                <input type="checkbox" className="sr-only" checked={isHandsFreeActive} onChange={toggleHandsFree} disabled={permissionState === 'denied'}/>
                <div className={`block w-14 h-8 rounded-full transition ${isHandsFreeActive ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isHandsFreeActive ? 'transform translate-x-6' : ''}`}></div>
            </div>
        </label>
        <div className="flex flex-col">
            <span className="font-semibold text-gray-700">Kihangosított mód</span>
            <span className={`text-sm h-5 transition-colors ${mode === 'LISTENING_FOR_COMMAND' ? 'text-blue-600 font-medium animate-pulse' : 'text-gray-500'}`}>{statusText}</span>
        </div>
    </div>
  );
};

export default GlobalVoiceController;