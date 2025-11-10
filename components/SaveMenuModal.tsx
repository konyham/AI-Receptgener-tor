import React, { useState, useEffect, useRef } from 'react';

interface SaveMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (menuName: string) => void;
  suggestedName: string;
}

const SaveMenuModal: React.FC<SaveMenuModalProps> = ({ isOpen, onClose, onSave, suggestedName }) => {
  const [menuName, setMenuName] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      setMenuName(suggestedName);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, suggestedName]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (menuName.trim()) {
      onSave(menuName.trim());
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-menu-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="save-menu-title" className="text-xl font-bold text-primary-800 dark:text-primary-300 mb-4">Menü elmentése</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">Adjon egyedi nevet a menünek. Az összes fogás ezen a néven, egy közös kategóriába lesz elmentve.</p>
        <div>
          <label htmlFor="menu-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Menü neve
          </label>
          <input
            ref={inputRef}
            id="menu-name"
            type="text"
            value={menuName}
            onChange={e => setMenuName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-2 bg-white dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
            Mégse
          </button>
          <button
            onClick={handleSave}
            disabled={!menuName.trim()}
            className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 disabled:bg-gray-400"
          >
            Mentés
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveMenuModal;