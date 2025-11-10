import React, { useState, useEffect, useRef } from 'react';
import { PantryLocation, PANTRY_LOCATIONS } from '../types';

interface TransferItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (destination: PantryLocation, mode: 'move' | 'copy') => void;
  sourceLocation: PantryLocation;
  itemCount: number;
}

const TransferItemsModal: React.FC<TransferItemsModalProps> = ({ isOpen, onClose, onConfirm, sourceLocation, itemCount }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const destinationLocations = PANTRY_LOCATIONS.filter(loc => loc !== sourceLocation);
  const [selectedDestination, setSelectedDestination] = useState<PantryLocation | null>(destinationLocations.length > 0 ? destinationLocations[0] : null);

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
      aria-labelledby="transfer-items-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="transfer-items-title" className="text-xl font-bold text-gray-800 mb-4">Kijelölt tételek áthelyezése / másolása</h2>
        <p className="text-gray-600 mb-2">
          Kijelölt tételek száma: <strong>{itemCount}</strong>
        </p>
         <p className="text-gray-600 mb-6">
          Forrás kamra: <strong>{sourceLocation}</strong>
        </p>
        <div className="space-y-3">
            <h3 className="text-md font-semibold text-gray-700">Válassza ki a cél kamrát:</h3>
            {destinationLocations.map(location => (
                <label key={location} className="flex items-center p-3 border rounded-lg bg-white cursor-pointer hover:bg-gray-50 has-[:checked]:bg-primary-50 has-[:checked]:border-primary-400 transition-colors">
                    <input
                        type="radio"
                        name="destination-pantry"
                        value={location}
                        checked={selectedDestination === location}
                        onChange={() => setSelectedDestination(location)}
                        className="h-5 w-5 border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-3 text-gray-700 font-medium">Kamra ({location})</span>
              </label>
            ))}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300"
          >
            Mégse
          </button>
           <button
            onClick={() => onConfirm(selectedDestination!, 'copy')}
            disabled={!selectedDestination}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            Másolás
          </button>
          <button
            onClick={() => onConfirm(selectedDestination!, 'move')}
            disabled={!selectedDestination}
            className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400"
          >
            Áthelyezés
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferItemsModal;