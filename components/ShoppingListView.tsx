import React, { useState, useRef } from 'react';
import { ShoppingListItem, BackupData } from '../types';
import * as favoritesService from '../services/favoritesService';
import { useNotification } from '../contexts/NotificationContext';

interface ShoppingListViewProps {
  list: ShoppingListItem[];
  onAddItems: (items: string[]) => void;
  onUpdateItem: (index: number, updatedItem: ShoppingListItem) => void;
  onRemoveItem: (index: number) => void;
  onClearChecked: () => void;
  onClearAll: () => void;
  onImportData: (data: BackupData) => void;
}

const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  list,
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

  const handleExport = () => {
    try {
      const favorites = favoritesService.getFavorites().favorites;
      const dataToExport: BackupData = { favorites, shoppingList: list };
      const jsonData = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `konyha_miki_mentes_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('Adatok sikeresen exportálva!', 'success');
    } catch (err: any) {
      showNotification(`Hiba az exportálás során: ${err.message}`, 'info');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as BackupData;

        if (typeof data.favorites === 'object' && data.favorites !== null && Array.isArray(data.shoppingList)) {
           if (window.confirm('Biztosan importálja az adatokat? Ezzel felülírja a jelenlegi kedvenceit és a bevásárlólistáját.')) {
              onImportData(data);
           }
        } else {
          throw new Error('A fájl formátuma érvénytelen.');
        }
      } catch (error: any) {
        showNotification(`Hiba az importálás során: ${error.message}`, 'info');
      } finally {
        if (event.target) {
            event.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };
  
  const checkedCount = list.filter(item => item.checked).length;

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
      
       <div className="border border-gray-200 rounded-lg shadow-sm p-4 mt-8">
        <h3 className="text-lg font-semibold text-center text-primary-700 mb-3">Adatkezelés</h3>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={handleExport} className="flex-1 text-sm bg-white border border-primary-300 text-primary-700 font-semibold py-2 px-4 rounded-lg hover:bg-primary-50 transition-colors">Mentés fájlba</button>
            <button onClick={handleImportClick} className="flex-1 text-sm bg-white border border-primary-300 text-primary-700 font-semibold py-2 px-4 rounded-lg hover:bg-primary-50 transition-colors">Betöltés fájlból...</button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
        </div>
        <p className="text-xs text-center text-gray-500 mt-2">Mentse el vagy töltse be a kedvenceit és a bevásárlólistáját egyetlen fájlban.</p>
      </div>
    </div>
  );
};

export default ShoppingListView;