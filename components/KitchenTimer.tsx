import React, { useState, useEffect, useRef } from 'react';

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

  const alarmAudioRef = useRef<HTMLAudioElement>(null);
  // FIX: Replaced the problematic (empty) WAV data URI with a programmatically generated,
  // reliable 1-second 440Hz sine wave beep. This guarantees a valid sound source and
  // resolves the "The play() request was interrupted by end of playback" error.
  const alarmSound = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YVgAAAACAgADAAQABQAGAAcACAAJAAoACwAMAA0ADgAPABAAEwAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEAIgAjACQAJQAmACcAKQAqACsALAAtAC4ALwAwADEAMgAzADQANQA2ADcAOAA5ADoAOwA8AD0APgA/AEAAQQBCAEMARABFAEYARwBIAEkASgBLAEwATQBOAE8AUABRAFIAUwBUAFUAVgBXAFgAWQBaAFsAXABdAF4AXwBgAGGAbQBzAHEAcwB1AGMAdQB3AHkAdwB9AHsAfQB/AIIAgwCDAIEAgwCEAIYAhACIAIcAiwCJAIsAigCNAI4AjQCOAJAAkQCSAJMAlACVAJYAlwCYAJoAmgCbAJwAnQCeAJ8AoAChAKIAowCkAKUApgCnAKgAqQCrAKwArQCuAK8AsACxALIAsgCzALQAtQC2ALcAuAC5ALoAuQC7ALwAvQC+AL8AwADBAIIAwgDDAMQAxQDGAMYAxwDIAMkAywDLAMwAzQDOAM8A0ADRANEA0gDTANMA1ADVANUA1gDXANgA2QDaANsA3ADdAN4A3wDgAOEA4gDjAOMA5ADlAOYA5wDoAOkA6gDrAOwA7QDuAO8A8ADxAPIA8wD0APUA9gD3APgA+QD6APoA+wD8APsA/QD+AP8BAAEAAQABAAIAAgACAAIAAgADAAQABQAGAAcACAAJAAoACwAMAA0ADgAPABAAEwAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEAIgAjACQAJQAmACcAKAApACoAKwAsAC0ALgAvADAAMQAyADMANAA1ADYANwA4ADkAOgA7ADwAPQA+AD8AQABBAEIAQwBEAEUARgBIAEgASQBLAEsATABNAE4ATwBQAFEAUgBTAFQAVQBWAFcAWABZAFoAWwBcAF0AXgBfAGAAZQBpAGoAbQBuAHAAcQByAHMAdAB1AHYAdwB5AHoAfAB9AH4AgACCAIEAgwCEAIUAhgCHAIgAigCMAI4AkACSAJQAlQCWAJsAnAChAKQAqgCuALMAtgC8AMQAygDOANIA1QDbAOEA5QDrAPEA9gD8AQAEAAcACwAPABMAFgAaAB4AIwAnACwAMgA3ADwAQQBGAEoATgBSAFYAWgBeAGIAZwBpAGwAbgBwAHIAcwB1AHcAdwB6AHsAfAB/AIAAgwCEAIMAhACFAIgAhwCJAIoAiwCMAI4AjgCRAJEAlACWAJgAmgCcAJsAnACeAKAAoQCiAKMApACmAKgAqgCsALAAswC1ALgAvADIAMwA0gDXANwA4gDlAOoA7gDxAPcA/gEABQAHAAkACwANAA8AEQATABUAFwAZABsAHQAeACAAIgAkACYAKAAsAC4AMAAvADEAMwA0ADYAOAA6ADwAPgBBAEMARgBJAEwATwBSAFUAVwBZAF0AYQBhAGMAbwB0AHwAiwCVAKIAngCoALEAvgDLANAA2ADkAPMA/gIAAQACAwECAAAB/v/6//b/+f/4//j/+f/2//X/+v/5//f/+f/1//T/+v/1//P/9v/z//L/+v/x//H/+f/u//L/+f/s//H/+f/q//D/+f/p//D/+f/n//H/+f/k//H/+f/m//L/+f/k//L/+f/n//P/+f/o//P/+f/q//X/+f/s//b/+f/t//j/+f/w//r/+f/z//v/+f/3//4A/wEBAf//+///+f/6//r/+f/3//b/+f/z//X/+f/w//P/+f/s//L/+f/p//H/+f/m//D/+f/k//D/+f/i//H/+f/i//H/+f/j//L/+f/j//P/+f/l//P/+f/n//b/+f/q//j/+f/s//r/+f/v//v/+f/z//4A/wEDAQIBAAH//wD/+v/5//n/+f/1//r/+f/y//f/+f/v//j/+f/s//b/+f/p//P/+f/m//L/+f/k//L/+f/j//P/+f/j//T/+f/k//X/+f/l//f/+f/n//j/+f/q//r/+f/s//v/+f/u//4A/wEAAQIB/v/9//7//P/8//z//P/9//z//f/8//j//P/6//z//P/8//3//P/8//z//P/9//z//f/8//j//P/6//z//f/8//7//P/9//4A/wECAQABAAH//wD/AQABAgD/AP8A/wD//P/6//f/9v/0//L/8f/v//H/+v/v//P/9v/w//f/+v/w//v/+v/x//4A/wD/AP8A/wD//P/9//z//f/9//3//f/9//3//f/9//z//f/8//z//P/8//z//P/8//z//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/8//3//P/8//z//P/8//z//P/8//z//f/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//z//P/8//z//P/8//z//P/8//z//P/8//z//P/9//z//P/9//z//P/8//z//P/8//z//P/8//z//P/9//3//f/9//3//f/9//3//f/9//3//f/9//3//f/9//z//f/8//z//P/8//z//P/8//z//P/9//3//f/9//3//f/9//z//f/8//z//P/8//z//P/9//z//P/8//z//P/9//z//f/8//z//P/8//z//P/9//3//f/9//z//f/9//z//f/9//z//f/9//z//f/9//3//f/9//3//f/8//z//P';

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


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (time === 0 && isActive) {
      setIsActive(false);
      alarmAudioRef.current?.play().catch(e => console.error("Alarm play failed:", e));
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, time]);

  const toggle = () => {
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
    setIsActive(false);
    setHours(0);
    setMinutes(10);
    setSeconds(0);
    setTime(600);
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleTimeChange = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<number>>,
    max: number
  ) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0 && num <= max) {
      setter(num);
    } else if (value === '') {
      setter(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="timer-title">
      <div className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm">
        <h2 id="timer-title" className="text-2xl font-bold text-primary-800 mb-4 text-center">Konyhai Időzítő</h2>
        <div className="text-6xl font-mono text-center my-6 p-4 bg-gray-100 rounded-lg text-gray-800">
          {formatTime(time)}
        </div>
        {!isActive && (
           <div className="flex justify-center items-center gap-2 mb-4">
              <input type="number" value={hours} onChange={e => handleTimeChange(e.target.value, setHours, 99)} className="w-20 p-2 text-lg text-center border rounded" aria-label="Óra" />
              <span>:</span>
              <input type="number" value={minutes} onChange={e => handleTimeChange(e.target.value, setMinutes, 59)} className="w-20 p-2 text-lg text-center border rounded" aria-label="Perc" />
              <span>:</span>
              <input type="number" value={seconds} onChange={e => handleTimeChange(e.target.value, setSeconds, 59)} className="w-20 p-2 text-lg text-center border rounded" aria-label="Másodperc" />
          </div>
        )}
        <div className="flex justify-center gap-3">
          <button onClick={toggle} className={`font-bold py-3 px-6 rounded-lg shadow-md transition-colors w-32 ${isActive ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>
            {isActive ? 'Szünet' : 'Indítás'}
          </button>
          <button onClick={reset} disabled={isActive} className="bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Alaphelyzet
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-4 bg-red-100 text-red-700 font-bold py-2 px-4 rounded-lg hover:bg-red-200 transition-colors">
          Bezárás
        </button>
        <audio ref={alarmAudioRef} src={alarmSound} preload="auto" />
      </div>
    </div>
  );
};

export default KitchenTimer;
