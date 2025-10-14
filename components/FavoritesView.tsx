import React, { useState, useMemo } from 'react';
import { Favorites, Recipe, SortOption, UserProfile, OptionItem } from '../types';
import StarRating from './StarRating';
import MoveRecipeModal from './MoveRecipeModal';
import FavoriteStatusModal from './FavoriteStatusModal';
import FavoriteActionModal from './FavoriteActionModal';
import ConfirmationModal from './ConfirmationModal';
import CategoryEditModal from './CategoryEditModal';

interface FavoritesViewProps {
  favorites: Favorites;
  users: UserProfile[];
  onViewRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (recipeName: string, category: string) => Promise<void>;
  onDeleteCategory: (category: string) => void;
  onDeleteMenu: (menuName: string, category: string) => void;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (category: string) => void;
  filterCategory: string;
  onSetFilterCategory: (category: string) => void;
  sortOption: SortOption;
  onSetSortOption: (option: SortOption) => void;
  onMoveRecipe: (recipe: Recipe, fromCategory: string, toCategory: string) => void;
  onUpdateFavoriteStatus: (recipeName: string, category: string, favoritedByIds: string[]) => void;
  onUpdateRecipeCategories: (recipe: Recipe, newCategories: string[]) => void;
  cuisineOptions: OptionItem[];
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: SortOption.DATE_DESC, label: 'Dátum szerint (legújabb elöl)' },
  { value: SortOption.DATE_ASC, label: 'Dátum szerint (legrégebbi elöl)' },
  { value: SortOption.NAME_ASC, label: 'Név szerint (A-Z)' },
  { value: SortOption.NAME_DESC, label: 'Név szerint (Z-A)' },
  { value: SortOption.RATING_DESC, label: 'Értékelés szerint (legjobb elöl)' },
  { value: SortOption.RATING_ASC, label: 'Értékelés szerint (legrosszabb elöl)' },
];

const fullMenuCategoryName = "Teljes Menü (Előétel, Leves, Főétel, Desszert)";
const dailyMenuCategoryName = "Napi Menü";
const courseOrder: Record<string, number> = { breakfast: 1, lunch: 2, dinner: 3, appetizer: 1, soup: 2, mainCourse: 3, dessert: 4 };

const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  users,
  onViewRecipe,
  onDeleteRecipe,
  onDeleteCategory,
  onDeleteMenu,
  expandedCategories,
  onToggleCategory,
  filterCategory,
  onSetFilterCategory,
  sortOption,
  onSetSortOption,
  onMoveRecipe,
  onUpdateFavoriteStatus,
  onUpdateRecipeCategories,
  cuisineOptions,
}) => {
  const categories = Object.keys(favorites);
  const [movingRecipe, setMovingRecipe] = useState<{ recipe: Recipe; fromCategory: string } | null>(null);
  const [statusModalState, setStatusModalState] = useState<{ recipe: Recipe; category: string } | null>(null);
  const [actionMenuRecipe, setActionMenuRecipe] = useState<{ recipe: Recipe; category: string } | null>(null);
  const [favoriteFilter, setFavoriteFilter] = useState('all'); // 'all', 'any_favorite', 'user_id'
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ recipeName: string; category: string } | null>(null);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [menuToDelete, setMenuToDelete] = useState<{ menuName: string; category: string } | null>(null);
  const [isDeleteMenuConfirmOpen, setIsDeleteMenuConfirmOpen] = useState(false);
  const [isCategoryEditModalOpen, setIsCategoryEditModalOpen] = useState(false);


  const cuisineLabels = useMemo(() => new Map(cuisineOptions.map(opt => [opt.value, opt.label])), [cuisineOptions]);


  const handleMoveRecipe = (toCategory: string) => {
    if (movingRecipe) {
      onMoveRecipe(movingRecipe.recipe, movingRecipe.fromCategory, toCategory);
      setMovingRecipe(null); // Close modal
    }
  };
  
  const handleDeleteRequest = () => {
    if (!actionMenuRecipe) return;
    setItemToDelete({ recipeName: actionMenuRecipe.recipe.recipeName, category: actionMenuRecipe.category });
    setIsDeleteConfirmOpen(true);
    setActionMenuRecipe(null); // Close action modal
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setIsProcessingDelete(true);
    try {
        await onDeleteRecipe(itemToDelete.recipeName, itemToDelete.category);
    } catch (e) {
        console.error("Delete failed in FavoritesView:", e);
        // Error notification is handled in App.tsx
    } finally {
        setIsProcessingDelete(false);
        setIsDeleteConfirmOpen(false);
        setItemToDelete(null);
    }
  };

  const handleDeleteMenuRequest = (menuName: string, category: string) => {
    setMenuToDelete({ menuName, category });
    setIsDeleteMenuConfirmOpen(true);
  };

  const handleConfirmDeleteMenu = () => {
    if (menuToDelete) {
        onDeleteMenu(menuToDelete.menuName, menuToDelete.category);
        setIsDeleteMenuConfirmOpen(false);
        setMenuToDelete(null);
    }
  };
  
    const sortedAndFilteredFavorites = useMemo(() => {
    const filteredByCategory =
      filterCategory === 'all'
        ? Object.entries(favorites)
        : Object.entries(favorites).filter(([cat]) => cat === filterCategory);

    const filteredBySearch = filteredByCategory.map(([category, recipes]) => {
        const filteredRecipes = recipes.filter(recipe => 
            recipe.recipeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (recipe.menuName && recipe.menuName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            recipe.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        return [category, filteredRecipes] as [string, Recipe[]];
    }).filter(([, recipes]) => recipes.length > 0);
    
    // FIX: Explicitly type the destructured `recipes` variable. This resolves an issue where TypeScript
    // was incorrectly inferring its type as `unknown`, causing a '.filter does not exist' error.
    // FIX: Explicitly type the destructured `recipes` variable in the `.map` callback. This resolves an issue where TypeScript was incorrectly inferring its type as `unknown`, causing a `.filter does not exist` error.
    const filteredByFavoriteStatus = filteredBySearch.map(([category, recipes]: [string, Recipe[]]) => {
        if (favoriteFilter === 'all') {
            return [category, recipes] as [string, Recipe[]];
        }
        const filteredRecipes = recipes.filter(recipe => {
            if (favoriteFilter === 'any_favorite') {
                return recipe.favoritedBy && recipe.favoritedBy.length > 0;
            }
            return recipe.favoritedBy && recipe.favoritedBy.includes(favoriteFilter);
        });
        return [category, filteredRecipes] as [string, Recipe[]];
    }).filter(([, recipes]) => recipes.length > 0);

    const sorted = filteredByFavoriteStatus.map(([category, recipes]) => {
      const sortedRecipes = [...recipes].sort((a, b) => {
        switch (sortOption) {
          case SortOption.DATE_ASC:
            return (a.dateAdded ? new Date(a.dateAdded).getTime() : 0) - (b.dateAdded ? new Date(b.dateAdded).getTime() : 0);
          case SortOption.DATE_DESC:
            return (b.dateAdded ? new Date(b.dateAdded).getTime() : 0) - (a.dateAdded ? new Date(a.dateAdded).getTime() : 0);
          case SortOption.NAME_ASC:
            return a.recipeName.localeCompare(b.recipeName);
          case SortOption.NAME_DESC:
            return b.recipeName.localeCompare(a.recipeName);
          case SortOption.RATING_ASC:
            return (a.rating || 0) - (b.rating || 0);
          case SortOption.RATING_DESC:
            return (b.rating || 0) - (a.rating || 0);
          default:
            return 0;
        }
      });
      return [category, sortedRecipes] as [string, Recipe[]];
    });

    return sorted;
  }, [favorites, filterCategory, sortOption, favoriteFilter, searchQuery]);

  const recipeForCatEdit = actionMenuRecipe?.recipe;
  const initialCategoriesForEdit = useMemo(() => {
    if (!recipeForCatEdit) return [];
    return Object.keys(favorites).filter(cat =>
      favorites[cat].some(r => r.recipeName === recipeForCatEdit.recipeName)
    );
  }, [recipeForCatEdit, favorites]);


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800">Mentett Receptek</h2>
      
      <div className="p-4 bg-gray-50 border rounded-lg space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Szűrés és Rendezés</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Keresés név, menü vagy hozzávaló alapján..."
            className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={filterCategory}
            onChange={(e) => onSetFilterCategory(e.target.value)}
            className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Minden kategória</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            value={sortOption}
            onChange={(e) => onSetSortOption(e.target.value as SortOption)}
            className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
          >
            {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <div className="md:col-span-2 lg:col-span-3">
             <select
                value={favoriteFilter}
                onChange={e => setFavoriteFilter(e.target.value)}
                className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
             >
                <option value="all">Minden recept</option>
                <option value="any_favorite">Bárki kedvence</option>
                {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name} kedvencei</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {sortedAndFilteredFavorites.length > 0 ? (
        <div className="space-y-4">
          {/* FIX: Explicitly type the destructured `recipes` variable to resolve type errors with .reduce, .length, and .sort. */}
          {sortedAndFilteredFavorites.map(([category, recipes]: [string, Recipe[]]) => {
              if (category === fullMenuCategoryName || category === dailyMenuCategoryName) {
                  const menusByName = recipes.reduce<Record<string, Recipe[]>>((acc, recipe) => {
                      if (recipe.menuName) {
                          (acc[recipe.menuName] = acc[recipe.menuName] || []).push(recipe);
                      }
                      return acc;
                  }, {});
                  
                  const hasVisibleMenus = Object.keys(menusByName).length > 0;
                  if (!hasVisibleMenus) return null;

                  return (
                      <div key={category} className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                          <button
                              onClick={() => onToggleCategory(category)}
                              className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100"
                              aria-expanded={!!expandedCategories[category]}
                          >
                              <span className="font-bold text-primary-700">{category} ({Object.keys(menusByName).length})</span>
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transform transition-transform ${expandedCategories[category] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {expandedCategories[category] && (
                              <div className="divide-y divide-gray-200">
                                  {Object.entries(menusByName).map(([menuName, menuRecipes]) => (
                                      <div key={menuName}>
                                          <button
                                              onClick={() => setExpandedMenus(p => ({ ...p, [menuName]: !p[menuName] }))}
                                              className="w-full flex justify-between items-center p-3 text-left bg-primary-50 hover:bg-primary-100"
                                              aria-expanded={!!expandedMenus[menuName]}
                                          >
                                              <span className="font-semibold text-primary-800">{menuName} ({menuRecipes.length})</span>
                                              <div className="flex items-center gap-2">
                                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteMenuRequest(menuName, category); }} className="text-red-500 hover:text-red-700 p-1" aria-label={`'${menuName}' menü törlése`}>
                                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                  </button>
                                                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transform transition-transform ${expandedMenus[menuName] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                              </div>
                                          </button>
                                          {expandedMenus[menuName] && (
                                              <ul className="pl-4 divide-y divide-gray-100 bg-white">
                                                  {menuRecipes
                                                      .sort((a, b) => (courseOrder[a.menuCourse!] || 9) - (courseOrder[b.menuCourse!] || 9))
                                                      .map(recipe => (
                                                          <li key={recipe.recipeName} className="p-3 hover:bg-gray-50">
                                                              {/* ... (render individual recipe item) ... */}
                                                              <div className="flex justify-between items-start gap-3">
                                                                <div className="flex-grow min-w-0">
                                                                  <p className="font-semibold text-primary-800 break-words">{recipe.recipeName}</p>
                                                                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3">
                                                                    <span>{recipe.dateAdded ? new Date(recipe.dateAdded).toLocaleDateString('hu-HU') : 'Ismeretlen dátum'}</span>
                                                                    <div className="flex items-center gap-1 border-l pl-2">
                                                                        <StarRating rating={recipe.rating} readOnly={true} />
                                                                    </div>
                                                                  </div>
                                                                </div>
                                                                <div className="flex-shrink-0">
                                                                  <button onClick={() => setActionMenuRecipe({ recipe, category })} className="text-gray-500 hover:text-primary-600 p-1 rounded-full hover:bg-gray-100" aria-label={`Műveletek a(z) '${recipe.recipeName}' recepttel`}>
                                                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                                                  </button>
                                                                </div>
                                                              </div>
                                                          </li>
                                                      ))
                                                  }
                                              </ul>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  );
              }

              // Default rendering for normal categories
              return (
                  <div key={category} className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                      <button onClick={() => onToggleCategory(category)} className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100" aria-expanded={!!expandedCategories[category]}>
                          <span className="font-bold text-primary-700">{category} ({recipes.length})</span>
                          <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`Biztosan törli a(z) '${category}' kategóriát és az összes benne lévő receptet?`)) onDeleteCategory(category); }} className="text-red-500 hover:text-red-700 p-1" aria-label={`'${category}' kategória törlése`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                              </button>
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transform transition-transform ${expandedCategories[category] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                      </button>
                      {expandedCategories[category] && (
                          <ul className="divide-y divide-gray-200">
                              {recipes.map(recipe => (
                                <li key={recipe.recipeName} className="p-3 hover:bg-gray-50">
                                  <div className="flex justify-between items-start gap-3">
                                    <div className="flex-grow min-w-0">
                                      <p className="font-semibold text-primary-800 break-words">{recipe.recipeName}</p>
                                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3">
                                        <span>{recipe.dateAdded ? new Date(recipe.dateAdded).toLocaleDateString('hu-HU') : 'Ismeretlen dátum'}</span>
                                        <span className="border-l pl-2">{cuisineLabels.get(recipe.cuisine) || 'Ismeretlen konyha'}</span>
                                        <div className="flex items-center gap-1 border-l pl-2">
                                            <StarRating rating={recipe.rating} readOnly={true} />
                                        </div>
                                        {recipe.favoritedBy && recipe.favoritedBy.length > 0 && (
                                            <div className="flex items-center gap-1 border-l pl-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                <span className="font-medium">{recipe.favoritedBy.length}</span>
                                            </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                      <button onClick={() => setActionMenuRecipe({ recipe, category })} className="text-gray-500 hover:text-primary-600 p-1 rounded-full hover:bg-gray-100" aria-label={`Műveletek a(z) '${recipe.recipeName}' recepttel`}>
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                      </button>
                                    </div>
                                  </div>
                                </li>
                              ))}
                          </ul>
                      )}
                  </div>
              );
          })}
        </div>
      ) : (
        <p className="text-center text-gray-500">Nincsenek a szűrési feltételeknek megfelelő mentett receptek.</p>
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
            onView={() => { onViewRecipe(actionMenuRecipe.recipe); setActionMenuRecipe(null); }}
            onMove={() => { setMovingRecipe(actionMenuRecipe); setActionMenuRecipe(null); }}
            onDelete={handleDeleteRequest}
            onEditCategories={() => setIsCategoryEditModalOpen(true)}
        />
      )}

      {isCategoryEditModalOpen && recipeForCatEdit && (
        <CategoryEditModal
          isOpen={isCategoryEditModalOpen}
          onClose={() => {
            setIsCategoryEditModalOpen(false);
            setActionMenuRecipe(null);
          }}
          onSave={(newCategories) => {
            onUpdateRecipeCategories(recipeForCatEdit, newCategories);
            setIsCategoryEditModalOpen(false);
            setActionMenuRecipe(null);
          }}
          recipeName={recipeForCatEdit.recipeName}
          allCategories={categories}
          initialCategories={initialCategoriesForEdit}
        />
      )}

      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Recept törlése"
        message={`Biztosan törli a(z) '${itemToDelete?.recipeName}' nevű receptet? Ez a művelet nem vonható vissza.`}
        isConfirming={isProcessingDelete}
      />
      <ConfirmationModal
        isOpen={isDeleteMenuConfirmOpen}
        onClose={() => setIsDeleteMenuConfirmOpen(false)}
        onConfirm={handleConfirmDeleteMenu}
        title="Menü törlése"
        message={`Biztosan törli a(z) '${menuToDelete?.menuName}' nevű teljes menüt (az összes fogással együtt)? Ez a művelet nem vonható vissza.`}
        isConfirming={false} // A törlés gyors, nem kell külön állapot
      />
    </div>
  );
};

export default FavoritesView;
