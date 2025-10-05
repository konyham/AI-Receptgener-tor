import React, { useEffect, useRef } from 'react';
import { PantryLocation, PANTRY_LOCATIONS } from '../types';

interface LocationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: PantryLocation) => void;
}

const LocationPromptModal: React.FC<LocationPromptModalProps> = ({ isOpen, onClose, onSelect }) => {
  const modalRef = useRef<HTMLDivElement>(null);

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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-prompt-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="location-prompt-title" className="text-xl font-bold text-gray-800 mb-4">Helyszín kiválasztása</h2>
        <p className="text-gray-600 mb-6">Melyik kamrához szeretné hozzáadni az elemeket, vagy melyikből szeretne főzni?</p>
        <div className="flex flex-col gap-3">
          {PANTRY_LOCATIONS.map(location => (
            <button
              key={location}
              onClick={() => onSelect(location)}
              className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors"
            >
              Kamra ({location})
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Mégse
        </button>
      </div>
    </div>
  );
};

export default LocationPromptModal;