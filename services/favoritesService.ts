import type { Recipe, Favorites } from '../types';

const FAVORITES_KEY = 'ai-recipe-generator-favorites';

/**
 * Retrieves the favorites object from localStorage.
 * Throws an error and backs up data if it's corrupted.
 */
export const getFavorites = (): Favorites => {
  const favoritesJson = localStorage.getItem(FAVORITES_KEY);
  if (!favoritesJson) {
      return {};
  }

  try {
    const favorites = JSON.parse(favoritesJson);
    // Basic validation to ensure we have an object that is not an array.
    if (typeof favorites === 'object' && favorites !== null && !Array.isArray(favorites)) {
      return favorites;
    }
    // If the data is not in the expected format (but is valid JSON), treat it as corruption.
    throw new Error('Malformed favorites data structure.');
  } catch (error) {
    console.error("Error parsing favorites from localStorage. Backing up corrupted data.", error);
    // Backup corrupted data for potential manual recovery.
    localStorage.setItem(`${FAVORITES_KEY}_corrupted_${Date.now()}`, favoritesJson);
    // DO NOT remove the corrupted item. This prevents data loss on a parsing error.
    // Throw a user-friendly error to be caught by the UI layer.
    throw new Error('A kedvenc receptek listája sérült, ezért nem sikerült betölteni. A sérült adatokról biztonsági mentés készült, és az eredeti adatok megmaradtak a tárolóban.');
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