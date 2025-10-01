import React, { useState, useRef } from 'react';
import { ShoppingListItem, Favorites, BackupData } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface ShoppingListViewProps {
  list: ShoppingListItem[];
  favorites: Favorites;
  onAddItems: (items: string[]) => void;
  onUpdateItem: (index: number, updatedItem: ShoppingListItem) => void;
  onRemoveItem: (index: number) => void;
  onClearChecked: () => void;
  onClearAll: () => void;
  onImportData: (data: BackupData) => void;
}

const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  list,
  favorites,
  onAddItems,
  onUpdateItem,
  onRemoveItem,
  onClearChecked,
  onClearAll,
  onImportData,
}) => {
  const [newItem, setNewItem] = useState('');
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      const itemsToAdd = newItem.split(',').map(item => item.trim()).filter(Boolean);
      if (itemsToAdd.length > 0) {
        onAddItems(itemsToAdd);
        setNewItem('');
      }
    }
  };

  const handleToggleCheck = (index: number) => {
    const item = list[index];
    onUpdateItem(index, { ...item, checked: !item.checked });
  };

  const handleCopyList = async () => {
    if (list.length === 0) {
      showNotification('A lista üres, nincs mit másolni.', 'info');
      return;
    }

    const textToCopy = list.map(item => item.text).join('\n');

    try {
      if (!navigator.clipboard) {
        throw new Error('A vágólap API nem érhető el a böngésződben.');
      }
      await navigator.clipboard.writeText(textToCopy);
      showNotification('Bevásárlólista a vágólapra másolva!', 'success');
    } catch (err) {
      console.error('Hiba a vágólapra másolás közben:', err);
      showNotification('Nem sikerült a listát vágólapra másolni. Lehet, hogy a böngészője nem támogatja ezt a funkciót.', 'info');
    }
  };
  
   const handleExport = async () => {
    try {
      const dataToSave: BackupData = {
        favorites,
        shoppingList: list,
      };
      const jsonString = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const date = new Date().toISOString().split('T')[0];
      const suggestedName = `konyhamiki_mentes_${date}.json`;

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
          // AbortError is thrown when the user cancels the save dialog, which is not a real error.
          if (err.name !== 'AbortError') {
            console.error("Hiba a mentés során (File Picker):", err);
            showNotification('Hiba történt az adatok mentése közben.', 'info');
          }
        }
      } else {
        // Fallback for older browsers or when in an iframe
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
  
  const checkedCount = list.filter(item => item.checked).length;
  const hasAnyData = Object.keys(favorites).length > 0 || list.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800">Bevásárlólista</h2>
      
      <form onSubmit={handleAddItem} className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Új tétel (vesszővel elválasztva)..."
          className="flex-grow p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
          aria-label="Új bevásárlólista tétel"
        />
        <button
          type="submit"
          className="bg-primary-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition"
          aria-label="Tétel hozzáadása"
        >
          Hozzáad
        </button>
      </form>
      
      {list.length > 0 ? (
        <div className="space-y-2">
            <ul className="divide-y divide-gray-200">
                {list.map((item, index) => (
                <li
                    key={index}
                    className="flex items-center justify-between p-3"
                >
                    <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleCheck(index)}
                        className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        aria-labelledby={`item-label-${index}`}
                    />
                    <span id={`item-label-${index}`} className={`font-medium ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {item.text}
                    </span>
                    </label>
                    <button
                    onClick={() => onRemoveItem(index)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                    aria-label={`'${item.text}' törlése`}
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </button>
                </li>
                ))}
            </ul>
            <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-end flex-wrap">
                 <button 
                    onClick={handleCopyList}
                    className="text-sm bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                    Lista másolása
                </button>
                <button 
                    onClick={onClearChecked}
                    disabled={checkedCount === 0}
                    className="text-sm bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors disabled:bg-yellow-300 disabled:cursor-not-allowed"
                >
                    Kipipáltak törlése ({checkedCount})
                </button>
                <button 
                    onClick={onClearAll}
                    className="text-sm bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
                >
                    Teljes lista törlése
                </button>
            </div>
        </div>
      ) : (
        <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">A bevásárlólistád üres</h3>
            <p className="mt-1 text-sm text-gray-500">Adj hozzá tételeket manuálisan, vagy egy recept hozzávalóiból.</p>
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
    </div>
  );
};

export default ShoppingListView;
