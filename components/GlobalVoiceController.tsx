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
      setMode('AWAITING_COMMAND');
      speak("Hallgatom...", () => {
        // Csak a beszéd befejezése után kezdjük a figyelést
        startListening();
        setMode('LISTENING_FOR_COMMAND');
      });
    } else if (mode === 'LISTENING_FOR_COMMAND' && isFinal && transcript.trim() && transcript !== lastTranscript.current) {
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
      lastTranscript.current = transcript;
      stopListening();
      onCommand(transcript);
      // Parancs feldolgozása után azonnal álljunk vissza a vezényszó figyelésére
      setMode('LISTENING_FOR_WAKE_WORD');
    }
  };
  
  const handleSpeechError = (error: string) => {
      if (error === 'not-allowed') {
          showNotification('A mikrofon használata le van tiltva. A funkcióhoz engedélyezze a böngészőben.', 'info');
          setIsHandsFreeActive(false);
          setMode('IDLE');
      }
  };

  const { isListening, startListening, stopListening, permissionState } = useSpeechRecognition({
    onResult: handleResult,
    continuous: true,
    interimResults: true,
    onError: handleSpeechError,
  });

  // Állapotgép vezérlő logikája
  useEffect(() => {
    if (!isHandsFreeActive && isListening) {
      stopListening();
      setMode('IDLE');
    } else if (isHandsFreeActive && permissionState === 'granted' && !isListening) {
      // Csak akkor indítsuk újra a figyelést, ha a megfelelő állapotban vagyunk
      // (pl. nem várunk a "Hallgatom..." befejezésére)
      if (mode === 'LISTENING_FOR_WAKE_WORD') {
        startListening();
      }
    }
  }, [isHandsFreeActive, isListening, permissionState, mode, startListening, stopListening]);


  useEffect(() => {
    if (mode === 'LISTENING_FOR_COMMAND') {
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
      // Időzítő, hogy visszatérjünk a vezényszó figyeléséhez, ha nem érkezik parancs
      commandTimeoutRef.current = window.setTimeout(() => {
        if(isListening) stopListening();
        setMode('LISTENING_FOR_WAKE_WORD');
        onTranscriptUpdate(null);
      }, 8000);
    }
    return () => {
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    };
  }, [mode, isListening, stopListening, onTranscriptUpdate]);
  
  const toggleHandsFree = () => {
      if (permissionState !== 'granted' && !isHandsFreeActive) {
          showNotification("A hangvezérléshez engedélyezze a mikrofon használatát.", "info");
      }
      
      const newActiveState = !isHandsFreeActive;
      setIsHandsFreeActive(newActiveState);

      if (newActiveState) {
        onActivate();
        setMode('LISTENING_FOR_WAKE_WORD'); // Kezdőállapot beállítása az indításhoz
      } else {
        onTranscriptUpdate(null);
      }
  }

  let statusText = "Kikapcsolva";
  if (isHandsFreeActive) {
    if (isProcessing) statusText = "Feldolgozás...";
    else if (mode === 'LISTENING_FOR_WAKE_WORD') statusText = "Figyelek az 'Oké, Miki!'-re...";
    else if (mode === 'LISTENING_FOR_COMMAND') statusText = "Hallgatom a parancsot...";
    else if (mode === 'AWAITING_COMMAND') statusText = 'Válasz...';
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