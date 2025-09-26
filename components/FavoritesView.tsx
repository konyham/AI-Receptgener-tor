import React, { useRef } from 'react';
import { Favorites, Recipe, SortOption, BackupData } from '../types';
import * as shoppingListService from '../services/shoppingListService';
import { useNotification } from '../contexts/NotificationContext';

interface FavoritesViewProps {
  favorites: Favorites;
  onViewRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeName: string, category: string) => void;
  onDeleteCategory: (category: string) => void;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (category: string) => void;
  filterCategory: string;
  onSetFilterCategory: (category: string) => void;
  sortOption: SortOption;
  onSetSortOption: (option: SortOption) => void;
  onImportData: (data: BackupData) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: SortOption.DATE_DESC, label: 'Dátum szerint (legújabb elöl)' },
  { value: SortOption.DATE_ASC, label: 'Dátum szerint (legrégebbi elöl)' },
  { value: SortOption.NAME_ASC, label: 'Név szerint (A-Z)' },
  { value: SortOption.NAME_DESC, label: 'Név szerint (Z-A)' },
];

const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  onViewRecipe,
  onDeleteRecipe,
  onDeleteCategory,
  expandedCategories,
  onToggleCategory,
  filterCategory,
  onSetFilterCategory,
  sortOption,
  onSetSortOption,
  onImportData,
}) => {
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const shoppingList = shoppingListService.getShoppingList().list;
      const dataToExport: BackupData = { favorites, shoppingList };
      const jsonData = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `konyha_miki_mentes_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('Adatok sikeresen exportálva!', 'success');
    } catch (err: any) {
      showNotification(`Hiba az exportálás során: ${err.message}`, 'info');
    }
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as BackupData;

        // Basic validation
        if (typeof data.favorites === 'object' && data.favorites !== null && Array.isArray(data.shoppingList)) {
           if (window.confirm('Biztosan importálja az adatokat? Ezzel felülírja a jelenlegi kedvenceit és a bevásárlólistáját.')) {
              onImportData(data);
           }
        } else {
          throw new Error('A fájl formátuma érvénytelen.');
        }
      } catch (error: any) {
        showNotification(`Hiba az importálás során: ${error.message}`, 'info');
      } finally {
        // Reset the input value to allow re-importing the same file
        if (event.target) {
            event.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };
  
  const categories = Object.keys(favorites);

  const filteredCategories =
    filterCategory === 'all'
      ? categories
      : categories.filter((cat) => cat === filterCategory);

  if (categories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nincsenek mentett kedvencek</h3>
            <p className="mt-1 text-sm text-gray-500">Generáljon egy receptet és mentse el, hogy itt megjelenjen!</p>
        </div>

        <div className="border border-gray-200 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold text-center text-primary-700 mb-3">Adatkezelés</h3>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                 <button onClick={handleImportClick} className="flex-1 text-sm bg-white border border-primary-300 text-primary-700 font-semibold py-2 px-4 rounded-lg hover:bg-primary-50 transition-colors">Betöltés fájlból...</button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
            </div>
            <p className="text-xs text-center text-gray-500 mt-2">Töltsön be egy korábban mentett adatfájlt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800">Kedvenc Receptjeim</h2>

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
              // A dátummal nem rendelkező recepteket a legrégebbinek tekintjük
              if (!a.dateAdded) return -1;
              if (!b.dateAdded) return 1;
              return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
            case SortOption.DATE_DESC:
            default:
              // A dátummal nem rendelkező recepteket a legrégebbinek tekintjük
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
                      onClick={(e) => { e.stopPropagation(); onDeleteCategory(category); }} 
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
                  <li key={recipe.recipeName} className="flex items-center justify-between p-3">
                    <span className="font-medium text-gray-800">{recipe.recipeName}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onViewRecipe(recipe)} className="text-sm font-semibold text-primary-600 hover:text-primary-800">
                        Megtekintés
                      </button>
                      <button onClick={() => onDeleteRecipe(recipe.recipeName, category)} className="text-sm font-medium text-red-600 hover:text-red-800">
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
      
      <div className="border border-gray-200 rounded-lg shadow-sm p-4 mt-8">
        <h3 className="text-lg font-semibold text-center text-primary-700 mb-3">Adatkezelés</h3>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={handleExport} className="flex-1 text-sm bg-white border border-primary-300 text-primary-700 font-semibold py-2 px-4 rounded-lg hover:bg-primary-50 transition-colors">Mentés fájlba</button>
            <button onClick={handleImportClick} className="flex-1 text-sm bg-white border border-primary-300 text-primary-700 font-semibold py-2 px-4 rounded-lg hover:bg-primary-50 transition-colors">Betöltés fájlból...</button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
        </div>
        <p className="text-xs text-center text-gray-500 mt-2">Mentse el vagy töltse be a kedvenceit és a bevásárlólistáját egyetlen fájlban.</p>
      </div>
    </div>
  );
};

export default FavoritesView;