import React, { useEffect, useRef } from 'react';
import { InstructionStep } from '../types';

interface CookingModeViewProps {
  isOpen: boolean;
  onClose: () => void;
  instructions: InstructionStep[];
  currentStep: number;
  onStepChange: (newStep: number) => void;
  recipeName: string;
}

const CookingModeView: React.FC<CookingModeViewProps> = ({
  isOpen,
  onClose,
  instructions,
  currentStep,
  onStepChange,
  recipeName,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const currentInstruction = instructions[currentStep];

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight') {
        goToNext();
      } else if (event.key === 'ArrowLeft') {
        goToPrevious();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    modalRef.current?.focus(); // Set focus to the modal for key events

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, currentStep]);

  if (!isOpen) return null;

  const goToNext = () => {
    if (currentStep < instructions.length - 1) {
      onStepChange(currentStep + 1);
    }
  };

  const goToPrevious = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 animate-fade-in p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cooking-mode-title"
      tabIndex={-1}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col p-6">
        <header className="flex-shrink-0 mb-4">
          <h2 id="cooking-mode-title" className="text-2xl font-bold text-primary-800 truncate">{recipeName}</h2>
          <p className="text-lg font-semibold text-gray-600">
            {currentStep + 1}. Lépés / {instructions.length}
          </p>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center overflow-y-auto text-center">
          <p className="text-3xl md:text-5xl lg:text-6xl font-serif text-gray-800 leading-tight">
            {currentInstruction?.text}
          </p>
          {currentInstruction?.imageUrl && (
            <img
              src={currentInstruction.imageUrl}
              alt={`Illusztráció a(z) ${currentStep + 1}. lépéshez`}
              className="mt-6 rounded-lg shadow-md max-w-full max-h-64 object-contain"
            />
          )}
        </main>

        <footer className="flex-shrink-0 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={goToPrevious}
            disabled={currentStep === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Előző
          </button>

          <button onClick={onClose} className="w-full sm:w-auto font-bold py-3 px-6 rounded-lg text-red-600 bg-red-100 hover:bg-red-200 transition-colors">
            Kilépés a Főzés Módból
          </button>

          <button
            onClick={goToNext}
            disabled={currentStep === instructions.length - 1}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Következő
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CookingModeView;
