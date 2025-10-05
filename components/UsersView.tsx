import React, { useState, useRef } from 'react';
import { UserProfile, BackupData, Favorites, PantryItem, PantryLocation, ShoppingListItem, OptionItem } from '../types';
import UserEditModal from './UserEditModal';
import { useNotification } from '../contexts/NotificationContext';

interface UsersViewProps {
  users: UserProfile[];
  onSaveUser: (user: UserProfile) => void;
  onDeleteUser: (userId: string) => void;
  favorites: Favorites;
  shoppingList: ShoppingListItem[];
  pantry: Record<PantryLocation, PantryItem[]>;
  onImportData: (data: BackupData) => void;
  mealTypes: OptionItem[];
  cuisineOptions: OptionItem[];
  cookingMethodsList: OptionItem[];
  cookingMethodCapacities: Record<string, number | null>;
  orderedCuisineOptions: OptionItem[];
  orderedCookingMethods: OptionItem[];
}

const UsersView: React.FC<UsersViewProps> = ({ 
  users, 
  onSaveUser, 
  onDeleteUser, 
  favorites, 
  shoppingList, 
  pantry, 
  onImportData,
  mealTypes,
  cuisineOptions,
  cookingMethodsList,
  cookingMethodCapacities,
  orderedCuisineOptions,
  orderedCookingMethods,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotification();

  const handleAddNew = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleSave = (user: UserProfile | Omit<UserProfile, 'id'>) => {
    // A type guard here would be safer, but for now, we assume the modal provides the correct shape.
    onSaveUser(user as UserProfile);
    setIsModalOpen(false);
  };
  
  const handleExport = async () => {
    try {
      const dataToSave: BackupData = {
        favorites,
        shoppingList,
        pantry,
        users,
        mealTypes,
        cuisineOptions,
        cookingMethods: cookingMethodsList,
        cookingMethodCapacities,
        cuisineOptionsOrder: orderedCuisineOptions.map(item => item.value),
        cookingMethodsOrder: orderedCookingMethods.map(item => item.value),
      };
      const jsonString = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-');
      const suggestedName = `konyhamiki_mentes_${date}_${time}.json`;

      const isPickerSupported = 'showSaveFilePicker' in window;
      const isTopFrame = window.self === window.top;

      if (isPickerSupported && isTopFrame) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName,
            types: [{
              description: 'JSON Fájl',
              accept: { 'application/json': ['.json'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          showNotification('Adatok sikeresen mentve!', 'success');
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.error("Hiba a mentés során (File Picker):", err);
            showNotification('Hiba történt az adatok mentése közben.', 'info');
          }
        }
      } else {
        if (!isPickerSupported) {
          showNotification('A böngészője nem támogatja a "Mentés másként" funkciót, ezért a fájl közvetlenül letöltésre kerül.', 'info');
        } else if (!isTopFrame) {
          showNotification('A böngésző biztonsági korlátozásai miatt a fájl közvetlenül letöltésre kerül.', 'info');
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Hiba a mentés során:", error);
      showNotification('Hiba történt az adatok mentése közben.', 'info');
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
    reader.onerror = () => {
        showNotification('Hiba történt a fájl olvasása közben.', 'info');
    };
    reader.onloadend = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    reader.readAsText(file);
  };
  
  const hasAnyData = Object.keys(favorites).length > 0 || shoppingList.length > 0 || Object.values(pantry).some((l: PantryItem[]) => l.length > 0) || users.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-center text-primary-800">Felhasználói Profilok</h2>
        <button
          onClick={handleAddNew}
          className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition"
        >
          Új felhasználó
        </button>
      </div>

      {users.length > 0 ? (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="p-4 border rounded-lg bg-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-grow">
                <h3 className="font-bold text-lg text-gray-800">{user.name}</h3>
                <div className="text-sm mt-2 space-y-1">
                    <p><strong className="text-green-700">Ízlés:</strong> {user.likes || <span className="text-gray-400">nincs megadva</span>}</p>
                    <p><strong className="text-yellow-700">Nem szeretem:</strong> {user.dislikes || <span className="text-gray-400">nincs megadva</span>}</p>
                    <p><strong className="text-red-700">Tiltott (allergia):</strong> {user.allergies || <span className="text-gray-400">nincs megadva</span>}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEdit(user)}
                  className="bg-blue-100 text-blue-800 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                >
                  Szerkesztés
                </button>
                <button
                  onClick={() => onDeleteUser(user.id)}
                  className="bg-red-100 text-red-800 font-semibold py-2 px-4 rounded-lg hover:bg-red-200 transition-colors text-sm"
                >
                  Törlés
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.995 5.995 0 0112 12a5.995 5.995 0 01-3 5.197" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nincsenek felhasználók</h3>
            <p className="mt-1 text-sm text-gray-500">Adjon hozzá egy új felhasználót a preferenciák mentéséhez.</p>
        </div>
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

      {isModalOpen && (
        <UserEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          userToEdit={editingUser}
        />
      )}
    </div>
  );
};

export default UsersView;
