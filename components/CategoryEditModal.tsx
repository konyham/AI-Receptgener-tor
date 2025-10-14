import React, { useState, useEffect, useRef } from 'react';

interface CategoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newCategories: string[]) => void;
  recipeName: string;
  allCategories: string[];
  initialCategories: string[];
}

const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  recipeName,
  allCategories,
  initialCategories,
}) => {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [newCategory, setNewCategory] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategories(new Set(initialCategories));
    }
  }, [isOpen, initialCategories]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggle = (category: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !allCategories.includes(trimmed) && !selectedCategories.has(trimmed)) {
      setSelectedCategories(prev => new Set(prev).add(trimmed));
      setNewCategory('');
    }
  };

  const handleSave = () => {
    onSave(Array.from(selectedCategories));
  };
  
  const sortedAllCategories = [...allCategories].sort((a,b) => a.localeCompare(b));

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-edit-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="category-edit-title" className="text-xl font-bold text-gray-800 mb-2">Kategóriák kezelése</h2>
        <p className="text-center font-semibold text-primary-700 mb-4">{recipeName}</p>
        
        <p className="text-sm text-gray-600 mb-3">Válassza ki, mely kategóriákba tartozzon a recept:</p>

        <div className="space-y-2 max-h-60 overflow-y-auto border p-3 rounded-md">
          {sortedAllCategories.map(category => (
            <label key={category} className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCategories.has(category)}
                onChange={() => handleToggle(category)}
                className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-3 text-gray-700 font-medium">{category}</span>
            </label>
          ))}
          {sortedAllCategories.length === 0 && <p className="text-gray-500 text-center">Nincsenek még kategóriák.</p>}
        </div>
        
        <div className="mt-4">
            <label htmlFor="new-category-input" className="text-sm font-medium text-gray-700">Új kategória hozzáadása:</label>
            <div className="flex gap-2 mt-1">
                <input
                    id="new-category-input"
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewCategory(); } }}
                    placeholder="Új kategória neve..."
                    className="flex-grow p-2 border border-gray-300 rounded-md"
                />
                <button onClick={handleAddNewCategory} className="bg-gray-200 text-gray-800 font-semibold px-4 rounded-md hover:bg-gray-300">Hozzáad</button>
            </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Mégse</button>
          <button onClick={handleSave} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700">Mentés</button>
        </div>
      </div>
    </div>
  );
};

export default CategoryEditModal;
