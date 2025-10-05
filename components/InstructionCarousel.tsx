import React from 'react';
import { InstructionStep } from '../types';

interface InstructionCarouselProps {
  instructions: InstructionStep[];
  currentStep: number;
  onStepChange: (newStep: number) => void;
  voiceModeActive: boolean;
  onGenerateImage: (stepIndex: number) => void;
  generatingImageForStep: number | null;
}

const InstructionCarousel: React.FC<InstructionCarouselProps> = ({ instructions, currentStep, onStepChange, voiceModeActive, onGenerateImage, generatingImageForStep }) => {
  const totalSteps = instructions.length;
  const currentInstruction = instructions[currentStep];

  const goToNext = () => {
    if (currentStep < totalSteps - 1) {
      onStepChange(currentStep + 1);
    }
  };

  const goToPrevious = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };
  
  // Handling keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      goToNext();
    } else if (e.key === 'ArrowLeft') {
      goToPrevious();
    }
  };

  return (
    <div 
        className={`p-4 rounded-lg border transition-all duration-300 ${voiceModeActive ? 'border-primary-400 ring-2 ring-primary-200 shadow-lg' : 'border-gray-200'} bg-primary-50`}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Recept elkészítési lépések"
    >
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-lg text-primary-700">
          {currentStep + 1}. Lépés <span className="text-gray-500 font-normal">/ {totalSteps}</span>
        </h4>
        <div className="flex gap-2">
          <button
            onClick={goToPrevious}
            disabled={currentStep === 0}
            className="bg-white p-2 rounded-full shadow-sm border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Előző lépés"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            disabled={currentStep === totalSteps - 1}
            className="bg-white p-2 rounded-full shadow-sm border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Következő lépés"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="relative min-h-[150px] text-gray-800 flex flex-col items-center justify-center p-4 bg-white rounded-md shadow-inner overflow-hidden">
        {/* Using a key on the paragraph will trigger a re-render with a fade animation on step change */}
        <p key={currentStep} className="text-center animate-fade-in text-lg mb-4">
          {currentInstruction.text}
        </p>

        <div className="w-full max-w-sm aspect-[4/3] rounded-md bg-gray-100 flex items-center justify-center overflow-hidden border">
            {generatingImageForStep === currentStep ? (
                <div className="flex flex-col items-center text-gray-500 p-4">
                    <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span className="mt-2 text-sm font-medium">Kép generálása...</span>
                </div>
            ) : currentInstruction.imageUrl ? (
                <img src={currentInstruction.imageUrl} alt={`Illusztráció a(z) ${currentStep + 1}. lépéshez`} className="w-full h-full object-cover"/>
            ) : (
                <button 
                    onClick={() => onGenerateImage(currentStep)}
                    disabled={generatingImageForStep !== null}
                    className="flex flex-col items-center gap-2 text-gray-600 hover:text-primary-700 transition-colors p-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                    <span className="text-sm font-semibold text-center">Kép generálása ehhez a lépéshez</span>
                </button>
            )}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-4" aria-label="Lépések állapota">
        {instructions.map((_, index) => (
          <button
            key={index}
            onClick={() => onStepChange(index)}
            className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
              index === currentStep ? 'w-6 bg-primary-500' : 'w-2 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`${index + 1}. lépés`}
            aria-current={index === currentStep}
          ></button>
        ))}
      </div>
    </div>
  );
};

export default InstructionCarousel;