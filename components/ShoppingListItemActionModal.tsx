import React, { useEffect, useRef } from 'react';
import { StorageType } from '../types';

type Action = StorageType | 'delete';

interface ShoppingListItemActionModalProps {
  isOpen: boolean;
  itemName: string;
  onClose: () => void;
  onAction: (action: Action) => void;
}

const ShoppingListItemActionModal: React.FC<ShoppingListItemActionModalProps> = ({ isOpen, itemName, onClose, onAction }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions: { label: string; action: Action; icon: string; className: string }[] = [
    { label: 'Kamra', action: StorageType.PANTRY, icon: '🥫', className: 'bg-green-600 hover:bg-green-700' },
    { label: 'Hűtő', action: StorageType.REFRIGERATOR, icon: '🧊', className: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Fagyasztó', action: StorageType.FREEZER, icon: '❄️', className: 'bg-sky-600 hover:bg-sky-700' },
    { label: 'Törlés', action: 'delete', icon: '🗑️', className: 'bg-red-600 hover:bg-red-700' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog" aria-modal="true" aria-labelledby="action-modal-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="action-modal-title" className="text-xl font-bold text-gray-800 mb-2">Mi történjen ezzel?</h2>
        <p className="text-center text-2xl font-semibold text-primary-700 mb-6 p-2 bg-primary-50 rounded-md">{itemName}</p>
        
        <div className="grid grid-cols-2 gap-3">
          {actions.map(({ label, action, icon, className }) => (
            <button
              key={action}
              onClick={() => onAction(action)}
              className={`flex items-center justify-center gap-2 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors ${className}`}
            >
              <span className="text-xl">{icon}</span>
              <span>{label}</span>
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

export default ShoppingListItemActionModal;
