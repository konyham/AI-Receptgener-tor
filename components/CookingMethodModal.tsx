import React, { useState, useEffect, useRef } from 'react';
import { OptionItem, CookingMethod, TRADITIONAL_COOKING_METHOD } from '../types';

interface CookingMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedMethods: CookingMethod[]) => void;
  options: OptionItem[];
  initialSelection: CookingMethod[];
}

const CookingMethodModal: React.FC<CookingMethodModalProps> = ({
  isOpen,
  onClose,
  onSave,
  options,
  initialSelection,
}) => {
  const [selected, setSelected] = useState<Set<CookingMethod>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(initialSelection));
    }
  }, [isOpen, initialSelection]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleToggle = (methodValue: CookingMethod) => {
    setSelected(prev => {
      const newSelection = new Set(prev);
      const isPresent = newSelection.has(methodValue);

      if (methodValue === TRADITIONAL_COOKING_METHOD) {
        return isPresent ? new Set() : new Set([TRADITIONAL_COOKING_METHOD]);
      }

      if (isPresent) {
        newSelection.delete(methodValue);
      } else {
        newSelection.add(methodValue);
        newSelection.delete(TRADITIONAL_COOKING_METHOD); // Remove traditional if another is selected
      }

      return newSelection;
    });
  };

  const handleSave = () => {
    onSave(Array.from(selected));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cooking-method-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cooking-method-title" className="text-xl font-bold text-primary-800 mb-4 flex-shrink-0">
          Elkészítés módja
        </h2>
        
        <div className="overflow-y-auto space-y-2 pr-2 -mr-4">
          {options.map(option => {
            const isSelected = selected.has(option.value);
            return (
              <button
                key={option.value}
                onClick={() => handleToggle(option.value)}
                className={`w-full text-left flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                  isSelected 
                    ? 'bg-primary-100 border-primary-400' 
                    : 'bg-white hover:bg-gray-50'
                }`}
                aria-pressed={isSelected}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                  {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`font-medium ${isSelected ? 'text-primary-800' : 'text-gray-700'}`}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
        
        <div className="mt-6 flex justify-end gap-3 border-t pt-4 flex-shrink-0">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">
            Mégse
          </button>
          <button
            onClick={handleSave}
            className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700"
          >
            Kész
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookingMethodModal;
