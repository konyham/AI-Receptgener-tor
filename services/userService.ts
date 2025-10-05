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
 * Merges imported users into the current ones, avoiding duplicates by ID.
 * @param currentUsers The existing users array.
 * @param importedUsers The array from the imported file.
 * @returns An object with the merged list and the count of new users added.
 */
export const mergeUsers = (currentUsers: UserProfile[], importedUsers: UserProfile[]): { mergedUsers: UserProfile[]; newItemsCount: number } => {
  const newUserList = [...currentUsers];
  let newItemsCount = 0;
  
  const existingUserIds = new Set(currentUsers.map(user => user.id));

  importedUsers.forEach(user => {
    if (!existingUserIds.has(user.id)) {
      newUserList.push(user);
      newItemsCount++;
    }
  });

  return { mergedUsers: newUserList, newItemsCount };
};

/**
 * Adds a new user to the list with a unique ID.
 * @param user The user data to add (without an ID).
 * @returns The updated users array.
 */
export const addUser = (user: Omit<UserProfile, 'id'>): UserProfile[] => {
  const { users } = getUsers();
  const newUser: UserProfile = {
    ...user,
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  };
  const updatedUsers = [...users, newUser];
  saveUsers(updatedUsers);
  return updatedUsers;
};

/**
 * Updates an existing user in the list.
 * @param updatedUser The user with updated data.
 * @returns The updated users array.
 */
export const updateUser = (updatedUser: UserProfile): UserProfile[] => {
    const { users } = getUsers();
    const userIndex = users.findIndex(u => u.id === updatedUser.id);
    if (userIndex !== -1) {
        users[userIndex] = updatedUser;
        saveUsers(users);
    }
    return users;
};

/**
 * Deletes a user from the list by their ID.
 * @param userId The ID of the user to delete.
 * @returns The updated users array.
 */
export const deleteUser = (userId: string): UserProfile[] => {
    const { users } = getUsers();
    const updatedUsers = users.filter(u => u.id !== userId);
    saveUsers(updatedUsers);
    return updatedUsers;
};