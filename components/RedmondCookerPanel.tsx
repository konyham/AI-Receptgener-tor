import React, { useState, useEffect, useRef } from 'react';

// Define program types and their settings
type Program = {
  name: string;
  defaultTime: number; // in minutes
  defaultTemp: number; // in Celsius
  tempAdjustable: boolean;
};

const PROGRAMS: Record<string, Program> = {
  'MULTICOOK': { name: 'MULTICOOK', defaultTime: 40, defaultTemp: 100, tempAdjustable: true },
  'PILAF': { name: 'PILAF', defaultTime: 60, defaultTemp: 120, tempAdjustable: false },
  'STEAM': { name: 'STEAM/DESSERT', defaultTime: 40, defaultTemp: 100, tempAdjustable: false },
  'SOUP': { name: 'SOUP/BOIL', defaultTime: 60, defaultTemp: 100, tempAdjustable: false },
  'OATMEAL': { name: 'OATMEAL/GRAIN', defaultTime: 30, defaultTemp: 100, tempAdjustable: false },
  'STEW': { name: 'STEW/CHILI', defaultTime: 120, defaultTemp: 95, tempAdjustable: false },
  'FRY': { name: 'FRY/DEEP FRY', defaultTime: 15, defaultTemp: 160, tempAdjustable: true },
  'BAKE': { name: 'BAKE/BREAD', defaultTime: 50, defaultTemp: 140, tempAdjustable: false },
};

type Mode = 'idle' | 'time' | 'temp';

const RedmondCookerPanel: React.FC = () => {
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [time, setTime] = useState(0); // in minutes
  const [temperature, setTemperature] = useState(0); // in Celsius
  const [mode, setMode] = useState<Mode>('idle');
  const [isCooking, setIsCooking] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0); // in seconds
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isCooking && remainingTime > 0) {
      timerRef.current = window.setInterval(() => {
        setRemainingTime(prev => prev - 1);
      }, 1000);
    } else if (remainingTime <= 0 && isCooking) {
      setIsCooking(false);
      // Optional: Add an "End" signal or sound
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCooking, remainingTime]);

  const handleProgramSelect = (programKey: string) => {
    if (isCooking) return;
    const program = PROGRAMS[programKey];
    setSelectedProgram(program);
    setTime(program.defaultTime);
    setTemperature(program.defaultTemp);
    setMode('idle');
  };

  const handleStartStop = () => {
    if (isCooking) {
      setIsCooking(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (selectedProgram) {
      setRemainingTime(time * 60);
      setIsCooking(true);
    }
  };

  const handleCancel = () => {
    setIsCooking(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedProgram(null);
    setTime(0);
    setTemperature(0);
    setRemainingTime(0);
    setMode('idle');
  };

  const handleModeChange = (newMode: Mode) => {
    if (isCooking) return;
    // Allow temp setting only if program allows it
    if (newMode === 'temp' && selectedProgram && !selectedProgram.tempAdjustable) {
      return;
    }
    setMode(prevMode => (prevMode === newMode ? 'idle' : newMode));
  };

  const adjustValue = (amount: number) => {
    if (isCooking) return;
    if (mode === 'time') {
      setTime(prev => Math.max(5, Math.min(prev + amount, 720))); // 5 mins to 12 hours
    } else if (mode === 'temp' && selectedProgram?.tempAdjustable) {
      setTemperature(prev => Math.max(35, Math.min(prev + amount, 180))); // 35°C to 180°C
    }
  };

  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatDisplayTime = (totalMinutes: number) => {
     const hours = Math.floor(totalMinutes / 60);
     const minutes = totalMinutes % 60;
     return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  
  const ProgramButton: React.FC<{programKey: string, label: string}> = ({programKey, label}) => (
    <button
      onClick={() => handleProgramSelect(programKey)}
      disabled={isCooking}
      className={`relative w-full text-left p-2 text-xs font-semibold rounded transition-colors ${selectedProgram?.name === PROGRAMS[programKey].name ? 'bg-orange-500 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'} disabled:opacity-50`}
    >
      <span className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-red-600" />
      <span className="ml-4">{label}</span>
    </button>
  );

  return (
    <div className="my-8 p-4 bg-gray-800 rounded-lg border-4 border-gray-900 shadow-xl font-sans">
      <h3 className="text-center font-bold text-lg text-gray-200 mb-4">REDMOND RMC-M70 Vezérlőpult (Szimuláció)</h3>
      <div className="grid grid-cols-3 gap-4">
        {/* Program Buttons */}
        <div className="col-span-1 space-y-2">
           <ProgramButton programKey="MULTICOOK" label="MULTICOOK" />
           <ProgramButton programKey="PILAF" label="PILAF" />
           <ProgramButton programKey="STEAM" label="STEAM/DESSERT" />
           <ProgramButton programKey="SOUP" label="SOUP/BOIL" />
           <ProgramButton programKey="OATMEAL" label="OATMEAL/GRAIN" />
           <ProgramButton programKey="STEW" label="STEW/CHILI" />
           <ProgramButton programKey="FRY" label="FRY/DEEP FRY" />
           <ProgramButton programKey="BAKE" label="BAKE/BREAD" />
        </div>

        {/* Display and Controls */}
        <div className="col-span-2 flex flex-col justify-between bg-black p-4 rounded-md border-2 border-gray-700">
          {/* LCD Display */}
          <div className="bg-gray-900 text-orange-400 font-mono p-4 rounded text-center border border-gray-700">
            <div className="text-sm text-gray-400">PROGRAM</div>
            <div className="text-lg font-bold mb-2 h-6">{selectedProgram?.name || '--'}</div>
            <div className="flex justify-around">
              <div>
                <div className="text-sm text-gray-400">TIME</div>
                <div className={`text-2xl font-bold transition-colors ${mode === 'time' && !isCooking ? 'text-white animate-pulse' : ''}`}>
                  {isCooking ? formatTime(remainingTime) : formatDisplayTime(time)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">TEMP °C</div>
                <div className={`text-2xl font-bold transition-colors ${mode === 'temp' && !isCooking ? 'text-white animate-pulse' : ''}`}>
                  {temperature > 0 ? temperature : '--'}
                </div>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4">
             <button onClick={handleStartStop} disabled={!selectedProgram} className={`font-bold p-3 rounded transition-colors ${isCooking ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-green-700 hover:bg-green-600 text-white'} disabled:bg-gray-600 disabled:cursor-not-allowed`}>
              {isCooking ? 'STOP' : 'START'}
            </button>
            <button onClick={handleCancel} className="bg-red-800 text-white font-bold p-3 rounded hover:bg-red-700 transition-colors">
              CANCEL
            </button>
            <button onClick={() => handleModeChange('time')} disabled={isCooking || !selectedProgram} className={`p-2 rounded transition-colors ${mode === 'time' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'} disabled:bg-gray-600`}>
              TIME
            </button>
             <button onClick={() => handleModeChange('temp')} disabled={isCooking || !selectedProgram || !selectedProgram.tempAdjustable} className={`p-2 rounded transition-colors ${mode === 'temp' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'} disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed`}>
              TEMP
            </button>
          </div>

          {/* Adjuster */}
          <div className="flex justify-center items-center gap-4 mt-4">
            <button onClick={() => adjustValue(-5)} disabled={isCooking || mode === 'idle'} className="bg-gray-700 text-white font-bold text-2xl rounded-full h-12 w-12 flex items-center justify-center hover:bg-gray-600 disabled:opacity-50">-</button>
            <button onClick={() => adjustValue(5)} disabled={isCooking || mode === 'idle'} className="bg-gray-700 text-white font-bold text-2xl rounded-full h-12 w-12 flex items-center justify-center hover:bg-gray-600 disabled:opacity-50">+</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedmondCookerPanel;
