import React, { useEffect, useRef, useState } from 'react';
import { InstructionStep } from '../types';

interface CookingModeViewProps {
  isOpen: boolean;
  onClose: () => void;
  instructions: InstructionStep[];
  currentStep: number;
  onStepChange: (newStep: number) => void;
  recipeName: string;
  forceSpeakTrigger: number;
}

const CookingModeView: React.FC<CookingModeViewProps> = ({
  isOpen,
  onClose,
  instructions,
  currentStep,
  onStepChange,
  recipeName,
  forceSpeakTrigger,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const currentInstruction = instructions[currentStep];

  const [words, setWords] = useState<string[]>([]);
  const [wordBoundaries, setWordBoundaries] = useState<number[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Speech synthesis effect with highlighting
  useEffect(() => {
    if (!isOpen || !currentInstruction?.text) {
      return;
    }

    window.speechSynthesis.cancel();
    setCurrentWordIndex(-1);

    const textToSpeak = `${currentStep + 1}. lépés: ${currentInstruction.text}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'hu-HU';
    utterance.rate = 0.9;
    
    // Process words and boundaries for highlighting
    const processedWords: string[] = [];
    const boundaries: number[] = [];
    let currentIndex = 0;
    // Split by spaces, but keep the spaces to reconstruct the text perfectly
    textToSpeak.split(/(\s+)/).forEach(part => {
        if (part.trim().length > 0) { // It's a word
            boundaries.push(currentIndex);
        }
        processedWords.push(part);
        currentIndex += part.length;
    });

    setWords(processedWords);
    setWordBoundaries(boundaries);
    wordRefs.current = new Array(processedWords.length).fill(null);

    utterance.onboundary = (event) => {
        const charIndex = event.charIndex;
        let boundaryIndex = -1;

        // Find which word boundary the speech has passed
        for (let i = boundaries.length - 1; i >= 0; i--) {
            if (charIndex >= boundaries[i]) {
                boundaryIndex = i;
                break;
            }
        }
        
        // Map the boundary index back to the full 'words' array index
        let wordArrayIndex = 0;
        let boundaryCounter = 0;
        for(let i = 0; i < processedWords.length; i++) {
            if (processedWords[i].trim().length > 0) {
                if(boundaryCounter === boundaryIndex) {
                    wordArrayIndex = i;
                    break;
                }
                boundaryCounter++;
            }
        }
        
        if (boundaryIndex !== -1) {
            setCurrentWordIndex(wordArrayIndex);
        }
    };

    utterance.onend = () => {
      setCurrentWordIndex(-1);
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isOpen, currentStep, forceSpeakTrigger]);

  // Auto-scrolling effect for the highlighted word
  useEffect(() => {
    if (currentWordIndex !== -1) {
      const currentWordElement = wordRefs.current[currentWordIndex];
      currentWordElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }, [currentWordIndex]);

  // Keyboard and focus management effect
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

        <main className="flex-grow flex flex-col items-center justify-start pt-6 overflow-y-auto text-center">
          <p className="text-3xl md:text-5xl lg:text-6xl font-serif text-gray-800 leading-tight">
             {words.length > 0
                ? words.map((word, index) => (
                    <span 
                        key={index}
                        ref={el => { if (wordRefs.current) wordRefs.current[index] = el; }}
                        className={`transition-colors duration-200 ${index === currentWordIndex ? 'bg-yellow-200 rounded' : ''}`}
                    >
                        {word}
                    </span>
                ))
                : currentInstruction?.text
            }
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