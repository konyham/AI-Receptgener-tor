// services/favoritesService.ts

import type { Recipe, Favorites, InstructionStep } from '../types';
import { safeSetLocalStorage } from '../utils/storage';
import * as imageStore from './imageStore';

const FAVORITES_KEY = 'ai-recipe-generator-favorites';

/**
 * Validates and recovers a raw favorites object, typically from an import.
 * CRITICAL UPDATE: This function is now "Forgiving". Instead of discarding recipes that match most but not all criteria
 * (which caused data loss for old recipes with missing fields), it attempts to repair them by adding default values.
 * It only discards items that are fundamentally broken (not an object or missing a name).
 * @param data The raw data to validate.
 * @returns An object with the cleaned favorites and an optional recovery notification.
 */
export const validateAndRecover = (data: unknown): { favorites: Favorites; recoveryNotification?: string } => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { favorites: {}, recoveryNotification: "Az importált kedvencek formátuma érvénytelen volt." };
  }
  
  const validFavorites: Favorites = {};
  let hadCorruptedEntries = false;
  let repairedEntriesCount = 0;

  for (const category in data) {
    if (Object.prototype.hasOwnProperty.call(data, category)) {
      const recipes = (data as any)[category];
      if (Array.isArray(recipes)) {
        const validRecipes: Recipe[] = [];
        recipes.forEach((recipe: any, index: number) => {
          // Fundamental check: Is it an object and does it have a name?
          if (typeof recipe === 'object' && recipe !== null && recipe.recipeName && typeof recipe.recipeName === 'string') {
            
            // Repair: Ensure arrays exist
            if (!Array.isArray(recipe.ingredients)) {
                recipe.ingredients = [];
                repairedEntriesCount++;
            }
            if (!Array.isArray(recipe.instructions)) {
                recipe.instructions = [];
                repairedEntriesCount++;
            }

            // Repair: Migrate old instruction strings to objects
            if (recipe.instructions.length > 0 && typeof recipe.instructions[0] === 'string') {
              recipe.instructions = recipe.instructions.map((text: string): InstructionStep => ({ text: text }));
              repairedEntriesCount++;
            }

            // Repair: Ensure cookingMethods exist
            if (!recipe.cookingMethods || !Array.isArray(recipe.cookingMethods)) {
                recipe.cookingMethods = ['traditional'];
                repairedEntriesCount++;
            }
            
            // Repair: Ensure favoritedBy exists
            if (!Array.isArray(recipe.favoritedBy)) {
                recipe.favoritedBy = [];
                repairedEntriesCount++;
            }

            // Keep the recipe (it's now technically valid enough to use)
            validRecipes.push(recipe as Recipe);
          } else {
            console.warn(`Dropping fundamentally broken recipe at index ${index} in category "${category}". Missing name or not an object.`, recipe);
            hadCorruptedEntries = true;
          }
        });
        
        // Even if the list is empty, we keep the category if it was in the source (though typically favorites logic cleans empty cats)
        if (validRecipes.length > 0) {
          validFavorites[category] = validRecipes;
        }
      } else {
        console.warn(`Skipping corrupted category "${category}" during import (not an array).`, recipes);
        hadCorruptedEntries = true;
      }
    }
  }

  let notification = undefined;
  if (hadCorruptedEntries) {
      notification = 'Néhány helyrehozhatatlanul sérült receptet kihagytunk.';
  } else if (repairedEntriesCount > 0) {
      // We don't necessarily need to notify the user about silent repairs, but it's good for debugging.
      console.log(`Silently repaired ${repairedEntriesCount} recipe fields to prevent data loss.`);
  }

  return {
    favorites: validFavorites,
    recoveryNotification: notification
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

  // Always save back if we repaired something or if it was a fresh load, to ensure consistency.
  // However, to avoid excessive writes, we rely on the fact that validateAndRecover returns a clean object.
  if (recoveryNotification) {
      console.log("Saving cleaned favorites list back to localStorage.");
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
 * Merges imported favorites into the current ones, updating existing recipes and adding new ones.
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
      
      // Use a Map for efficient lookup and update of recipes within the category.
      const recipeMap = new Map<string, Recipe>(newFavorites[category].map(r => [r.recipeName, r]));
      
      importedFavorites[category].forEach(importedRecipe => {
        // If the recipe is not already in the category, it's new.
        if (!recipeMap.has(importedRecipe.recipeName)) {
          newRecipesCount++;
        }
        // Always update/add the imported recipe. This ensures existing ones are overwritten.
        recipeMap.set(importedRecipe.recipeName, importedRecipe);
      });

      // Reconstruct the category array from the map.
      newFavorites[category] = Array.from(recipeMap.values());
    }
  }

  return { mergedFavorites: newFavorites, newRecipesCount };
};

/**
 * Adds a recipe to a specific category in favorites or updates it if it already exists.
 * This function moves image data to IndexedDB to avoid filling up localStorage.
 * CRITICAL UPDATE: Uses the PASSED `currentFavorites` object as the source of truth to ensure
 * that we are building upon the data currently visible to the user, preventing data loss from reading potentially empty/corrupted storage.
 * @param currentFavorites The current state of favorites from the application.
 * @param recipe The recipe to add or update.
 * @param category The category to add the recipe to.
 * @returns The updated favorites object.
 */
export const addRecipeToFavorites = async (currentFavorites: Favorites, recipe: Recipe, category: string): Promise<Favorites> => {
  const favorites: Favorites = JSON.parse(JSON.stringify(currentFavorites)); // Deep copy state
  
  if (!favorites[category]) {
    favorites[category] = [];
  }

  const recipeToSave = JSON.parse(JSON.stringify(recipe)); // Deep copy to prevent prop mutation
  recipeToSave.dateAdded = recipe.dateAdded || new Date().toISOString();

  // Handle main image
  if (recipeToSave.imageUrl && recipeToSave.imageUrl.startsWith('data:image')) {
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await imageStore.saveImage(imageId, recipeToSave.imageUrl);
    recipeToSave.imageUrl = `indexeddb:${imageId}`;
  }

  // Handle instruction images
  if (recipeToSave.instructions) {
    recipeToSave.instructions = await Promise.all(
      recipeToSave.instructions.map(async (instruction: any, i: number) => {
        if (instruction.imageUrl && instruction.imageUrl.startsWith('data:image')) {
          const imageId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${i}`;
          await imageStore.saveImage(imageId, instruction.imageUrl);
          return { ...instruction, imageUrl: `indexeddb:${imageId}` };
        }
        return instruction;
      })
    );
  }

  const existingRecipeIndex = favorites[category].findIndex((r: Recipe) => r.recipeName === recipeToSave.recipeName);

  if (existingRecipeIndex !== -1) {
    // Recipe exists, update it. First, clean up old images if they are being replaced.
    const originalRecipe = favorites[category][existingRecipeIndex];
    if (originalRecipe.imageUrl && originalRecipe.imageUrl.startsWith('indexeddb:') && originalRecipe.imageUrl !== recipeToSave.imageUrl) {
        await imageStore.deleteImage(originalRecipe.imageUrl.substring(10));
    }
    if (originalRecipe.instructions) {
        for (let i = 0; i < originalRecipe.instructions.length; i++) {
            const oldInst = originalRecipe.instructions[i];
            const newInst = recipeToSave.instructions ? recipeToSave.instructions[i] : undefined;
            if (oldInst.imageUrl && oldInst.imageUrl.startsWith('indexeddb:') && (!newInst || oldInst.imageUrl !== newInst.imageUrl)) {
                await imageStore.deleteImage(oldInst.imageUrl.substring(10));
            }
        }
    }
    
    favorites[category][existingRecipeIndex] = {
      ...recipeToSave,
      dateAdded: originalRecipe.dateAdded, // Preserve original dateAdded
    };
  } else {
    // Recipe is new, add it.
    recipeToSave.favoritedBy = recipeToSave.favoritedBy || [];
    favorites[category].push(recipeToSave);
  }

  saveFavorites(favorites);
  return favorites;
};

/**
 * Removes a specific recipe from a category and its associated images from IndexedDB.
 * @param currentFavorites The current state of favorites from the application.
 * @param recipeName The name of the recipe to remove.
 * @param category The category from which to remove the recipe.
 * @returns The updated favorites object.
 */
export const removeRecipeFromFavorites = async (currentFavorites: Favorites, recipeName: string, category: string): Promise<Favorites> => {
  const favorites: Favorites = JSON.parse(JSON.stringify(currentFavorites));
  
  if (favorites[category]) {
    const recipeToRemove = favorites[category].find((r: Recipe) => r.recipeName === recipeName);

    if (recipeToRemove) {
      if (recipeToRemove.imageUrl && recipeToRemove.imageUrl.startsWith('indexeddb:')) {
        await imageStore.deleteImage(recipeToRemove.imageUrl.substring(10));
      }
      if (recipeToRemove.instructions) {
        for (const instruction of recipeToRemove.instructions) {
          if (instruction.imageUrl && instruction.imageUrl.startsWith('indexeddb:')) {
            await imageStore.deleteImage(instruction.imageUrl.substring(10));
          }
        }
      }
    }

    favorites[category] = favorites[category].filter((r: Recipe) => r.recipeName !== recipeName);
    if (favorites[category].length === 0) {
      delete favorites[category];
    }
    saveFavorites(favorites);
  }
  return favorites;
};


/**
 * Moves a recipe from one category to another.
 * @param currentFavorites The current state of favorites.
 * @param recipeToMove The full recipe object to move.
 * @param fromCategory The source category name.
 * @param toCategory The destination category name.
 * @returns An object indicating success and the updated favorites.
 */
export const moveRecipe = (currentFavorites: Favorites, recipeToMove: Recipe, fromCategory: string, toCategory: string): { updatedFavorites: Favorites; success: boolean; message?: string } => {
  const favorites: Favorites = JSON.parse(JSON.stringify(currentFavorites));
  
  // 1. Find the recipe in the source category
  const sourceCategoryList = favorites[fromCategory];
  if (!sourceCategoryList) {
    return { updatedFavorites: favorites, success: false, message: `A forráskategória ('${fromCategory}') nem található.` };
  }
  
  const recipeIndex = sourceCategoryList.findIndex((r: Recipe) => r.recipeName === recipeToMove.recipeName);
  if (recipeIndex === -1) {
    return { updatedFavorites: favorites, success: false, message: `A(z) '${recipeToMove.recipeName}' recept nem található a(z) '${fromCategory}' kategóriában.` };
  }

  // 2. Check for duplicates in the destination category
  const destinationCategoryList = favorites[toCategory] || [];
  const alreadyExists = destinationCategoryList.some((r: Recipe) => r.recipeName === recipeToMove.recipeName);
  if (alreadyExists) {
    return { updatedFavorites: favorites, success: false, message: `A(z) '${recipeToMove.recipeName}' nevű recept már létezik a(z) '${toCategory}' kategóriában.` };
  }
  
  // 3. Remove from source
  const [movedRecipe] = favorites[fromCategory].splice(recipeIndex, 1);
  if (favorites[fromCategory].length === 0) {
    delete favorites[fromCategory];
  }

  // 4. Add to destination
  if (!favorites[toCategory]) {
    favorites[toCategory] = [];
  }
  favorites[toCategory].push(movedRecipe);
  
  // 5. Save and return
  saveFavorites(favorites);
  return { updatedFavorites: favorites, success: true };
};


/**
 * Removes an entire category and all recipes and their associated images within it.
 * @param currentFavorites The current state of favorites.
 * @param category The category to remove.
 * @returns The updated favorites object.
 */
export const removeCategory = async (currentFavorites: Favorites, category: string): Promise<Favorites> => {
  const favorites: Favorites = JSON.parse(JSON.stringify(currentFavorites));
  
  if (favorites[category]) {
    const recipesToRemove = favorites[category];
    for (const recipe of recipesToRemove) {
      if (recipe.imageUrl && recipe.imageUrl.startsWith('indexeddb:')) {
        await imageStore.deleteImage(recipe.imageUrl.substring(10));
      }
      if (recipe.instructions) {
        for (const instruction of recipe.instructions) {
          if (instruction.imageUrl && instruction.imageUrl.startsWith('indexeddb:')) {
            await imageStore.deleteImage(instruction.imageUrl.substring(10));
          }
        }
      }
    }
    delete favorites[category];
    saveFavorites(favorites);
  }
  return favorites;
};

/**
 * Removes all recipes belonging to a specific menu from a category.
 * @param currentFavorites The current state of favorites.
 * @param menuName The name of the menu to remove.
 * @param category The category from which to remove the menu recipes.
 * @returns The updated favorites object.
 */
export const removeMenuFromFavorites = async (currentFavorites: Favorites, menuName: string, category: string): Promise<Favorites> => {
  const favorites: Favorites = JSON.parse(JSON.stringify(currentFavorites));
  
  if (favorites[category]) {
    const recipesToRemove = favorites[category].filter((r: Recipe) => r.menuName === menuName);
    
    // Delete associated images first
    for (const recipe of recipesToRemove) {
      if (recipe.imageUrl && recipe.imageUrl.startsWith('indexeddb:')) {
        await imageStore.deleteImage(recipe.imageUrl.substring(10));
      }
      if (recipe.instructions) {
        for (const instruction of recipe.instructions) {
          if (instruction.imageUrl && instruction.imageUrl.startsWith('indexeddb:')) {
            await imageStore.deleteImage(instruction.imageUrl.substring(10));
          }
        }
      }
    }

    // Filter out the recipes
    favorites[category] = favorites[category].filter((r: Recipe) => r.menuName !== menuName);
    
    if (favorites[category].length === 0) {
      delete favorites[category];
    }
    saveFavorites(favorites);
  }
  return favorites;
};


/**
 * Processes a Favorites object to move any Data URL images to IndexedDB.
 * This is useful after importing old backup files.
 * @param favorites The favorites object to process.
 * @returns A new Favorites object with images stored as references.
 */
export const processFavoritesForStorage = async (favorites: Favorites): Promise<Favorites> => {
  const processedFavorites = JSON.parse(JSON.stringify(favorites)); // Deep copy

  for (const category in processedFavorites) {
    for (const recipe of processedFavorites[category]) {
      // Handle main image
      if (recipe.imageUrl && recipe.imageUrl.startsWith('data:image')) {
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await imageStore.saveImage(imageId, recipe.imageUrl);
        recipe.imageUrl = `indexeddb:${imageId}`;
      }
      // Handle instruction images
      if (recipe.instructions) {
        for (let i = 0; i < recipe.instructions.length; i++) {
          const instruction = recipe.instructions[i];
          if (instruction.imageUrl && instruction.imageUrl.startsWith('data:image')) {
            const imageId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${i}`;
            await imageStore.saveImage(imageId, instruction.imageUrl);
            instruction.imageUrl = `indexeddb:${imageId}`;
          }
        }
      }
    }
  }
  return processedFavorites;
};

/**
 * Updates the `favoritedBy` array for a specific recipe.
 * @param currentFavorites The current state of favorites.
 * @param recipeName The name of the recipe to update.
 * @param category The category the recipe is in.
 * @param favoritedByIds The new array of user IDs.
 * @returns The updated favorites object.
 */
export const updateFavoriteStatus = async (currentFavorites: Favorites, recipeName: string, category: string, favoritedByIds: string[]): Promise<Favorites> => {
  const favorites: Favorites = JSON.parse(JSON.stringify(currentFavorites));
  
  if (favorites[category]) {
    const recipeIndex = favorites[category].findIndex((r: Recipe) => r.recipeName === recipeName);
    if (recipeIndex !== -1) {
      favorites[category][recipeIndex].favoritedBy = favoritedByIds;
      saveFavorites(favorites);
    }
  }
  return favorites;
};

/**
 * Updates which categories a recipe belongs to.
 * Securely manages adding and removing the recipe from multiple categories without data loss.
 * CRITICAL FIX: Uses the VALID `currentFavorites` state from the application instead of reading from raw storage.
 * This ensures that what the user sees is preserved, preventing data loss from empty/corrupted reads.
 * @param currentFavorites The valid current favorites state.
 * @param recipe The recipe object to update.
 * @param newCategories An array of category names the recipe should belong to.
 * @returns The updated favorites object.
 */
export const updateRecipeCategories = async (currentFavorites: Favorites, recipe: Recipe, newCategories: string[]): Promise<Favorites> => {
    // 1. Clone the current VALID state.
    const updatedFavorites: Favorites = JSON.parse(JSON.stringify(currentFavorites));
    
    const recipeName = recipe.recipeName.trim();

    // 2. Identify existing categories based on state
    const currentCategories: string[] = [];
    let foundOriginal = false;

    for (const cat in updatedFavorites) {
        if (Array.isArray(updatedFavorites[cat]) && updatedFavorites[cat].some((r: Recipe) => r.recipeName && r.recipeName.trim() === recipeName)) {
            foundOriginal = true;
            currentCategories.push(cat);
        }
    }

    if (!foundOriginal) {
        console.warn(`Recipe '${recipeName}' was not found in the current state. Adding it as new.`);
    }

    const targetCategoriesSet = new Set(newCategories);
    
    // Categories to add
    const categoriesToAdd = newCategories.filter(cat => !currentCategories.includes(cat));
    
    // Categories to remove
    const categoriesToRemove = currentCategories.filter(cat => !targetCategoriesSet.has(cat));

    // 4. Add to new categories
    for (const category of categoriesToAdd) {
        if (!updatedFavorites[category]) {
            updatedFavorites[category] = [];
        }
        // Check against the data to avoid duplicates
        if (Array.isArray(updatedFavorites[category]) && !updatedFavorites[category].some((r: Recipe) => r.recipeName && r.recipeName.trim() === recipeName)) {
            const recipeCopy = JSON.parse(JSON.stringify(recipe));
            recipeCopy.dateAdded = recipe.dateAdded || new Date().toISOString();
            updatedFavorites[category].push(recipeCopy);
        }
    }

    // 5. Remove from deselected categories
    for (const category of categoriesToRemove) {
        if (updatedFavorites[category] && Array.isArray(updatedFavorites[category])) {
            updatedFavorites[category] = updatedFavorites[category].filter((r: Recipe) => r.recipeName && r.recipeName.trim() !== recipeName);
            if (updatedFavorites[category].length === 0) {
                delete updatedFavorites[category];
            }
        }
    }

    // 6. Save the modified state back to storage.
    saveFavorites(updatedFavorites);
    return updatedFavorites;
};