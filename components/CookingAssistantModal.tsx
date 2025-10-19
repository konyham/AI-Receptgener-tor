import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Recipe, VoiceCommand, VoiceCommandResult } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { interpretUserCommand, analyzeInstructionForTimer } from '../services/geminiService';
import { useNotification } from '../contexts/NotificationContext';
import KitchenTimer from './KitchenTimer';

type VoiceStatus = 'disabled' | 'listening_wake_word' | 'command_prompt' | 'listening_command' | 'processing';

const CookingAssistantModal: React.FC<{ recipe: Recipe; onClose: () => void; }> = ({ recipe, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerData, setTimerData] = useState<{ hours?: number; minutes?: number; seconds?: number } | null>(null);
  const [extractedTimerForStep, setExtractedTimerForStep] = useState<{ hours?: number; minutes?: number; seconds?: number } | null>(null);
  const [isAnalyzingTimer, setIsAnalyzingTimer] = useState(false);
  const [isHandsFreeMode, setIsHandsFreeMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('disabled');

  const { showNotification } = useNotification();
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const commandTimeoutRef = useRef<number | null>(null);

  const playBeep = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  const acquireWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    acquireWakeLock();
    const handleVisibilityChange = () => document.visibilityState === 'visible' && acquireWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [acquireWakeLock, releaseWakeLock]);

  const stopSpeech = useCallback(() => window.speechSynthesis?.cancel(), []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hu-HU';
    utterance.rate = 0.9;
    if (onEnd) utterance.onend = onEnd;
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [stopSpeech]);

  const readCurrentStep = useCallback(() => {
    const stepText = recipe.instructions[currentStep]?.text;
    if (stepText) speak(`${currentStep + 1}. lépés: ${stepText}`);
  }, [currentStep, recipe.instructions, speak]);

  const handleCommandResult = useCallback(async (transcript: string) => {
    if (!transcript) { 
        setVoiceStatus('listening_wake_word');
        return;
    }
    setVoiceStatus('processing');
    try {
      const { command, payload } = await interpretUserCommand(transcript);
      let executed = true;
      switch (command) {
        case VoiceCommand.NEXT:
          setCurrentStep(prev => Math.min(prev + 1, recipe.instructions.length - 1));
          break;
        case VoiceCommand.PREVIOUS:
          setCurrentStep(prev => Math.max(prev - 1, 0));
          break;
        case VoiceCommand.REPEAT:
          readCurrentStep();
          break;
        case VoiceCommand.START_TIMER:
          const timerToStart = payload || extractedTimerForStep;
          if (timerToStart) {
            setTimerData(timerToStart);
            setIsTimerOpen(true);
          } else {
            showNotification('Nincs időzítő beállítva ehhez a lépéshez.', 'info');
          }
          break;
        case VoiceCommand.STOP:
          speak("Főzés leállítva.");
          onClose();
          break;
        default:
          executed = false;
          break;
      }
      if (executed) showNotification(`Parancs: ${transcript}`, 'success');
    } catch (e: any) {
      showNotification(e.message, 'info');
    } finally {
      if (isHandsFreeMode) {
        setVoiceStatus('listening_wake_word');
      } else {
        setVoiceStatus('disabled');
      }
    }
  }, [recipe.instructions.length, readCurrentStep, extractedTimerForStep, showNotification, onClose, isHandsFreeMode, speak]);

  const { startListening: startCommandListening, stopListening: stopCommandListening, isListening: isCommandListening } = useSpeechRecognition({
    onResult: handleCommandResult,
    continuous: false,
  });

  const handleWakeWordResult = useCallback((transcript: string) => {
    if (transcript.toLowerCase().includes('oké miki')) {
      stopWakeWordListening();
      playBeep();
      setVoiceStatus('command_prompt');
      setTimeout(() => setVoiceStatus('listening_command'), 200);
    }
  }, [playBeep]);

  const { startListening: startWakeWordListening, stopListening: stopWakeWordListening, isListening: isWakeWordListening } = useSpeechRecognition({
    onResult: handleWakeWordResult,
    continuous: true,
    interimResults: true,
  });

  useEffect(() => {
    if (!isHandsFreeMode) {
        stopWakeWordListening();
        stopCommandListening();
        setVoiceStatus('disabled');
        return;
    }

    if (voiceStatus === 'listening_wake_word' && !isWakeWordListening) {
        startWakeWordListening();
    } else if (voiceStatus === 'listening_command' && !isCommandListening) {
        startCommandListening();
        if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
        commandTimeoutRef.current = window.setTimeout(() => {
            if (voiceStatus === 'listening_command') {
                stopCommandListening();
                setVoiceStatus('listening_wake_word');
            }
        }, 7000); // 7s to give a command
    }
    
    return () => {
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    }
  }, [isHandsFreeMode, voiceStatus, isWakeWordListening, isCommandListening]);

  useEffect(() => {
    const analyze = async () => {
      const currentInstructionText = recipe.instructions[currentStep]?.text;
      if (currentInstructionText) {
        setIsAnalyzingTimer(true);
        setExtractedTimerForStep(null);
        const timer = await analyzeInstructionForTimer(currentInstructionText);
        setExtractedTimerForStep(timer);
        setIsAnalyzingTimer(false);
      }
    };
    analyze();
    readCurrentStep();
  }, [currentStep, recipe.instructions, readCurrentStep]);

  const handleClose = () => {
    stopSpeech();
    onClose();
  };

  const handleToggleHandsFree = () => {
    setIsHandsFreeMode(prev => {
        if (!prev) setVoiceStatus('listening_wake_word');
        return !prev;
    });
  };

  let statusText = "Kihangosított mód kikapcsolva";
  if (isHandsFreeMode) {
    switch (voiceStatus) {
      case 'listening_wake_word': statusText = "Figyelek az 'Oké, Miki!' parancsra..."; break;
      case 'command_prompt': statusText = "Parancsra vár..."; break;
      case 'listening_command': statusText = "Hallgatom a parancsot..."; break;
      case 'processing': statusText = "Parancs feldolgozása..."; break;
      default: statusText = "Kihangosított mód aktív";
    }
  }

  const totalSteps = recipe.instructions.length;
  const currentInstruction = recipe.instructions[currentStep];
  const formatTimerButtonText = (timer: { hours?: number; minutes?: number; seconds?: number }) => {
    const parts = [];
    if (timer.hours) parts.push(`${timer.hours} óra`);
    if (timer.minutes) parts.push(`${timer.minutes} perc`);
    if (timer.seconds) parts.push(`${timer.seconds} mp`);
    return parts.join(' ');
  };

  return (
    <>
      <div className="fixed inset-0 bg-white z-50 flex flex-col p-4 sm:p-8 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="assistant-title">
        <header className="flex-shrink-0 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 id="assistant-title" className="text-3xl font-bold text-primary-800">Főzési Asszisztens</h2>
              <p className="text-lg text-gray-600">{recipe.recipeName}</p>
            </div>
            <button onClick={handleClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Bezárás</button>
          </div>
        </header>

        <main className="flex-grow flex flex-col justify-center items-center text-center">
          <p className="text-gray-500 font-semibold mb-4 text-2xl">{currentStep + 1}. Lépés / {totalSteps}</p>
          <div className="w-full max-w-3xl min-h-[200px] flex items-center justify-center p-6 bg-primary-50 rounded-lg">
            <p className="text-3xl md:text-4xl lg:text-5xl font-serif text-gray-800 leading-snug">{currentInstruction?.text}</p>
          </div>
        </main>

        <footer className="flex-shrink-0 space-y-4">
          <div className="flex justify-center items-center gap-4">
            {isAnalyzingTimer ? (
              <div className="text-gray-500">Időzítő keresése...</div>
            ) : extractedTimerForStep && (
              <button onClick={() => { setTimerData(extractedTimerForStep); setIsTimerOpen(true); }} className="bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-600 transition-transform hover:scale-105">
                Időzítő Indítása ({formatTimerButtonText(extractedTimerForStep)})
              </button>
            )}
          </div>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setCurrentStep(p => Math.max(0, p - 1))} disabled={currentStep === 0} className="text-lg bg-gray-200 text-gray-800 font-bold py-4 px-8 rounded-lg disabled:opacity-50">Előző</button>
            <div className="flex flex-col items-center gap-2">
                <label className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input type="checkbox" className="sr-only" checked={isHandsFreeMode} onChange={handleToggleHandsFree} />
                        <div className={`block w-14 h-8 rounded-full transition ${isHandsFreeMode ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isHandsFreeMode ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                </label>
                <div className={`text-sm text-center w-48 h-10 flex items-center justify-center font-semibold ${voiceStatus === 'command_prompt' ? 'text-blue-600 animate-pulse' : 'text-gray-500'}`}>
                    {statusText}
                </div>
            </div>
            <button onClick={() => setCurrentStep(p => Math.min(totalSteps - 1, p + 1))} disabled={currentStep === totalSteps - 1} className="text-lg bg-gray-200 text-gray-800 font-bold py-4 px-8 rounded-lg disabled:opacity-50">Következő</button>
          </div>
          <p className="text-center text-gray-500 text-sm">Parancsok: "következő", "előző", "ismételd meg", "időzítő indítása"</p>
        </footer>
      </div>
      {isTimerOpen && <KitchenTimer onClose={() => setIsTimerOpen(false)} initialValues={timerData} />}
    </>
  );
};

export default CookingAssistantModal;
