import type { ShoppingListItem } from '../types';

const SHOPPING_LIST_KEY = 'ai-recipe-generator-shopping-list';

// Reads the list from localStorage.
export const getShoppingList = (): ShoppingListItem[] => {
  const listJson = localStorage.getItem(SHOPPING_LIST_KEY);
  // Return empty array if no data is found.
  if (!listJson) {
      return [];
  }

  try {
    const list = JSON.parse(listJson);
    // Basic validation to ensure we have an array.
    if (Array.isArray(list)) {
        return list;
    }
    // If data is not in the expected format, log it but don't delete.
    console.warn('Shopping list data in localStorage is not a valid array:', listJson);
    return [];
  } catch (error) {
    console.error("Error parsing shopping list from localStorage. Data might be corrupted.", error);
    // Log the corrupted data to help with debugging.
    console.error("Corrupted shopping list data from localStorage:", listJson);
    return [];
  }
};

// Saves the list to localStorage.
export const saveShoppingList = (list: ShoppingListItem[]): void => {
  try {
    localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(list));
  } catch (error) {
    console.error("Error saving shopping list to localStorage", error);
  }
};

// Adds one or more items, avoiding duplicates.
export const addItems = (itemsToAdd: string[]): ShoppingListItem[] => {
  const currentList = getShoppingList();
  const existingItems = new Set(currentList.map(item => item.text.toLowerCase().trim()));
  
  const newItems: ShoppingListItem[] = itemsToAdd
    .filter(item => item.trim() && !existingItems.has(item.toLowerCase().trim()))
    .map(text => ({ text, checked: false }));

  if (newItems.length > 0) {
    const updatedList = [...currentList, ...newItems];
    saveShoppingList(updatedList);
    return updatedList;
  }
  return currentList;
};

// Updates a single item (e.g., toggles its 'checked' state).
export const updateItem = (index: number, updatedItem: ShoppingListItem): ShoppingListItem[] => {
    const currentList = getShoppingList();
    if (index >= 0 && index < currentList.length) {
        currentList[index] = updatedItem;
        saveShoppingList(currentList);
    }
    return currentList;
}

// Removes a single item by its index.
export const removeItem = (index: number): ShoppingListItem[] => {
    const currentList = getShoppingList();
    const updatedList = currentList.filter((_, i) => i !== index);
    saveShoppingList(updatedList);
    return updatedList;
}

// Removes all items from the list.
export const clearAll = (): ShoppingListItem[] => {
    const emptyList: ShoppingListItem[] = [];
    saveShoppingList(emptyList);
    return emptyList;
}

// Removes only the items that have been checked off.
export const clearChecked = (): ShoppingListItem[] => {
    const currentList = getShoppingList();
    const updatedList = currentList.filter(item => !item.checked);
    saveShoppingList(updatedList);
    return updatedList;
}
