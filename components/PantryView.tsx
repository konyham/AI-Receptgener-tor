import React, { useState, useRef } from 'react';
import { PantryItem, Favorites, BackupData, ShoppingListItem } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface PantryViewProps {
  list: PantryItem[];
  favorites: Favorites;
  shoppingList: ShoppingListItem[];
  onAddItems: (items: string[]) => void;
  onUpdateItem: (index: number, updatedItem: PantryItem) => void;
  onRemoveItem: (index: number) => void;
  onClearAll: () => void;
  onMoveCheckedToPantry: () => void;
  onImportData: (data: BackupData) => void;
  shoppingListItems: ShoppingListItem[];
}

const PantryView: React.FC<PantryViewProps> = ({
  list,
  favorites,
  shoppingList,
  onAddItems,
  onUpdateItem,
  onRemoveItem,
  onClearAll,
  onMoveCheckedToPantry,
  onImportData,
  shoppingListItems,
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

  const handleExport = async () => {
    try {
      const dataToSave: BackupData = { favorites, shoppingList, pantry: list };
      const jsonString = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-');
      const suggestedName = `konyhamiki_mentes_${date}_${time}.json`;

      if ('showSaveFilePicker' in window && window.self === window.top) {
        try {
            const handle = await window.showSaveFilePicker({ suggestedName, types: [{ description: 'JSON Fájl', accept: { 'application/json': ['.json'] } }] });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            showNotification('Adatok sikeresen mentve!', 'success');
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Hiba a mentés során:", err);
                showNotification('Hiba történt az adatok mentése közben.', 'info');
            }
        }
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
    } catch (error: any) {
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
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        onImportData(data);
      } catch (error) {
        showNotification('Hiba a fájl feldolgozása közben.', 'info');
      }
    };
    reader.onloadend = () => { if (fileInputRef.current) fileInputRef.current.value = ''; };
    reader.readAsText(file);
  };
  
  const hasAnyData = Object.keys(favorites).length > 0 || shoppingList.length > 0 || list.length > 0;
  const checkedShoppingListItems = shoppingListItems.filter(item => item.checked).length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800">Kamra</h2>
      
      <form onSubmit={handleAddItem} className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Új tétel (pl. liszt, cukor)..."
          className="flex-grow p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500"
          aria-label="Új kamra tétel"
        />
        <button type="submit" className="bg-primary-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-primary-700">Hozzáad</button>
      </form>

      {list.length > 0 ? (
        <div className="space-y-2">
            <ul className="divide-y divide-gray-200">
                {list.map((item, index) => (
                <li key={index} className="flex items-center justify-between p-3">
                    <span className="font-medium text-gray-800">{item.text}</span>
                    <button onClick={() => onRemoveItem(index)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100" aria-label={`'${item.text}' törlése`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </button>
                </li>
                ))}
            </ul>
            <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-end flex-wrap">
                 <button onClick={onMoveCheckedToPantry} disabled={checkedShoppingListItems === 0} className="text-sm bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed">
                    Kipipáltak áthelyezése ide ({checkedShoppingListItems})
                </button>
                <button onClick={onClearAll} className="text-sm bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors">Teljes kamra ürítése</button>
            </div>
        </div>
      ) : (
        <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">A kamrád üres</h3>
            <p className="mt-1 text-sm text-gray-500">Add hozzá a meglévő alapanyagaidat.</p>
        </div>
      )}

      <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200">
        <h3 className="text-lg font-bold text-center text-gray-700 mb-4">Adatkezelés</h3>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={handleExport} disabled={!hasAnyData} className="flex-1 bg-blue-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-gray-400">Mentés Fájlba</button>
            <button onClick={handleImportClick} className="flex-1 bg-green-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-green-700">Betöltés Fájlból</button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" aria-hidden="true" />
        </div>
         <p className="text-xs text-center text-gray-500 mt-3">A betöltés összefésüli a meglévő adatokat az újonnan betöltöttekkel.</p>
      </div>
    </div>
  );
};

export default PantryView;
