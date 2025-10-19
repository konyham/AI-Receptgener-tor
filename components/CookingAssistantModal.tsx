import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Recipe, VoiceCommand, VoiceCommandResult } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { interpretUserCommand, analyzeInstructionForTimer } from '../services/geminiService';
import { useNotification } from '../contexts/NotificationContext';
import KitchenTimer from './KitchenTimer';

// Define WakeLock types as they might not be in default lib.
interface WakeLockSentinel extends EventTarget {
  type: 'screen';
  release(): Promise<void>;
  onrelease: EventListener;
}

interface CookingAssistantModalProps {
  recipe: Recipe;
  onClose: () => void;
}

const CookingAssistantModal: React.FC<CookingAssistantModalProps> = ({ recipe, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerData, setTimerData] = useState<{ hours?: number; minutes?: number; seconds?: number } | null>(null);
  const [extractedTimerForStep, setExtractedTimerForStep] = useState<{ hours?: number; minutes?: number; seconds?: number } | null>(null);
  const [isAnalyzingTimer, setIsAnalyzingTimer] = useState(false);
  
  const { showNotification } = useNotification();
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Screen Wake Lock
  const acquireWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator && navigator.wakeLock && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.onrelease = () => {
          wakeLockRef.current = null;
          console.log('Screen Wake Lock was released');
        };
        console.log('Screen Wake Lock is active');
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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [acquireWakeLock, releaseWakeLock]);
  
  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);
  
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    stopSpeech();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hu-HU';
    utterance.rate = 0.9;
    if(onEnd) utterance.onend = onEnd;
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [stopSpeech]);

  const readCurrentStep = useCallback(() => {
    const stepText = recipe.instructions[currentStep]?.text;
    if (stepText) {
      speak(`${currentStep + 1}. lépés: ${stepText}`);
    }
  }, [currentStep, recipe.instructions, speak]);
  
  // Voice Commands
  const handleVoiceResult = useCallback(async (transcript: string) => {
    try {
      const { command, payload } = await interpretUserCommand(transcript);
      switch(command) {
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
          break;
      }
    } catch(e: any) {
      showNotification(e.message, 'info');
    }
  }, [recipe.instructions.length, readCurrentStep, extractedTimerForStep, showNotification, onClose]);
  
  // FIX: Removed `isProcessing` from destructuring as it's not returned by the `useSpeechRecognition` hook.
  const { isListening, startListening, stopListening, permissionState } = useSpeechRecognition({
    onResult: handleVoiceResult,
    continuous: false,
  });

  // Analyze instruction for timer when step changes
  useEffect(() => {
    const analyze = async () => {
      const currentInstructionText = recipe.instructions[currentStep]?.text;
      if (currentInstructionText) {
        setIsAnalyzingTimer(true);
        setExtractedTimerForStep(null);
        try {
          const timer = await analyzeInstructionForTimer(currentInstructionText);
          setExtractedTimerForStep(timer);
        } catch (error) {
          console.error("Timer analysis failed:", error);
        } finally {
          setIsAnalyzingTimer(false);
        }
      }
    };
    analyze();
    readCurrentStep();
  }, [currentStep, recipe.instructions, readCurrentStep]);

  const handleClose = () => {
    stopSpeech();
    onClose();
  };

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
                        <button 
                            onClick={() => { setTimerData(extractedTimerForStep); setIsTimerOpen(true); }}
                            className="bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-600 transition-transform hover:scale-105"
                        >
                            Időzítő Indítása ({formatTimerButtonText(extractedTimerForStep)})
                        </button>
                    )}
                </div>
                <div className="flex items-center justify-center gap-4">
                    <button onClick={() => setCurrentStep(p => Math.max(0, p - 1))} disabled={currentStep === 0} className="text-lg bg-gray-200 text-gray-800 font-bold py-4 px-8 rounded-lg disabled:opacity-50">Előző</button>
                    <button onClick={isListening ? stopListening : startListening} className={`p-4 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white' : 'bg-primary-600 text-white'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                           <path fillRule="evenodd" d="M7 2a4 4 0 00-4 4v6a4 4 0 108 0V6a4 4 0 00-4-4zM5 6a2 2 0 012-2h2a2 2 0 110 4H7a2 2 0 01-2-2zm10 4a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM4 11a1 1 0 100 2h12a1 1 0 100-2H4z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button onClick={() => setCurrentStep(p => Math.min(totalSteps - 1, p + 1))} disabled={currentStep === totalSteps - 1} className="text-lg bg-gray-200 text-gray-800 font-bold py-4 px-8 rounded-lg disabled:opacity-50">Következő</button>
                </div>
                 <p className="text-center text-gray-500 text-sm">Hangparancsok: "következő", "előző", "ismételd meg", "időzítő indítása"</p>
            </footer>
        </div>
        {isTimerOpen && <KitchenTimer onClose={() => setIsTimerOpen(false)} initialValues={timerData} />}
    </>
  );
};

export default CookingAssistantModal;
