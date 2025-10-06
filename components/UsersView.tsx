
import React, { useState, useRef } from 'react';
import { UserProfile, BackupData, Favorites, PantryItem, PantryLocation, ShoppingListItem, OptionItem } from '../types';
import UserEditModal from './UserEditModal';
import { useNotification } from '../contexts/NotificationContext';
import * as imageStore from '../services/imageStore';

interface UsersViewProps {
  users: UserProfile[];
  onSaveUser: (user: UserProfile | Omit<UserProfile, 'id'>) => void;
  onDeleteUser: (userId: string) => void;
  favorites: Favorites;
  pantry: Record<PantryLocation, PantryItem[]>;
  shoppingList: ShoppingListItem[];
  onImportData: (data: BackupData) => void;
  mealTypes: OptionItem[];
  cuisineOptions: OptionItem[];
  cookingMethodsList: OptionItem[];
  cookingMethodCapacities: Record<string, number | null>;
  orderedMealTypes: OptionItem[];
  orderedCuisineOptions: OptionItem[];
  orderedCookingMethods: OptionItem[];
}

const UsersView: React.FC<UsersViewProps> = ({
  users,
  onSaveUser,
  onDeleteUser,
  favorites,
  pantry,
  shoppingList,
  onImportData,
  mealTypes,
  cuisineOptions,
  cookingMethodsList,
  cookingMethodCapacities,
  orderedMealTypes,
  orderedCuisineOptions,
  orderedCookingMethods,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddNewUser = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const handleSave = (user: UserProfile | Omit<UserProfile, 'id'>) => {
    onSaveUser(user);
    setIsModalOpen(false);
  };

  const hasAnyData = users.length > 0 || Object.keys(favorites).length > 0 || shoppingList.length > 0 || Object.values(pantry).some((loc: PantryItem[]) => loc.length > 0);

  const handleExport = async () => {
    try {
      const imageIds = new Set<string>();
      for (const category in favorites) {
        for (const recipe of favorites[category]) {
          if (recipe.imageUrl && recipe.imageUrl.startsWith('indexeddb:')) {
            imageIds.add(recipe.imageUrl.substring(10));
          }
          if (recipe.instructions) {
            for (const instruction of recipe.instructions) {
              if (instruction.imageUrl && instruction.imageUrl.startsWith('indexeddb:')) {
                imageIds.add(instruction.imageUrl.substring(10));
              }
            }
          }
        }
      }

      const images: Record<string, string> = {};
      const imagePromises = Array.from(imageIds).map(async (id) => {
        const data = await imageStore.getImage(id);
        if (data) {
          images[id] = data;
        }
      });
      await Promise.all(imagePromises);
      
      const dataToSave: BackupData = {
        favorites,
        shoppingList,
        pantry,
        users,
        images,
        mealTypes,
        cuisineOptions,
        cookingMethods: cookingMethodsList,
        cookingMethodCapacities,
        mealTypesOrder: orderedMealTypes.map(item => item.value),
        cuisineOptionsOrder: orderedCuisineOptions.map(item => item.value),
        cookingMethodsOrder: orderedCookingMethods.map(item => item.value),
      };

      const jsonString = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-');
      const suggestedName = `konyhamiki_mentes_${date}_${time}.json`;

      if ('showSaveFilePicker' in window && window.self === window.top) {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: 'JSON Fájl', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        showNotification('Adatok sikeresen mentve!', 'success');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Hiba a mentés során:", err);
        showNotification('Hiba történt az adatok mentése közben.', 'info');
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const data = JSON.parse(text);
          onImportData(data);
        } else {
           throw new Error('A fájl tartalma nem olvasható szövegként.');
        }
      } catch (error) {
        console.error("Hiba a betöltés során:", error);
        showNotification('Hiba történt a fájl beolvasása vagy feldolgozása közben.', 'info');
      }
    };
    reader.onloadend = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800">Felhasználói Profilok</h2>
      
      <div className="text-center">
        <button
          onClick={handleAddNewUser}
          className="bg-primary-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition"
        >
          Új felhasználó hozzáadása
        </button>
      </div>

      {users.length > 0 ? (
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-primary-700">{user.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleEditUser(user)} className="text-sm font-semibold text-blue-600 hover:text-blue-800 p-1">Szerkesztés</button>
                  <button onClick={() => onDeleteUser(user.id)} className="text-sm font-semibold text-red-600 hover:text-red-800 p-1">Törlés</button>
                </div>
              </div>
              <div className="mt-2 space-y-2 text-sm text-gray-600">
                <p><strong className="font-semibold text-gray-700">Ízlés:</strong> {user.likes || 'Nincs megadva'}</p>
                <p><strong className="font-semibold text-gray-700">Nem szeretem:</strong> {user.dislikes || 'Nincs megadva'}</p>
                <p><strong className="font-semibold text-gray-700">Tiltott (allergia):</strong> {user.allergies || 'Nincs megadva'}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500">Nincsenek felhasználók hozzáadva.</p>
      )}

      <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200">
        <h3 className="text-lg font-bold text-center text-gray-700 mb-4">Adatkezelés</h3>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
                onClick={handleExport}
                disabled={!hasAnyData}
                className="flex-1 bg-blue-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Mentés Fájlba
            </button>
            <button
                onClick={handleImportClick}
                className="flex-1 bg-green-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition"
            >
                Betöltés Fájlból
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
              aria-hidden="true"
            />
        </div>
        <p className="text-xs text-center text-gray-500 mt-3">A betöltés összefésüli a meglévő adatokat az újonnan betöltöttekkel.</p>
      </div>

      <UserEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        userToEdit={userToEdit}
      />
    </div>
  );
};

export default UsersView;