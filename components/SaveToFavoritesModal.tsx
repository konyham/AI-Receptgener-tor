import React, { useState, useEffect, useRef } from 'react';

interface SaveToFavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: string) => void;
  existingCategories: string[];
  suggestedCategory?: string;
}

const SaveToFavoritesModal: React.FC<SaveToFavoritesModalProps> = ({ isOpen, onClose, onSave, existingCategories, suggestedCategory }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const suggestedInExisting = suggestedCategory 
        ? existingCategories.find(cat => cat.toLowerCase() === suggestedCategory.toLowerCase()) 
        : undefined;

      if (suggestedInExisting) {
        // A javasolt kategória létezik, válasszuk ki a listából.
        setSelectedCategory(suggestedInExisting);
        setIsCreatingNew(false);
        setNewCategory('');
      } else if (suggestedCategory) {
        // A javasolt kategória új, váltsunk "új létrehozása" módra és töltsük ki.
        setIsCreatingNew(true);
        setNewCategory(suggestedCategory);
        setSelectedCategory(''); // Nincs kiválasztás a legördülőből.
      } else if (existingCategories.length > 0) {
        // Nincs javaslat, de vannak kategóriák, válasszuk az elsőt.
        setSelectedCategory(existingCategories[0]);
        setIsCreatingNew(false);
        setNewCategory('');
      } else {
        // Nincs javaslat és nincsenek kategóriák, kényszerítsük az új létrehozását.
        setIsCreatingNew(true);
        setSelectedCategory('');
        setNewCategory('');
      }
    }
  }, [isOpen, suggestedCategory, existingCategories]);


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
            // FIX: Explicitly type `el` as HTMLElement to resolve `offsetParent` property access error.
            )).filter((el: HTMLElement) => el.offsetParent !== null); // Filter for visible elements
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) { // Shift+Tab
                if (document.activeElement === firstElement) {
                    // FIX: Use an instanceof check to narrow the type from `Element` to `HTMLElement` before calling `.focus()`.
                    if (lastElement instanceof HTMLElement) {
                        lastElement.focus();
                    }
                    event.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === lastElement) {
                    // FIX: Use an instanceof check to narrow the type from `Element` to `HTMLElement` before calling `.focus()`.
                    if (firstElement instanceof HTMLElement) {
                        firstElement.focus();
                    }
                    event.preventDefault();
                }
            }
        }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Focus first element on open
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

  const handleSave = () => {
    const categoryToSave = isCreatingNew ? newCategory.trim() : selectedCategory.trim();
    if (categoryToSave) {
      onSave(categoryToSave);
    }
  };

  const handleToggleNew = () => {
    setIsCreatingNew(prev => !prev);
    setNewCategory('');
    if(existingCategories.length > 0) {
        setSelectedCategory(existingCategories[0])
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="save-modal-title">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm">
        <h2 id="save-modal-title" className="text-2xl font-bold text-primary-800 mb-4">Mentés a kedvencekbe</h2>
        
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
                        placeholder="Pl. Hétköznapi vacsorák"
                        className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            ) : (
                <div>
                    <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Válasszon kategóriát
                    </label>
                    <select
                        id="category-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
                        disabled={existingCategories.length === 0}
                    >
                        {existingCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            )}
           
            <button
                onClick={handleToggleNew}
                className="text-sm text-primary-600 hover:underline"
                disabled={!isCreatingNew && existingCategories.length === 0}
            >
                {isCreatingNew ? (existingCategories.length > 0 ? 'Választás meglévőből' : '') : 'Új kategória létrehozása'}
            </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
            Mégse
          </button>
          <button 
            onClick={handleSave} 
            disabled={isCreatingNew ? !newCategory.trim() : !selectedCategory.trim()}
            className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
            Mentés
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveToFavoritesModal;