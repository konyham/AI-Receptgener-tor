import React, { useState, useMemo } from 'react';
import { Favorites, Recipe, SortOption, UserProfile } from '../types';
import StarRating from './StarRating';
import MoveRecipeModal from './MoveRecipeModal';
import FavoriteStatusModal from './FavoriteStatusModal';
import FavoriteActionModal from './FavoriteActionModal';

interface FavoritesViewProps {
  favorites: Favorites;
  users: UserProfile[];
  onViewRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeName: string, category: string) => void;
  onDeleteCategory: (category: string) => void;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (category: string) => void;
  filterCategory: string;
  onSetFilterCategory: (category: string) => void;
  sortOption: SortOption;
  onSetSortOption: (option: SortOption) => void;
  onMoveRecipe: (recipe: Recipe, fromCategory: string, toCategory: string) => void;
  onUpdateFavoriteStatus: (recipeName: string, category: string, favoritedByIds: string[]) => void;
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
  users,
  onViewRecipe,
  onDeleteRecipe,
  onDeleteCategory,
  expandedCategories,
  onToggleCategory,
  filterCategory,
  onSetFilterCategory,
  sortOption,
  onSetSortOption,
  onMoveRecipe,
  onUpdateFavoriteStatus,
}) => {
  const categories = Object.keys(favorites);
  const [movingRecipe, setMovingRecipe] = useState<{ recipe: Recipe; fromCategory: string } | null>(null);
  const [statusModalState, setStatusModalState] = useState<{ recipe: Recipe; category: string } | null>(null);
  const [actionMenuRecipe, setActionMenuRecipe] = useState<{ recipe: Recipe; category: string } | null>(null);
  const [favoriteFilter, setFavoriteFilter] = useState('all'); // 'all', 'any_favorite', 'user_id'

  const handleMoveRecipe = (toCategory: string) => {
    if (movingRecipe) {
      onMoveRecipe(movingRecipe.recipe, movingRecipe.fromCategory, toCategory);
      setMovingRecipe(null); // Close modal
    }
  };
  
  const filteredCategories = useMemo(() => {
    if (filterCategory === 'all') {
        return categories;
    }
    return categories.filter((cat) => cat === filterCategory);
  }, [categories, filterCategory]);

  const hasAnyResults = useMemo(() => {
    return filteredCategories.some(category => {
        let recipes = favorites[category] || [];
        if (favoriteFilter === 'any_favorite') {
            return recipes.some(r => r.favoritedBy && r.favoritedBy.length > 0);
        } else if (favoriteFilter !== 'all') { // It's a user ID
            return recipes.some(r => r.favoritedBy?.includes(favoriteFilter));
        }
        return recipes.length > 0;
    });
  }, [filteredCategories, favorites, favoriteFilter]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800">Mentett Receptek</h2>
        {categories.length === 0 ? (
          <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Nincsenek mentett receptek</h3>
              <p className="mt-1 text-sm text-gray-500">Generáljon egy receptet és mentse el, hogy itt megjelenjen!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 border rounded-lg">
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
                  <label htmlFor="favorite-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Kedvencek szűrése
                  </label>
                  <select
                    id="favorite-filter"
                    value={favoriteFilter}
                    onChange={(e) => setFavoriteFilter(e.target.value)}
                    className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">Minden mentett</option>
                    <option value="any_favorite">Bárki kedvence</option>
                    {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name} kedvencei</option>
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

            {filteredCategories.map((category) => {
              const recipes = favorites[category];
              
              let displayedRecipes = recipes;
              if (favoriteFilter === 'any_favorite') {
                  displayedRecipes = recipes.filter(r => r.favoritedBy && r.favoritedBy.length > 0);
              } else if (favoriteFilter !== 'all') { // It's a user ID
                  displayedRecipes = recipes.filter(r => r.favoritedBy?.includes(favoriteFilter));
              }

              if (displayedRecipes.length === 0) {
                return null;
              }

              const sortedRecipes = [...displayedRecipes].sort((a, b) => {
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
                        {displayedRecipes.length} recept
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
                    <ul className="divide-y divide-gray-200 bg-white">
                      {sortedRecipes.map((recipe) => (
                        <li key={recipe.recipeName} className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-grow min-w-0">
                                <button 
                                  onClick={() => setStatusModalState({ recipe, category })} 
                                  className="text-2xl transition-transform hover:scale-125 focus:outline-none flex-shrink-0"
                                  aria-label="Kedvenc állapot módosítása"
                                >
                                  {(recipe.favoritedBy && recipe.favoritedBy.length > 0) ? 
                                      <span className="text-red-500">♥</span> : 
                                      <span className="text-gray-400">♡</span>
                                  }
                                </button>
                                <button 
                                  onClick={() => setActionMenuRecipe({ recipe, category })}
                                  className="font-medium text-gray-800 text-left break-words w-full hover:text-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-300 rounded"
                                >
                                    {recipe.recipeName}
                                </button>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                                {recipe.rating && recipe.rating > 0 && <StarRating rating={recipe.rating} readOnly />}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}

            {!hasAnyResults && (
                <div className="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-900">Nincs a szűrésnek megfelelő recept</h3>
                    <p className="mt-1 text-sm text-gray-500">Próbáljon más szűrési feltételt beállítani.</p>
                </div>
            )}
          </>
        )}
       
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
       {statusModalState && (
        <FavoriteStatusModal
          isOpen={!!statusModalState}
          onClose={() => setStatusModalState(null)}
          onSave={(ids) => {
            onUpdateFavoriteStatus(statusModalState.recipe.recipeName, statusModalState.category, ids);
            setStatusModalState(null);
          }}
          users={users}
          initialFavoritedByIds={statusModalState.recipe.favoritedBy || []}
          recipeName={statusModalState.recipe.recipeName}
        />
      )}
      {actionMenuRecipe && (
        <FavoriteActionModal
            isOpen={!!actionMenuRecipe}
            onClose={() => setActionMenuRecipe(null)}
            recipe={actionMenuRecipe.recipe}
            onView={() => {
                onViewRecipe(actionMenuRecipe.recipe);
                setActionMenuRecipe(null);
            }}
            onMove={() => {
                setMovingRecipe({ recipe: actionMenuRecipe.recipe, fromCategory: actionMenuRecipe.category });
                setActionMenuRecipe(null);
            }}
            onDelete={() => {
                if (window.confirm(`Biztosan törli a következő receptet: "${actionMenuRecipe.recipe.recipeName}"?`)) {
                    onDeleteRecipe(actionMenuRecipe.recipe.recipeName, actionMenuRecipe.category);
                }
                setActionMenuRecipe(null);
            }}
        />
      )}
    </div>
  );
};

export default FavoritesView;