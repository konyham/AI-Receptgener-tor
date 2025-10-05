import React, { useRef, useState } from 'react';
import { Favorites, Recipe, SortOption, BackupData, ShoppingListItem, PantryItem, PantryLocation, UserProfile, OptionItem } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import StarRating from './StarRating';
import MoveRecipeModal from './MoveRecipeModal';

interface FavoritesViewProps {
  favorites: Favorites;
  shoppingList: ShoppingListItem[];
  pantry: Record<PantryLocation, PantryItem[]>;
  users: UserProfile[];
  onViewRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeName: string, category: string) => void;
  onDeleteCategory: (category: string) => void;
  onImportData: (data: BackupData) => void;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (category: string) => void;
  filterCategory: string;
  onSetFilterCategory: (category: string) => void;
  sortOption: SortOption;
  onSetSortOption: (option: SortOption) => void;
  onMoveRecipe: (recipe: Recipe, fromCategory: string, toCategory: string) => void;
  mealTypes: OptionItem[];
  cuisineOptions: OptionItem[];
  cookingMethodsList: OptionItem[];
  cookingMethodCapacities: Record<string, number | null>;
  orderedCuisineOptions: OptionItem[];
  orderedCookingMethods: OptionItem[];
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: SortOption.DATE_DESC, label: 'Dátum szerint (legújabb elöl)' },
  { value: SortOption.DATE_ASC, label: 'Dátum szerint (legrégebbi elöl)' },
  { value: SortOption.NAME_ASC, label: 'Név szerint (A-Z)' },
  { value: SortOption.NAME_DESC, label: 'Név szerint (Z-A)' },
  { value: SortOption.RATING_DESC, label: 'Értékelés szerint (legjobb elöl)' },
  { value: SortOption.RATING_ASC, label: 'Értékelés szerint (legrosszabb elöl)' },
];

const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  shoppingList,
  pantry,
  users,
  onViewRecipe,
  onDeleteRecipe,
  onDeleteCategory,
  onImportData,
  expandedCategories,
  onToggleCategory,
  filterCategory,
  onSetFilterCategory,
  sortOption,
  onSetSortOption,
  onMoveRecipe,
  mealTypes,
  cuisineOptions,
  cookingMethodsList,
  cookingMethodCapacities,
  orderedCuisineOptions,
  orderedCookingMethods,
}) => {
  const categories = Object.keys(favorites);
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [movingRecipe, setMovingRecipe] = useState<{ recipe: Recipe; fromCategory: string } | null>(null);

  const handleMoveRecipe = (toCategory: string) => {
    if (movingRecipe) {
      onMoveRecipe(movingRecipe.recipe, movingRecipe.fromCategory, toCategory);
      setMovingRecipe(null); // Close modal
    }
  };

  const handleExport = async () => {
    try {
      const dataToSave: BackupData = {
        favorites,
        shoppingList,
        pantry,
        users,
        mealTypes,
        cuisineOptions,
        cookingMethods: cookingMethodsList,
        cookingMethodCapacities,
        cuisineOptionsOrder: orderedCuisineOptions.map(item => item.value),
        cookingMethodsOrder: orderedCookingMethods.map(item => item.value),
      };
      const jsonString = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-');
      const suggestedName = `konyhamiki_mentes_${date}_${time}.json`;

      const isPickerSupported = 'showSaveFilePicker' in window;
      const isTopFrame = window.self === window.top;

      if (isPickerSupported && isTopFrame) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName,
            types: [{
              description: 'JSON Fájl',
              accept: { 'application/json': ['.json'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          showNotification('Adatok sikeresen mentve!', 'success');
        } catch (err: any) {
          // AbortError is thrown when the user cancels the save dialog, which is not a real error.
          if (err.name !== 'AbortError') {
            console.error("Hiba a mentés során (File Picker):", err);
            showNotification('Hiba történt az adatok mentése közben.', 'info');
          }
        }
      } else {
        // Fallback for older browsers or when in an iframe
        if (!isPickerSupported) {
          showNotification('A böngészője nem támogatja a "Mentés másként" funkciót, ezért a fájl közvetlenül letöltésre kerül.', 'info');
        } else if (!isTopFrame) {
          showNotification('A böngésző biztonsági korlátozásai miatt a fájl közvetlenül letöltésre kerül.', 'info');
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Hiba a mentés során:", error);
      showNotification('Hiba történt az adatok mentése közben.', 'info');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const data = JSON.parse(text);
          onImportData(data);
        } else {
           throw new Error('A fájl tartalma nem olvasható szövegként.');
        }
      } catch (error) {
        console.error("Hiba a betöltés során:", error);
        showNotification('Hiba történt a fájl beolvasása vagy feldolgozása közben.', 'info');
      }
    };
    // A mező értékének törlése a megbízható 'onloadend' eseményben, ami siker és hiba esetén is lefut.
    reader.onloadend = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    reader.readAsText(file);
  };
  
  const filteredCategories =
    filterCategory === 'all'
      ? categories
      : categories.filter((cat) => cat === filterCategory);

  // FIX: Explicitly type `pantryList` to `PantryItem[]` to resolve type error when accessing `.length`.
  const hasAnyData = categories.length > 0 || shoppingList.length > 0 || Object.values(pantry).some((pantryList: PantryItem[]) => pantryList.length > 0) || users.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800">Kedvenc Receptjeim</h2>
        {categories.length === 0 ? (
          <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Nincsenek mentett kedvencek</h3>
              <p className="mt-1 text-sm text-gray-500">Generáljon egy receptet és mentse el, hogy itt megjelenjen!</p>
          </div>
        ) : (
          <>
            {categories.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 border rounded-lg">
                <div>
                  <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Szűrés kategória szerint
                  </label>
                  <select
                    id="category-filter"
                    value={filterCategory}
                    onChange={(e) => onSetFilterCategory(e.target.value)}
                    className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">Minden kategória</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="sort-order" className="block text-sm font-medium text-gray-700 mb-1">
                    Rendezés
                  </label>
                  <select
                    id="sort-order"
                    value={sortOption}
                    onChange={(e) => onSetSortOption(e.target.value as SortOption)}
                    className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {filteredCategories.map((category) => {
              const recipes = favorites[category];
              const sortedRecipes = [...recipes].sort((a, b) => {
                switch (sortOption) {
                  case SortOption.NAME_ASC:
                    return a.recipeName.localeCompare(b.recipeName, 'hu');
                  case SortOption.NAME_DESC:
                    return b.recipeName.localeCompare(a.recipeName, 'hu');
                  case SortOption.DATE_ASC:
                    if (!a.dateAdded) return -1;
                    if (!b.dateAdded) return 1;
                    return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
                  case SortOption.RATING_DESC:
                    return (b.rating ?? 0) - (a.rating ?? 0);
                  case SortOption.RATING_ASC:
                    return (a.rating ?? 0) - (b.rating ?? 0);
                  case SortOption.DATE_DESC:
                  default:
                    if (!a.dateAdded) return 1;
                    if (!b.dateAdded) return -1;
                    return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
                }
              });

              return (
                <div key={category} className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <button
                    onClick={() => onToggleCategory(category)}
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 focus:outline-none"
                    aria-expanded={!!expandedCategories[category]}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-primary-700">{category}</span>
                      <span className="text-sm bg-primary-100 text-primary-800 font-semibold px-2 py-0.5 rounded-full">
                        {favorites[category].length} recept
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); if (window.confirm(`Biztosan törli a "${category}" kategóriát és az összes benne lévő receptet?`)) onDeleteCategory(category); }} 
                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                            aria-label={`'${category}' kategória törlése`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-gray-500 transform transition-transform ${expandedCategories[category] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                  </button>
                  {expandedCategories[category] && (
                    <ul className="divide-y divide-gray-200 bg-white p-2">
                      {sortedRecipes.map((recipe) => (
                        <li key={recipe.recipeName} className="flex items-center justify-between p-3 gap-2">
                          <div className="flex items-center gap-3 flex-grow min-w-0">
                            <span className="font-medium text-gray-800 truncate" title={recipe.recipeName}>{recipe.recipeName}</span>
                            {recipe.rating && recipe.rating > 0 && <StarRating rating={recipe.rating} readOnly />}
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <button onClick={() => onViewRecipe(recipe)} className="text-sm font-semibold text-primary-600 hover:text-primary-800 p-1">
                              Megtekintés
                            </button>
                             <button 
                                onClick={() => setMovingRecipe({ recipe, fromCategory: category })}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 p-1"
                                aria-label={`'${recipe.recipeName}' áthelyezése`}
                            >
                                Áthelyezés
                            </button>
                            <button onClick={() => onDeleteRecipe(recipe.recipeName, category)} className="text-sm font-medium text-red-600 hover:text-red-800 p-1">
                              Törlés
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </>
        )}
       <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200">
        <h3 className="text-lg font-bold text-center text-gray-700 mb-4">Adatkezelés</h3>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
                onClick={handleExport}
                disabled={!hasAnyData}
                className="flex-1 bg-blue-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Mentés Fájlba
            </button>
            <button
                onClick={handleImportClick}
                className="flex-1 bg-green-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
            >
                Betöltés Fájlból
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
              aria-hidden="true"
            />
        </div>
        <p className="text-xs text-center text-gray-500 mt-3">A betöltés összefésüli a meglévő adatokat az újonnan betöltöttekkel.</p>
      </div>

       {movingRecipe && (
        <MoveRecipeModal
          isOpen={!!movingRecipe}
          onClose={() => setMovingRecipe(null)}
          onMove={handleMoveRecipe}
          existingCategories={categories}
          recipeName={movingRecipe.recipe.recipeName}
          sourceCategory={movingRecipe.fromCategory}
        />
      )}
    </div>
  );
};

export default FavoritesView;
