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
  const alarmSound = 'data:audio/mpeg;base64,SUQzBAAAAAAAIVRYbEn/9VMgAABaR1NULwAAAEdJTkcAAAPoAAABAERJU1QvAAAAQ09NTQAAABFTb25nIG1hZGUgd2l0aCBhdWRpb2pvaW4uY29tAAAAVVJMIAAAAFhodHRwczovL2F1ZGlvam9pbi5jb20vZG93bmxvYWQtbXAzLXNvdW5kLWVmZmVjdC9zb25hci1waW5nLXNvdW5kLWVmZmVjdC1tcDMtMTE1MzA0LmF1ZGlvL2Rvd25sb2FkP3R5cGU9bXAzJmlkPTExNTMwNAAAAExaQU1FAAACVgAAADw/Vz8/Pz9XPz9XP1c/Vz9XSAAAVz9XPz9XPz9XP1c/Vz9XPz9XPz9XPz9XPz9XPz9XPz9XAAARPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9XPz9//uQwgAAAAAD/9VMgQAWVoAAAAAn/9VMgQAWVn+/gAAAAn/9VMgQAWVv/9/gAAACb/9VMgQAWVwAFAAAAAn/9VMgQAWVx/+AAAAAn/9VMgQAWVyAABQAAACb/9VMgQAWVz//gAAAAJv/9VMgQAWV0AAPAAAACf/9VMgQAWV1AADgAAACb/9VMgQAWV1AGAgAAACf/9VMgQAWV1wDAgAAACb/9VMgQAQVkBADAAAACb/9VMgQAWV2AADgAAACf/9VMgQAWV2QGBgAAACb/9VMgQAWV2gGBgAAACf/9VMgQAWV3AIBgAAACb/9VMgQAWV3gMAgAAACf/9VMgQAWV3wDBIAACb/9VMgQAWV4AFBgAAACf/9VMgQAWV4gHBgAAACb/9VMgQAWV4wJBwAAACf/9VMgQAWV5AFBwAAACb/9VMgQAWV5gKBwAAACf/9VMgQAWV5wLBwAAACb/9VMgQAWV6AMDQAAACf/9VMgQAWV6QLCQAAACb/9VMgQAWV6gMAwAAACf/9VMgQAWV6wLCQAAACb/9VMgQAWV7ALCwAAACf/9VMgQAWV7gLCwAAACb/9VMgQAWV7wMDQAAACf/9VMgQAWV8AMDQAAACb/9VMgQAWV8QLDQAAACf/9VMgQAWV8gLDQAAACb/9VMgQAWV8wLDQAAACf/9VMgQAWV9ANDQAAACb/9VMgQAWV9QNDQAAACf/9VMgQAWV9gNDQAAACb/9VMgQAWV9wNDQAAACf/9VMgQAWV+ANDQAAACb/9VMgQAWV+QNDgAAACf/9VMgQAWV+gNDgAAACb/9VMgQAWV+wNDgAAACf/9VMgQAWV/ANDgAAACb/9VMgQAWV/QNDgAAACf/9VMgQAWV/gNDgAAACb/9VMgQAWV/wNDgAAACf/9VMgQAWWAANDgAAACb/9VMgQAWWAQNDgAAACf/9VMgQAWWAUNDgAAACb/9VMgQAWWAQFAAAAACf/9VMgQAWWAUFBQAAACb/9VMgQAWWAUHBgAAACf/9VMgQAWWAcHBgAAACb/9VMgQAWWAoFBQAAACf/9VMgQAWWAsFBQAAACb/9VMgQAWWAsHBgAAACf/9VMgQAWWAMHBgAAACb/9VMgQAWWAwFBQAAACf/9VMgQAWWAwHBgAAACb/9VMgQAWWAwKBwAAACf/9VMgQAWWAwMBwAAACb/9VMgQAWWAwQBQAAACf/9VMgQAWWAwQBgAAACb/9VMgQAWWAwQBgQAAACf/9VMgQAWWAwQBggAAACb/9VMgQAWWAwQCgQAAACf/9VMgQAWWAwQDAgAAACb/9VMgQAWWAwQDggAAACf/9VMgQAWWAwQFAgAAACb/9VMgQAWWAwQFAgAAACf/9VMgQAWWAwQFQgAAACb/9VMgQAWWAwQGggAAACb/9VMgQAWWAwQGggAAACb/9VMgQAWWAwQGQgAAACf/9VMgQAWWAwQGwgAAACb/9VMgQAWWAwQHAgAAACb/9VMgQAWWAwQHggAAACb/9VMgQAWWAwQIQgAAACf/9VMgQAWWAwQIggAAACb/9VMgQAWWAwQJAgAAACf/9VMgQAWWAwQJggAAACb/9VMgQAWWAwQKAgAAACf/9VMgQAWWAwQMQgAAACb/9VMgQAWWAwQNAgAAACf/9VMgQAWWAwQNggAAACb/9VMgQAWWAwQNwgAAACf/9VMgQAWWAwQOAgAAACb/9VMgQAWWAwQOggAAACf/9VMgQAWWAwQOwgAAACb/9VMgQAWWAwQPQgAAACf/9VMgQAWWAwQRAgAAACb/9VMgQAWWAwQRYgAAACf/9VMgQAWWAwQRwgAAACb/9VMgQAWWAwQSggAAACf/9VMgQAWWAwQSwgAAACb/9VMgQAWWAwQTQgAAACf/9VMgQAWWAwQUwgAAACb/9VMgQAWWAwQVAgAAACf/9VMgQAWWAwQVQgAAACb/9VMgQAWWAwQVggAAACf/9VMgQAWWAwQVwgAAACb/9VMgQAWWAwQWAgAAACf/9VMgQAWWAwQWggAAACb/9VMgQAWWAwQWQgAAACf/9VMgQAWWAwQWwgAAACb/9VMgQAWWAwQXAgAAACf/9VMgQAWWAwQYQgAAACb/9VMgQAWWAwQYwgAAACf/9VMgQAWWAwQaQgAAACb/9VMgQAWWAwQbAgAAACf/9VMgQAWWAwQbQgAAACb/9VMgQAWWAwQbggAAACf/9VMgQAWWAwQcAgAAACb/9VMgQAWWAwQcggAAACf/9VMgQAWWAwQcwgAAACb/9VMgQAWWAwQdAgAAACf/9VMgQAWWAwQdQgAAACb/9VMgQAWWAwQdwgAAACf/9VMgQAWWAwQeAgAAACb/9VMgQAWWAwQeQgAAACf/9VMgQAWWAwQewgAAACb/9VMgQAWWAwQfggAAACb/9VMgQAWWAwQfwgAAACf/9VMgQAWWAwQf4gAAACb/9VMgQAWWAwQgAgAAACf/9VMgQAWWAwQgwgAAACb/9VMgQAWWAwQhAgAAACf/9VMgQAWWAwQhQgAAACb/9VMgQAWWAwQhwgAAACf/9VMgQAWWAwQiAgAAACb/9VMgQAWWAwQjAgAAACf/9VMgQAWWAwQjQgAAACb/9VMgQAWWAwQjwgAAACf/9VMgQAWWAwQkggAAACb/9VMgQAWWAwQlQgAAACf/9VMgQAWWAwQlwgAAACb/9VMgQAWWAwQmAgAAACf/9VMgQAWWAwQnAgAAACb/9VMgQAWWAwQnwgAAACf/9VMgQAWWAwQoQgAAACb/9VMgQAWWAwQoAgAAACf/9VMgQAWWAwQpAgAAACb/9VMgQAWWAwQpggAAACf/9VMgQAWWAwQqQgAAACb/9VMgQAWWAwQqwAAAP//3TEIAAAAAA==';

  const initialValuesProcessed = useRef(false);

  useEffect(() => {
    if (initialValues && !initialValuesProcessed.current) {
      initialValuesProcessed.current = true;
      const h = initialValues.hours || 0;
      const m = initialValues.minutes || 0;
      const s = initialValues.seconds || 0;
      
      setHours(h);
      setMinutes(m);
      setSeconds(s);

      const totalSeconds = h * 3600 + m * 60 + s;
      if (totalSeconds > 0) {
        setTime(totalSeconds);
        setIsActive(true);
      }
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
      alarmAudioRef.current?.play();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, time]);

  const handleStart = () => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    if (totalSeconds > 0) {
      setTime(totalSeconds);
      setIsActive(true);
    }
  };

  const handlePause = () => setIsActive(!isActive);

  const handleReset = () => {
    setIsActive(false);
    setTime(0);
    setHours(0);
    setMinutes(10);
    setSeconds(0);
  };
  
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleTimeChange = (setter: React.Dispatch<React.SetStateAction<number>>, value: string, max: number) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0 && num <= max) {
      setter(num);
    } else if (value === '') {
      setter(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="timer-title">
      <div className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm text-center">
        <h2 id="timer-title" className="text-2xl font-bold text-primary-800 mb-4">Konyhai időzítő</h2>

        {isActive || time > 0 ? (
          <div className="my-4">
            <p className="text-6xl font-mono font-bold text-gray-800 tracking-wider">{formatTime(time)}</p>
          </div>
        ) : (
          <div className="flex justify-center items-center gap-2 my-6">
            <input type="number" value={String(hours).padStart(2, '0')} onChange={(e) => handleTimeChange(setHours, e.target.value, 23)} className="w-20 p-2 text-center text-3xl font-mono bg-gray-100 rounded-lg" aria-label="Óra" />
            <span className="text-3xl font-bold text-gray-400">:</span>
            <input type="number" value={String(minutes).padStart(2, '0')} onChange={(e) => handleTimeChange(setMinutes, e.target.value, 59)} className="w-20 p-2 text-center text-3xl font-mono bg-gray-100 rounded-lg" aria-label="Perc" />
            <span className="text-3xl font-bold text-gray-400">:</span>
            <input type="number" value={String(seconds).padStart(2, '0')} onChange={(e) => handleTimeChange(setSeconds, e.target.value, 59)} className="w-20 p-2 text-center text-3xl font-mono bg-gray-100 rounded-lg" aria-label="Másodperc" />
          </div>
        )}
        
        <div className="flex justify-center gap-3">
          {!isActive && time === 0 ? (
            <button onClick={handleStart} className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-all duration-200">
              Indítás
            </button>
          ) : (
             <>
                <button onClick={handlePause} className="w-1/2 bg-yellow-500 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-yellow-600 transition-all duration-200">
                  {isActive ? 'Szünet' : 'Folytatás'}
                </button>
                <button onClick={handleReset} className="w-1/2 bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-400 transition-all duration-200">
                  Leállítás
                </button>
            </>
          )}
        </div>
        
        <button onClick={onClose} className="mt-4 w-full text-primary-600 font-semibold py-2 px-4 rounded-lg hover:bg-primary-100 transition-colors">
          Bezárás
        </button>
      </div>
      <audio ref={alarmAudioRef} src={alarmSound} preload="auto" />
    </div>
  );
};

export default KitchenTimer;