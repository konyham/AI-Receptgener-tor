import type { Recipe, Favorites } from '../types';
import { safeSetLocalStorage } from '../utils/storage';

const FAVORITES_KEY = 'ai-recipe-generator-favorites';

/**
 * Validates and recovers a raw favorites object, typically from an import.
 * @param data The raw data to validate.
 * @returns An object with the cleaned favorites and an optional recovery notification.
 */
export const validateAndRecover = (data: unknown): { favorites: Favorites; recoveryNotification?: string } => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { favorites: {}, recoveryNotification: "Az importált kedvencek formátuma érvénytelen volt." };
  }
  
  const validFavorites: Favorites = {};
  let hadCorruptedEntries = false;

  for (const category in data) {
    if (Object.prototype.hasOwnProperty.call(data, category)) {
      const recipes = (data as any)[category];
      if (Array.isArray(recipes)) {
        const validRecipes: Recipe[] = [];
        recipes.forEach((recipe: any, index: number) => {
          const isValidRating = typeof recipe.rating === 'undefined' || (typeof recipe.rating === 'number' && recipe.rating >= 1 && recipe.rating <= 5);
          if (typeof recipe === 'object' && recipe !== null && recipe.recipeName && Array.isArray(recipe.ingredients) && Array.isArray(recipe.instructions) && isValidRating) {
            
            // FIX: Add data migration for old instruction format (string[] -> InstructionStep[]).
            // This ensures backward compatibility with favorites saved before the step-image feature was added.
            if (recipe.instructions.length > 0 && typeof recipe.instructions[0] === 'string') {
              recipe.instructions = recipe.instructions.map((text: string) => ({ text: text }));
            }

            validRecipes.push(recipe);
          } else {
            console.warn(`Skipping corrupted recipe during import at index ${index} in category "${category}".`, recipe);
            hadCorruptedEntries = true;
          }
        });
        if (validRecipes.length > 0) {
          validFavorites[category] = validRecipes;
        }
      } else {
        console.warn(`Skipping corrupted category "${category}" during import (not an array).`, recipes);
        hadCorruptedEntries = true;
      }
    }
  }

  return {
    favorites: validFavorites,
    recoveryNotification: hadCorruptedEntries ? 'Néhány sérült receptet kihagytunk az importálás során.' : undefined
  };
};

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
  
  const { favorites, recoveryNotification } = validateAndRecover(parsedData);

  if (recoveryNotification) {
      console.log("Saving cleaned favorites list back to localStorage to prevent future errors.");
      saveFavorites(favorites);
  }

  return { favorites, recoveryNotification };
};


/**
 * Saves the entire favorites object to localStorage.
 * @param favorites The favorites object to save.
 */
export const saveFavorites = (favorites: Favorites): void => {
  safeSetLocalStorage(FAVORITES_KEY, favorites);
};

/**
 * Merges imported favorites into the current ones, avoiding duplicates.
 * @param currentFavorites The existing favorites object.
 * @param importedFavorites The favorites object from the imported file.
 * @returns An object with the merged favorites and the count of new recipes added.
 */
export const mergeFavorites = (currentFavorites: Favorites, importedFavorites: Favorites): { mergedFavorites: Favorites; newRecipesCount: number } => {
  // Create a deep copy to avoid direct state mutation.
  const newFavorites: Favorites = JSON.parse(JSON.stringify(currentFavorites));
  let newRecipesCount = 0;

  for (const category in importedFavorites) {
    if (Object.prototype.hasOwnProperty.call(importedFavorites, category)) {
      // If the category doesn't exist in the current favorites, create it.
      if (!newFavorites[category]) {
        newFavorites[category] = [];
      }
      
      // Create a Set of existing recipe names in the category for efficient lookup.
      const existingRecipeNames = new Set(newFavorites[category].map(r => r.recipeName));
      
      importedFavorites[category].forEach(recipe => {
        // If the recipe is not already in the category, add it.
        if (!existingRecipeNames.has(recipe.recipeName)) {
          newFavorites[category].push(recipe);
          newRecipesCount++;
        }
      });
    }
  }

  return { mergedFavorites: newFavorites, newRecipesCount };
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

  // Defensively create a copy and remove imageUrl to prevent localStorage quota issues.
  // This ensures the image is never stored, even if the calling component sends it.
  const recipeToSave = { ...recipe, dateAdded: new Date().toISOString() };
  delete (recipeToSave as Partial<Recipe>).imageUrl;

  // Avoid adding duplicate recipes in the same category.
  if (!favorites[category].some(r => r.recipeName === recipeToSave.recipeName)) {
    favorites[category].push(recipeToSave);
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