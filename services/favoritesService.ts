import type { Recipe, Favorites } from '../types';
import { safeSetLocalStorage } from '../utils/storage';

const FAVORITES_KEY = 'ai-recipe-generator-favorites';

/**
 * Retrieves the favorites object from localStorage.
 * Attempts to recover data if it's partially corrupted.
 * @returns An object containing the favorites data and an optional recovery notification.
 * @throws An error if data is unrecoverably corrupted.
 */
export const getFavorites = (): { favorites: Favorites; recoveryNotification?: string } => {
  const favoritesJson = localStorage.getItem(FAVORITES_KEY);
  if (!favoritesJson) {
      return { favorites: {} };
  }

  let parsedData: any;
  try {
    parsedData = JSON.parse(favoritesJson);
  } catch (error) {
    console.error("Fatal JSON parsing error for favorites. Backing up corrupted data.", error);
    localStorage.setItem(`${FAVORITES_KEY}_corrupted_${Date.now()}`, favoritesJson);
    throw new Error('A kedvenc receptek listája súlyosan sérült, ezért nem sikerült betölteni. A sérült adatokról biztonsági mentés készült.');
  }

  if (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData)) {
      console.error("Malformed favorites data structure (not an object). Backing up corrupted data.");
      localStorage.setItem(`${FAVORITES_KEY}_corrupted_${Date.now()}`, favoritesJson);
      throw new Error('A kedvenc receptek listájának formátuma érvénytelen. A sérült adatokról biztonsági mentés készült.');
  }

  const validFavorites: Favorites = {};
  let hadCorruptedEntries = false;

  for (const category in parsedData) {
      if (Object.prototype.hasOwnProperty.call(parsedData, category)) {
          const recipes = parsedData[category];
          if (Array.isArray(recipes)) {
              const validRecipes: Recipe[] = [];
              recipes.forEach((recipe: any, index: number) => {
                  if (typeof recipe === 'object' && recipe !== null && recipe.recipeName && Array.isArray(recipe.ingredients) && Array.isArray(recipe.instructions)) {
                      validRecipes.push(recipe);
                  } else {
                      console.warn(`Skipping corrupted recipe at index ${index} in category "${category}".`, recipe);
                      hadCorruptedEntries = true;
                  }
              });

              if (validRecipes.length > 0) {
                  validFavorites[category] = validRecipes;
              }
          } else {
               console.warn(`Skipping corrupted category "${category}" (not an array).`, recipes);
               hadCorruptedEntries = true;
          }
      }
  }

  if (hadCorruptedEntries) {
      console.log("Saving cleaned favorites list back to localStorage to prevent future errors.");
      saveFavorites(validFavorites);
      return {
          favorites: validFavorites,
          recoveryNotification: 'A kedvencek listája részben sérült volt, de a menthető recepteket sikeresen helyreállítottuk.'
      };
  }

  return { favorites: parsedData }; // Return original parsed data if no corruption was found
};


/**
 * Saves the entire favorites object to localStorage.
 * @param favorites The favorites object to save.
 */
export const saveFavorites = (favorites: Favorites): void => {
  safeSetLocalStorage(FAVORITES_KEY, favorites);
};

/**
 * Adds a recipe to a specific category in favorites and saves to localStorage.
 * @param recipe The recipe to add.
 * @param category The category to add the recipe to.
 * @returns The updated favorites object.
 */
export const addRecipeToFavorites = (recipe: Recipe, category: string): Favorites => {
  const { favorites } = getFavorites();
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
  const { favorites } = getFavorites();
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
  const { favorites } = getFavorites();
  if (favorites[category]) {
    delete favorites[category];
    saveFavorites(favorites);
  }
  return favorites;
};