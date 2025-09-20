import React, { useState, useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useNotification } from '../contexts/NotificationContext';

// Helper component for styled time inputs with steppers
const TimeInput: React.FC<{
  value: number;
  setter: React.Dispatch<React.SetStateAction<number>>;
  max: number;
  label: string;
}> = ({ value, setter, max, label }) => {
  const increment = () => setter(prev => (prev < max ? prev + 1 : 0));
  const decrement = () => setter(prev => (prev > 0 ? prev - 1 : max));

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    if (!isNaN(num) && num >= 0 && num <= max) {
      setter(num);
    } else if (e.target.value === '') {
      setter(0);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex flex-col items-center">
        <button
          onClick={increment}
          className="text-gray-500 hover:text-primary-600 transition-colors p-2"
          aria-label={`${label} növelése`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
        </button>
        <input
          type="number"
          value={String(value).padStart(2, '0')}
          onChange={handleValueChange}
          className="w-24 text-center text-4xl font-semibold bg-gray-100 rounded-md py-2 border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label={label}
        />
        <button
          onClick={decrement}
          className="text-gray-500 hover:text-primary-600 transition-colors p-2"
          aria-label={`${label} csökkéntése`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7 7"></path></svg>
        </button>
      </div>
      <span className="text-xs text-gray-500 mt-1 uppercase">{label}</span>
    </div>
  );
};


interface KitchenTimerProps {
  onClose: () => void;
  initialValues?: { hours?: number; minutes?: number; seconds?: number } | null;
}

const KitchenTimer: React.FC<KitchenTimerProps> = ({ onClose, initialValues }) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(10);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(0);
  const [isAlarming, setIsAlarming] = useState(false);
  
  const { showNotification } = useNotification();
  const audioContextRef = useRef<AudioContext | null>(null);
  // FIX: In browser environments, setInterval returns a number, not a NodeJS.Timeout.
  const alarmIntervalRef = useRef<number | null>(null);
  
  // Web Audio API implementation for reliable sound
  const playAlarm = () => {
    if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            audioContextRef.current = new AudioContext();
        } else {
            console.error('Web Audio API is not supported in this browser.');
            return;
        }
    }
    const context = audioContextRef.current;
    if (context.state === 'suspended') {
        context.resume();
    }
    
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime); // High A note
    
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.05); // Quick fade-in
    gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.5); // Fade-out

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.5);
  };

  const handleVoiceCommand = (transcript: string) => {
    const command = transcript.toLowerCase().trim();
    if (isAlarming && (command.includes('stop') || command.includes('állj'))) {
      showNotification('Riasztás leállítva hangparanccsal.', 'success');
      stopAlarm();
      reset();
    }
  };

  const { isListening, startListening, stopListening, permissionState } = useSpeechRecognition({
    onResult: handleVoiceCommand,
    continuous: false,
  });

  const calculateTotalSeconds = () => hours * 3600 + minutes * 60 + seconds;

  useEffect(() => {
    if (initialValues) {
      const h = initialValues.hours || 0;
      const m = initialValues.minutes || 0;
      const s = initialValues.seconds || 0;
      setHours(h);
      setMinutes(m);
      setSeconds(s);
      const total = h * 3600 + m * 60 + s;
      setTime(total);
      if (total > 0) {
        setIsActive(true);
      }
    } else {
      setTime(calculateTotalSeconds());
    }
  }, [initialValues]);

  const stopAlarm = () => {
    if (alarmIntervalRef.current) {
        // FIX: Use window.clearInterval to ensure the browser's implementation is used, which expects a number.
        window.clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().then(() => {
            audioContextRef.current = null;
        });
    }
    setIsAlarming(false);
    stopListening();
  };
  
  useEffect(() => {
    // FIX: In browser environments, setInterval returns a number, not a NodeJS.Timeout.
    let interval: number | null = null;
    if (isActive && time > 0) {
      // FIX: Use window.setInterval to ensure the browser's implementation is used, which returns a number.
      interval = window.setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (time <= 0 && isActive) {
      setIsActive(false);
      setIsAlarming(true);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isActive, time]);
  
  useEffect(() => {
    if (isAlarming) {
        playAlarm(); // Play once immediately
        // FIX: Use window.setInterval to ensure the browser's implementation is used, which returns a number.
        alarmIntervalRef.current = window.setInterval(playAlarm, 1200);
    } else {
        stopAlarm();
    }

    return () => {
        if (alarmIntervalRef.current) {
            window.clearInterval(alarmIntervalRef.current);
        }
    };
  }, [isAlarming]);
  
  // This is a separate effect to avoid re-triggering the alarm sound on every permission/listening change
  useEffect(() => {
    if (isAlarming && permissionState === 'granted' && !isListening) {
      startListening();
    } else if (!isAlarming && isListening) {
      stopListening();
    }
  }, [isAlarming, isListening, permissionState, startListening, stopListening]);

  const toggle = () => {
    if (isAlarming) {
        stopAlarm();
        reset();
        return;
    }
    if (isActive) {
      setIsActive(false);
    } else {
      const total = calculateTotalSeconds();
      setTime(total);
      if (total > 0) {
        setIsActive(true);
      }
    }
  };

  const reset = () => {
    stopAlarm();
    setIsActive(false);
    setHours(0);
    setMinutes(10);
    setSeconds(0);
    setTime(600);
  };

  const handleClose = () => {
    stopAlarm();
    onClose();
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="timer-title">
      <div className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-md">
        <h2 id="timer-title" className="text-2xl font-bold text-primary-800 mb-4 text-center">Konyhai Időzítő</h2>
        
        {isActive || isAlarming ? (
            <div className={`text-6xl font-mono text-center my-6 p-4 rounded-lg text-gray-800 transition-colors duration-300 ${isAlarming ? 'animate-pulse-red' : 'bg-gray-100'}`}>
                {formatTime(time)}
            </div>
        ) : (
           <div className="flex justify-center items-start gap-3 my-6">
              <TimeInput value={hours} setter={setHours} max={99} label="Óra" />
              <span className="text-4xl font-semibold mt-12">:</span>
              <TimeInput value={minutes} setter={setMinutes} max={59} label="Perc" />
              <span className="text-4xl font-semibold mt-12">:</span>
              <TimeInput value={seconds} setter={setSeconds} max={59} label="Másodperc" />
          </div>
        )}

        <div className="flex justify-center gap-3">
          <button onClick={toggle} className={`font-bold py-3 px-6 rounded-lg shadow-md transition-colors w-48 ${isAlarming ? 'bg-red-600 hover:bg-red-700 text-white' : (isActive ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white')}`}>
            {isAlarming ? 'Riasztás leállítása' : (isActive ? 'Szünet' : 'Indítás')}
          </button>
          <button onClick={reset} disabled={isActive} className="bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Alaphelyzet
          </button>
        </div>
        <div className="text-center mt-3 text-sm h-5">
            {isAlarming && permissionState === 'granted' && (
            <p className="text-gray-600 animate-fade-in">
                Mondja: <strong className="text-primary-700">„Stop”</strong> vagy <strong className="text-primary-700">„Állj”</strong> a leállításhoz.
            </p>
            )}
            {isAlarming && permissionState === 'denied' && (
            <p className="text-red-600 font-semibold animate-fade-in">A hangvezérléses leállításhoz engedélyezze a mikrofont.</p>
            )}
        </div>
        <button onClick={handleClose} className="w-full mt-2 bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
          Bezárás
        </button>
      </div>
    </div>
  );
};

export default KitchenTimer;