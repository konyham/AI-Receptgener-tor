import React, { useState, useEffect, useRef } from 'react';
import { Recipe, DietOption, CuisineOption, CookingMethod, OptionItem, TRADITIONAL_COOKING_METHOD, UserProfile } from '../types';
import CookingMethodModal from './CookingMethodModal';

interface GenerateVariationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalRecipe: Recipe;
  onGenerate: (
    originalRecipe: Recipe,
    params: {
      specialRequest: string;
      diet: DietOption;
      cuisine: CuisineOption;
      cookingMethods: CookingMethod[];
      userPreferences: {
        allergies: string;
        likes: string;
        dislikes: string;
      };
    }
  ) => void;
  dietOptions: { value: DietOption; label: string; description: string }[];
  cuisineOptions: OptionItem[];
  cookingMethodsList: OptionItem[];
  users: UserProfile[];
}

const GenerateVariationModal: React.FC<GenerateVariationModalProps> = ({
  isOpen,
  onClose,
  originalRecipe,
  onGenerate,
  dietOptions,
  cuisineOptions,
  cookingMethodsList,
  users,
}) => {
  const [specialRequest, setSpecialRequest] = useState('');
  const [diet, setDiet] = useState<DietOption>(originalRecipe.diet);
  const [cuisine, setCuisine] = useState<CuisineOption>(originalRecipe.cuisine);
  const [cookingMethods, setCookingMethods] = useState<CookingMethod[]>(originalRecipe.cookingMethods);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCookingMethodModalOpen, setIsCookingMethodModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleUserSelectionChange = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleGenerate = () => {
    const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));
    const combinedAllergies = new Set<string>();
    const combinedLikes = new Set<string>();
    const combinedDislikes = new Set<string>();

    selectedUsers.forEach(user => {
        user.allergies.split(',').forEach(item => item.trim() && combinedAllergies.add(item.trim()));
        user.likes.split(',').forEach(item => item.trim() && combinedLikes.add(item.trim()));
        user.dislikes.split(',').forEach(item => item.trim() && combinedDislikes.add(item.trim()));
    });


    onGenerate(originalRecipe, {
      specialRequest,
      diet,
      cuisine,
      cookingMethods,
      userPreferences: {
          allergies: Array.from(combinedAllergies).join(', '),
          likes: Array.from(combinedLikes).join(', '),
          dislikes: Array.from(combinedDislikes).join(', '),
      }
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="variation-modal-title"
        onClick={onClose}
      >
        <div
          ref={modalRef}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 m-4 w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="variation-modal-title" className="text-2xl font-bold text-primary-800 dark:text-primary-300 mb-2">
            Új Variáció Létrehozása
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Finomítsa a paramétereket a(z) "<strong>{originalRecipe.recipeName}</strong>" recept új változatához.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="variation-request" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Különleges kérés a variációhoz
              </label>
              <textarea
                id="variation-request"
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                placeholder="Pl. készítsd el légkeveréses fritőzben, legyen gluténmentes, használj csípős paprikát..."
                rows={3}
                className="mt-1 w-full p-2 bg-white dark:bg-gray-700 dark:text-gray-100 text-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Kinek készül? (nem kötelező)
              </label>
              {users.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 max-h-32 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      {users.map(user => (
                          <label key={user.id} className="flex items-center p-2 border rounded-lg bg-white dark:bg-gray-700 cursor-pointer hover:bg-gray-50 has-[:checked]:bg-primary-50 has-[:checked]:border-primary-400 transition-colors">
                              <input
                                  type="checkbox"
                                  id={`user-variation-${user.id}`}
                                  checked={selectedUserIds.includes(user.id)}
                                  onChange={() => handleUserSelectionChange(user.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="ml-2 text-sm text-gray-700 dark:text-gray-200 font-medium">{user.name}</span>
                          </label>
                      ))}
                  </div>
              ) : (
                  <p className="text-gray-500 text-xs mt-1">Nincsenek felhasználók a "Felhasználók" menüpont alatt.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="variation-diet" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Diéta</label>
                    <select
                        id="variation-diet"
                        value={diet}
                        onChange={(e) => setDiet(e.target.value as DietOption)}
                        className="mt-1 w-full p-2 bg-white dark:bg-gray-700 dark:text-gray-100 text-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
                    >
                        {dietOptions.map((option) => ( <option key={option.value} value={option.value}>{option.label}</option>))}
                    </select>
                </div>
                <div>
                    <label htmlFor="variation-cuisine" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Konyha</label>
                    <select
                        id="variation-cuisine"
                        value={cuisine}
                        onChange={(e) => setCuisine(e.target.value as CuisineOption)}
                        className="mt-1 w-full p-2 bg-white dark:bg-gray-700 dark:text-gray-100 text-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
                    >
                        {cuisineOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </select>
                </div>
            </div>

            <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Elkészítés módja</label>
                 <div className="mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 min-h-[40px] flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">
                        {cookingMethods.length > 0
                            ? cookingMethods.map(m => cookingMethodsList.find(opt => opt.value === m)?.label || m).join(', ')
                            : 'Hagyományos'
                        }
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsCookingMethodModalOpen(true)}
                        className="text-sm font-semibold text-primary-600 hover:underline"
                    >
                        Módosítás...
                    </button>
                 </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
            >
              Mégse
            </button>
            <button
              onClick={handleGenerate}
              className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700"
            >
              Variáció generálása
            </button>
          </div>
        </div>
      </div>

      <CookingMethodModal
        isOpen={isCookingMethodModalOpen}
        onClose={() => setIsCookingMethodModalOpen(false)}
        onSave={setCookingMethods}
        options={cookingMethodsList}
        initialSelection={cookingMethods}
      />
    </>
  );
};

export default GenerateVariationModal;