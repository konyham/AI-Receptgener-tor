import React from 'react';
import { Favorites, Recipe } from '../types';

interface FavoritesViewProps {
  favorites: Favorites;
  onViewRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeName: string, category: string) => void;
  onDeleteCategory: (category: string) => void;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (category: string) => void;
  filterCategory: string;
  onSetFilterCategory: (category: string) => void;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  onViewRecipe,
  onDeleteRecipe,
  onDeleteCategory,
  expandedCategories,
  onToggleCategory,
  filterCategory,
  onSetFilterCategory,
}) => {
  
  const categories = Object.keys(favorites);

  const filteredCategories =
    filterCategory === 'all'
      ? categories
      : categories.filter((cat) => cat === filterCategory);

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Nincsenek mentett kedvencek</h3>
        <p className="mt-1 text-sm text-gray-500">Generáljon egy receptet és mentse el, hogy itt megjelenjen!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800">Kedvenc Receptjeim</h2>

      {categories.length > 1 && (
        <div className="mb-4">
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
      )}

      {filteredCategories.map((category) => (
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
              {favorites[category].map((recipe) => (
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
      ))}
    </div>
  );
};

export default FavoritesView;