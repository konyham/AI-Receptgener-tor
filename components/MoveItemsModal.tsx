import React, { useEffect, useRef } from 'react';
import { PantryLocation, PANTRY_LOCATIONS } from '../types';

interface MoveItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (destination: PantryLocation) => void;
  sourceLocation: PantryLocation;
  itemCount: number;
}

const MoveItemsModal: React.FC<MoveItemsModalProps> = ({ isOpen, onClose, onMove, sourceLocation, itemCount }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const destinationLocations = PANTRY_LOCATIONS.filter(loc => loc !== sourceLocation);

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
      aria-labelledby="move-items-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="move-items-title" className="text-xl font-bold text-gray-800 mb-4">Kijelölt tételek áthelyezése</h2>
        <p className="text-gray-600 mb-6">
          Kijelölt tételek száma: <strong>{itemCount}</strong>.
          Válassza ki a cél kamrát:
        </p>
        <div className="flex flex-col gap-3">
          {destinationLocations.map(location => (
            <button
              key={location}
              onClick={() => onMove(location)}
              className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors"
            >
              Áthelyezés ide: Kamra ({location})
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

export default MoveItemsModal;
