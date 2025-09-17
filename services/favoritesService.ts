import type { Recipe, Favorites } from '../types';

const FAVORITES_KEY = 'ai-recipe-generator-favorites';

/**
 * Retrieves the favorites object from localStorage.
 * Returns an empty object if nothing is found or if there's a parsing error.
 */
export const getFavorites = (): Favorites => {
  try {
    const favoritesJson = localStorage.getItem(FAVORITES_KEY);
    return favoritesJson ? JSON.parse(favoritesJson) : {};
  } catch (error) {
    console.error("Error reading favorites from localStorage", error);
    // In case of corrupted data, clear it to prevent future errors.
    localStorage.removeItem(FAVORITES_KEY);
    return {};
  }
};

/**
 * Saves the entire favorites object to localStorage.
 * @param favorites The favorites object to save.
 */
export const saveFavorites = (favorites: Favorites): void => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error("Error saving favorites to localStorage", error);
  }
};

/**
 * Adds a recipe to a specific category in favorites and saves to localStorage.
 * @param recipe The recipe to add.
 * @param category The category to add the recipe to.
 * @returns The updated favorites object.
 */
export const addRecipeToFavorites = (recipe: Recipe, category: string): Favorites => {
  const favorites = getFavorites();
  if (!favorites[category]) {
    favorites[category] = [];
  }
  // Avoid adding duplicate recipes in the same category.
  if (!favorites[category].some(r => r.recipeName === recipe.recipeName)) {
    favorites[category].push(recipe);
    saveFavorites(favorites);
  }
  return favorites;
};

/**
 * Removes a specific recipe from a category and updates localStorage.
 * @param recipeName The name of the recipe to remove.
 * @param category The category from which to remove the recipe.
 * @returns The updated favorites object.
 */
export const removeRecipeFromFavorites = (recipeName: string, category: string): Favorites => {
  const favorites = getFavorites();
  if (favorites[category]) {
    favorites[category] = favorites[category].filter(r => r.recipeName !== recipeName);
    // If the category becomes empty after removal, delete the category itself.
    if (favorites[category].length === 0) {
      delete favorites[category];
    }
    saveFavorites(favorites);
  }
  return favorites;
};

/**
 * Removes an entire category and all recipes within it, updating localStorage.
 * @param category The category to remove.
 * @returns The updated favorites object.
 */
export const removeCategory = (category: string): Favorites => {
  const favorites = getFavorites();
  if (favorites[category]) {
    delete favorites[category];
    saveFavorites(favorites);
  }
  return favorites;
};
