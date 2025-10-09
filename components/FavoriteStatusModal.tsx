import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';

interface FavoriteStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (favoritedByIds: string[]) => void;
  users: UserProfile[];
  initialFavoritedByIds: string[];
  recipeName: string;
}

const FavoriteStatusModal: React.FC<FavoriteStatusModalProps> = ({ isOpen, onClose, onSave, users, initialFavoritedByIds, recipeName }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(initialFavoritedByIds || []));
    }
  }, [isOpen, initialFavoritedByIds]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggle = (userId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    onSave(Array.from(selectedIds));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="fav-status-title" onClick={onClose}>
      <div ref={modalRef} className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h2 id="fav-status-title" className="text-xl font-bold text-gray-800 mb-2">Kedvencnek jelölés</h2>
        <p className="text-center font-semibold text-primary-700 mb-4">{recipeName}</p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {users.length > 0 ? users.map(user => (
            <label key={user.id} className="flex items-center p-3 border rounded-lg bg-white cursor-pointer hover:bg-gray-50 has-[:checked]:bg-primary-50 has-[:checked]:border-primary-400 transition-colors">
              <input
                type="checkbox"
                checked={selectedIds.has(user.id)}
                onChange={() => handleToggle(user.id)}
                className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-3 text-gray-700 font-medium">{user.name}</span>
            </label>
          )) : (
            <p className="text-gray-500 text-center">Nincsenek felhasználók a kedvencnek jelöléshez.</p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Mégse</button>
          <button onClick={handleSave} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700">Mentés</button>
        </div>
      </div>
    </div>
  );
};

export default FavoriteStatusModal;
