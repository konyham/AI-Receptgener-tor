import React, { useState, useEffect, useRef } from 'react';

interface MoveRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (toCategory: string) => void;
  existingCategories: string[];
  recipeName: string;
  sourceCategory: string;
}

const MoveRecipeModal: React.FC<MoveRecipeModalProps> = ({ isOpen, onClose, onMove, existingCategories, recipeName, sourceCategory }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const availableCategories = existingCategories.filter(cat => cat !== sourceCategory);

  useEffect(() => {
    if (isOpen) {
      if (availableCategories.length > 0) {
        setSelectedCategory(availableCategories[0]);
        setIsCreatingNew(false);
      } else {
        setSelectedCategory('');
        setIsCreatingNew(true);
      }
      setNewCategory(''); // Always reset new category input
    }
  }, [isOpen, sourceCategory, existingCategories]);


  useEffect(() => {
    if (!isOpen) return;

    const modalElement = modalRef.current;
    
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
        
        if (event.key === 'Tab' && modalElement) {
            const focusableElements = Array.from(modalElement.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )).filter((el: HTMLElement) => el.offsetParent !== null);
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    if (lastElement instanceof HTMLElement) lastElement.focus();
                    event.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    if (firstElement instanceof HTMLElement) firstElement.focus();
                    event.preventDefault();
                }
            }
        }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    if (modalElement) {
        const firstFocusable = modalElement.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
}, [isOpen, onClose]);


  if (!isOpen) return null;

  const handleMove = () => {
    const categoryToMoveTo = isCreatingNew ? newCategory.trim() : selectedCategory.trim();
    if (categoryToMoveTo) {
      onMove(categoryToMoveTo);
    }
  };

  const handleToggleNew = () => {
    setIsCreatingNew(prev => !prev);
    setNewCategory('');
    if(availableCategories.length > 0) {
        setSelectedCategory(availableCategories[0])
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="move-modal-title">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm">
        <h2 id="move-modal-title" className="text-xl font-bold text-primary-800 mb-2">Recept áthelyezése</h2>
        <p className="text-center font-semibold text-gray-700 mb-1">"{recipeName}"</p>
        <p className="text-center text-sm text-gray-500 mb-4">Jelenlegi kategória: <span className="font-medium">{sourceCategory}</span></p>

        <div className="space-y-4">
            {isCreatingNew ? (
                 <div>
                    <label htmlFor="new-category" className="block text-sm font-medium text-gray-700 mb-1">
                        Új kategória neve
                    </label>
                    <input
                        id="new-category"
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Pl. Gyors ebédek"
                        className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            ) : (
                <div>
                    <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Válasszon új kategóriát
                    </label>
                    <select
                        id="category-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
                        disabled={availableCategories.length === 0}
                    >
                        {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            )}
           
            <button
                onClick={handleToggleNew}
                className="text-sm text-primary-600 hover:underline"
                disabled={!isCreatingNew && availableCategories.length === 0}
            >
                {isCreatingNew ? (availableCategories.length > 0 ? 'Választás meglévőből' : '') : 'Új kategória létrehozása'}
            </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
            Mégse
          </button>
          <button 
            onClick={handleMove} 
            disabled={isCreatingNew ? !newCategory.trim() : !selectedCategory.trim()}
            className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
            Áthelyezés
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveRecipeModal;