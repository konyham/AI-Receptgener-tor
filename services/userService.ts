import type { UserProfile } from '../types';
import { safeSetLocalStorage } from '../utils/storage';

const USERS_KEY = 'ai-recipe-generator-users';

const getDefaultUsers = (): UserProfile[] => [
    {
        id: 'user_1',
        name: 'Konyha Miklós',
        likes: 'csípős ételek, hús, fokhagyma',
        dislikes: 'kapros ételek, spenót',
        allergies: 'dió, mogyoró',
    },
    {
        id: 'user_2',
        name: 'Konyháné László Márta',
        likes: 'olasz konyha, tenger gyümölcsei, saláták',
        dislikes: 'csípős ételek, vörös húsok',
        allergies: 'laktóz',
    }
];

/**
 * Validates and recovers a raw users array, typically from an import.
 * @param data The raw data to validate.
 * @returns An object with the cleaned users list and an optional recovery notification.
 */
export const validateAndRecover = (data: unknown): { users: UserProfile[]; recoveryNotification?: string } => {
  if (!Array.isArray(data)) {
    return { users: [], recoveryNotification: "Az importált felhasználói lista formátuma érvénytelen volt." };
  }

  let hadCorruptedEntries = false;
  const validUsers: UserProfile[] = [];
  
  data.forEach((user: any, index: number) => {
    if (
        typeof user === 'object' && user !== null &&
        typeof user.id === 'string' &&
        typeof user.name === 'string' &&
        typeof user.likes === 'string' &&
        typeof user.dislikes === 'string' &&
        typeof user.allergies === 'string'
    ) {
      validUsers.push(user);
    } else {
      console.warn(`Skipping corrupted user during import at index ${index}.`, user);
      hadCorruptedEntries = true;
    }
  });

  return {
    users: validUsers,
    recoveryNotification: hadCorruptedEntries ? 'Néhány sérült felhasználói profilt kihagytunk az importálás során.' : undefined
  };
};

/**
 * Retrieves the users array from localStorage.
 * If not found, initializes with default users.
 * @returns An object containing the users list and an optional recovery notification.
 */
export const getUsers = (): { users: UserProfile[]; recoveryNotification?: string } => {
  const usersJson = localStorage.getItem(USERS_KEY);
  if (!usersJson) {
      const defaultUsers = getDefaultUsers();
      saveUsers(defaultUsers);
      return { users: defaultUsers };
  }

  let parsedData: any;
  try {
    parsedData = JSON.parse(usersJson);
  } catch (error) {
    console.error("Fatal JSON parsing error for users. Backing up corrupted data.", error);
    localStorage.setItem(`${USERS_KEY}_corrupted_${Date.now()}`, usersJson);
    throw new Error('A felhasználói lista súlyosan sérült, ezért nem sikerült betölteni. A sérült adatokról biztonsági mentés készült.');
  }
  
  const { users, recoveryNotification } = validateAndRecover(parsedData);

  if (recoveryNotification) {
      console.log("Saving cleaned users list back to localStorage.");
      saveUsers(users);
  }

  return { users, recoveryNotification };
};

/**
 * Saves the entire users array to localStorage.
 * @param users The users array to save.
 */
export const saveUsers = (users: UserProfile[]): void => {
  safeSetLocalStorage(USERS_KEY, users);
};

/**
 * Merges imported users into the current ones, updating existing users and adding new ones.
 * @param currentUsers The existing users array.
 * @param importedUsers The array from the imported file.
 * @returns An object with the merged list and the count of new users added.
 */
export const mergeUsers = (currentUsers: UserProfile[], importedUsers: UserProfile[]): { mergedUsers: UserProfile[]; newItemsCount: number } => {
  // Use a Map to handle both adding new users and updating existing ones based on their unique ID.
  const userMap = new Map<string, UserProfile>();

  // First, populate the map with the current users.
  currentUsers.forEach(user => {
    userMap.set(user.id, user);
  });

  let newItemsCount = 0;

  // Now, iterate through the imported users.
  importedUsers.forEach(importedUser => {
    // If the user doesn't already exist, it's a new item.
    if (!userMap.has(importedUser.id)) {
      newItemsCount++;
    }
    // Add the imported user to the map. This will either add a new entry
    // or overwrite an existing one with the same ID, effectively updating it.
    userMap.set(importedUser.id, importedUser);
  });
  
  // Convert the map's values back into an array for the final result.
  const mergedUsers = Array.from(userMap.values());

  return { mergedUsers, newItemsCount };
};

/**
 * Adds a new user to the list with a unique ID.
 * @param currentUsers The current list of users from the app's state.
 * @param user The user data to add (without an ID).
 * @returns The updated users array.
 */
export const addUser = (currentUsers: UserProfile[], user: Omit<UserProfile, 'id'>): UserProfile[] => {
  const newUser: UserProfile = {
    ...user,
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  };
  const updatedUsers = [...currentUsers, newUser];
  saveUsers(updatedUsers);
  return updatedUsers;
};

/**
 * Updates an existing user in the list.
 * @param currentUsers The current list of users from the app's state.
 * @param updatedUser The user with updated data.
 * @returns The updated users array.
 */
export const updateUser = (currentUsers: UserProfile[], updatedUser: UserProfile): UserProfile[] => {
    const userIndex = currentUsers.findIndex(u => u.id === updatedUser.id);
    if (userIndex !== -1) {
        const updatedUsers = [...currentUsers]; // Create a copy for immutability
        updatedUsers[userIndex] = updatedUser;
        saveUsers(updatedUsers);
        return updatedUsers;
    }
    // Return original list if user to update is not found, to prevent data loss.
    return currentUsers;
};

/**
 * Deletes a user from the list by their ID.
 * @param currentUsers The current list of users from the app's state.
 * @param userId The ID of the user to delete.
 * @returns The updated users array.
 */
export const deleteUser = (currentUsers: UserProfile[], userId: string): UserProfile[] => {
    const updatedUsers = currentUsers.filter(u => u.id !== userId);
    saveUsers(updatedUsers);
    return updatedUsers;
};