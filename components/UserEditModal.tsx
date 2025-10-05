import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: UserProfile | Omit<UserProfile, 'id'>) => void;
  userToEdit: UserProfile | null;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, onSave, userToEdit }) => {
  const [name, setName] = useState('');
  const [likes, setLikes] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [allergies, setAllergies] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        setName(userToEdit.name);
        setLikes(userToEdit.likes);
        setDislikes(userToEdit.dislikes);
        setAllergies(userToEdit.allergies);
      } else {
        setName('');
        setLikes('');
        setDislikes('');
        setAllergies('');
      }
      // Focus the name input when the modal opens
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, userToEdit]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (name.trim()) {
      const userData = {
        name: name.trim(),
        likes: likes.trim(),
        dislikes: dislikes.trim(),
        allergies: allergies.trim(),
      };
      if (userToEdit) {
        onSave({ ...userData, id: userToEdit.id });
      } else {
        onSave(userData);
      }
    }
  };
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && e.target === modalRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-edit-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="user-edit-modal-title" className="text-xl font-bold text-gray-800 mb-4">
          {userToEdit ? 'Felhasználó szerkesztése' : 'Új felhasználó'}
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="user-name" className="block text-sm font-medium text-gray-700">Név</label>
            <input
              ref={nameInputRef}
              id="user-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="user-likes" className="block text-sm font-medium text-gray-700">Ízlés</label>
            <textarea
              id="user-likes"
              value={likes}
              onChange={(e) => setLikes(e.target.value)}
              placeholder="Vesszővel elválasztva, pl. csípős, hal, sajt..."
              rows={2}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Az AI előnyben részesíti ezeket.</p>
          </div>
          <div>
            <label htmlFor="user-dislikes" className="block text-sm font-medium text-gray-700">Nem szeretem</label>
            <textarea
              id="user-dislikes"
              value={dislikes}
              onChange={(e) => setDislikes(e.target.value)}
              placeholder="Vesszővel elválasztva, pl. kapor, spenót..."
              rows={2}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
            />
             <p className="text-xs text-gray-500 mt-1">Az AI lehetőség szerint kerülni fogja ezeket.</p>
          </div>
          <div>
            <label htmlFor="user-allergies" className="block text-sm font-medium text-gray-700">Tiltott (allergia)</label>
            <textarea
              id="user-allergies"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Vesszővel elválasztva, pl. dió, laktóz..."
              rows={2}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"
            />
             <p className="text-xs text-gray-500 mt-1">Az AI garantáltan kihagyja ezeket a receptből.</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Mégse</button>
          <button onClick={handleSave} disabled={!name.trim()} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 disabled:bg-gray-400">Mentés</button>
        </div>
      </div>
    </div>
  );
};

export default UserEditModal;