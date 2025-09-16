import React, { useState } from 'react';

interface SaveToFavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: string) => void;
  existingCategories: string[];
}

const SaveToFavoritesModal: React.FC<SaveToFavoritesModalProps> = ({ isOpen, onClose, onSave, existingCategories }) => {
  const [selectedCategory, setSelectedCategory] = useState(existingCategories[0] || '');
  const [newCategory, setNewCategory] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(existingCategories.length === 0);

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
      <div className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-sm">
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
                    >
                        {existingCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            )}
           
            <button
                onClick={handleToggleNew}
                className="text-sm text-primary-600 hover:underline"
            >
                {isCreatingNew ? 'Választás meglévőből' : 'Új kategória létrehozása'}
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
