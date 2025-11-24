import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useNotification } from '../contexts/NotificationContext';

interface GlobalVoiceControllerProps {
  onCommand: (transcript: string) => void;
  isProcessing: boolean;
  onTranscriptUpdate: (transcript: string | null) => void;
  onActivate: () => void;
}

type Mode = 'IDLE' | 'LISTENING_FOR_WAKE_WORD' | 'LISTENING_FOR_COMMAND';

const GlobalVoiceController: React.FC<GlobalVoiceControllerProps> = ({ onCommand, isProcessing, onTranscriptUpdate, onActivate }) => {
  const [isHandsFreeActive, setIsHandsFreeActive] = useState(false);
  const [mode, setMode] = useState<Mode>('IDLE');
  const commandTimeoutRef = useRef<number | null>(null);
  const { showNotification } = useNotification();
  const lastTranscript = useRef(''); // To prevent processing the same final transcript multiple times

  const speak = useCallback((text: string, onEnd?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hu-HU';
    utterance.rate = 1.1;
    if (onEnd) utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleResult = (transcript: string, isFinal: boolean) => {
    const lowerTranscript = transcript.toLowerCase();
    onTranscriptUpdate(transcript);
    
    // Ignore duplicate final results
    if (isFinal && transcript.trim() === lastTranscript.current) {
        return;
    }

    if (mode === 'LISTENING_FOR_WAKE_WORD' && lowerTranscript.includes('oké generátor')) {
      if (isFinal) {
          lastTranscript.current = transcript.trim();
      }
      stopListening();
      speak("Hallgatom...");
      setMode('LISTENING_FOR_COMMAND');
      onTranscriptUpdate(null);
    } 
    else if (mode === 'LISTENING_FOR_COMMAND' && isFinal && transcript.trim()) {
        lastTranscript.current = transcript.trim();
        const commandText = lowerTranscript.replace(/oké generátor/g, '').trim();
        
        // If the result only contains the wake word again, ignore it and wait for the actual command.
        // The timeout will handle resetting to wake word mode if no command is given.
        if (!commandText) {
            return;
        }

        if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
        stopListening();
        onCommand(commandText);
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

  useEffect(() => {
    if (!isHandsFreeActive && isListening) {
      stopListening();
      setMode('IDLE');
    } else if (isHandsFreeActive && permissionState === 'granted' && !isListening) {
      if (mode === 'LISTENING_FOR_WAKE_WORD' || mode === 'LISTENING_FOR_COMMAND') {
        startListening();
      }
    }
  }, [isHandsFreeActive, isListening, permissionState, mode, startListening, stopListening]);


  useEffect(() => {
    if (mode === 'LISTENING_FOR_COMMAND') {
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = window.setTimeout(() => {
        if(isListening) stopListening();
        setMode('LISTENING_FOR_WAKE_WORD');
        onTranscriptUpdate(null);
      }, 8000); // 8 second timeout to give a command
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
        setMode('LISTENING_FOR_WAKE_WORD');
      } else {
        onTranscriptUpdate(null);
        setMode('IDLE');
      }
  }

  let statusText = "Kikapcsolva";
  if (isHandsFreeActive) {
    if (isProcessing) {
      statusText = "Feldolgozás...";
    } else if (mode === 'LISTENING_FOR_WAKE_WORD') {
      statusText = "Figyelek az 'Oké generátor'-ra...";
    } else if (mode === 'LISTENING_FOR_COMMAND') {
      statusText = "Hallgatom...";
    }
  }
  if (permissionState === 'denied') {
    statusText = "Mikrofon letiltva";
  }


  return (
    <div className="flex items-center gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 transition-colors duration-300 ${isHandsFreeActive ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
            <path d="M5.5 10.5a.5.5 0 01.5-.5h8a.5.5 0 010 1H6a.5.5 0 01-.5-.5z"/>
            <path d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
        </svg>
        <div className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Hangvezérlés</span>
            <span className={`text-sm h-5 transition-colors ${mode === 'LISTENING_FOR_COMMAND' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>{statusText}</span>
        </div>
        <label className="flex items-center cursor-pointer">
            <div className="relative">
                <input type="checkbox" className="sr-only" checked={isHandsFreeActive} onChange={toggleHandsFree} disabled={permissionState === 'denied'} aria-label={isHandsFreeActive ? "Hangvezérlés kikapcsolása" : "Hangvezérlés bekapcsolása"}/>
                <div className={`block w-14 h-8 rounded-full transition ${isHandsFreeActive ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isHandsFreeActive ? 'transform translate-x-6' : ''}`}></div>
            </div>
        </label>
    </div>
  );
};

export default GlobalVoiceController;