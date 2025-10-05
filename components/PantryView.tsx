import React, { useState, useRef, useMemo, useEffect } from 'react';
import { PantryItem, Favorites, BackupData, ShoppingListItem, PantryLocation, PANTRY_LOCATIONS, StorageType } from '../types';
import { useNotification } from '../contexts/NotificationContext';

// Modal for editing a pantry item
const EditPantryItemModal: React.FC<{
  item: PantryItem;
  onClose: () => void;
  onSave: (updatedItem: PantryItem) => void;
}> = ({ item, onClose, onSave }) => {
  const [text, setText] = useState(item.text);
  const [quantity, setQuantity] = useState(item.quantity || '');
  const [dateAdded, setDateAdded] = useState(item.dateAdded || new Date().toISOString().split('T')[0]);
  const [isDateUnknown, setIsDateUnknown] = useState(item.dateAdded === null);
  const [storageType, setStorageType] = useState(item.storageType);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    if (text.trim()) {
      onSave({ 
        text: text.trim(), 
        quantity: quantity.trim(), 
        dateAdded: isDateUnknown ? null : dateAdded, 
        storageType 
      });
    }
  };
  
  const storageTypeOptions = [
    { value: StorageType.PANTRY, label: "Kamra" },
    { value: StorageType.REFRIGERATOR, label: "Hűtő" },
    { value: StorageType.FREEZER, label: "Fagyasztó" },
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog" aria-modal="true" aria-labelledby="edit-item-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-item-title" className="text-xl font-bold text-gray-800 mb-4">Tétel szerkesztése</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-text" className="block text-sm font-medium text-gray-700">Név</label>
            <input id="edit-text" type="text" value={text} onChange={(e) => setText(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
          </div>
          <div>
            <label htmlFor="edit-quantity" className="block text-sm font-medium text-gray-700">Mennyiség (opcionális)</label>
            <input id="edit-quantity" type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Pl. 2 kg, 500g, 1 doboz" className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
          </div>
          <div>
            <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700">Betárolás dátuma</label>
            <input id="edit-date" type="date" value={dateAdded} onChange={(e) => setDateAdded(e.target.value)} disabled={isDateUnknown} className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100"/>
             <label className="flex items-center mt-2">
                <input type="checkbox" checked={isDateUnknown} onChange={(e) => setIsDateUnknown(e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"/>
                <span className="ml-2 text-sm text-gray-600">Ismeretlen dátum</span>
            </label>
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700">Tárolás helye</span>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                {storageTypeOptions.map(option => (
                    <label key={option.value} className="inline-flex items-center">
                        <input type="radio" name="storageType" value={option.value} checked={storageType === option.value} onChange={() => setStorageType(option.value)} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"/>
                        <span className="ml-2 text-gray-700">{option.label}</span>
                    </label>
                ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Mégse</button>
          <button onClick={handleSave} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700">Mentés</button>
        </div>
      </div>
    </div>
  );
};

interface PantryViewProps {
  pantry: Record<PantryLocation, PantryItem[]>;
  favorites: Favorites;
  shoppingList: ShoppingListItem[];
  onAddItems: (items: string[], location: PantryLocation, date: string | null, storageType: StorageType) => void;
  onUpdateItem: (index: number, updatedItem: PantryItem, location: PantryLocation) => void;
  onRemoveItem: (index: number, location: PantryLocation) => void;
  onClearAll: (location: PantryLocation) => void;
  onMoveCheckedToPantryRequest: () => void;
  onGenerateFromPantryRequest: () => void;
  onImportData: (data: Partial<BackupData>) => void;
  shoppingListItems: ShoppingListItem[];
}

const PantryView: React.FC<PantryViewProps> = ({
  pantry,
  favorites,
  shoppingList,
  onAddItems,
  onUpdateItem,
  onRemoveItem,
  onClearAll,
  onMoveCheckedToPantryRequest,
  onGenerateFromPantryRequest,
  onImportData,
  shoppingListItems,
}) => {
  const [newItemText, setNewItemText] = useState('');
  const [newItemDate, setNewItemDate] = useState(new Date().toISOString().split('T')[0]);
  const [isNewItemDateUnknown, setIsNewItemDateUnknown] = useState(false);
  const [newItemStorageType, setNewItemStorageType] = useState<StorageType>(StorageType.PANTRY);
  const [activeTab, setActiveTab] = useState<PantryLocation>('Tiszadada');
  const [editingItem, setEditingItem] = useState<{ item: PantryItem; index: number } | null>(null);

  const [expandedGroups, setExpandedGroups] = useState<Record<StorageType, boolean>>({
    [StorageType.FREEZER]: true,
    [StorageType.REFRIGERATOR]: true,
    [StorageType.PANTRY]: true,
  });

  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groupedItems = useMemo(() => {
    const groups: Record<StorageType, PantryItem[]> = {
      [StorageType.FREEZER]: [],
      [StorageType.REFRIGERATOR]: [],
      [StorageType.PANTRY]: [],
    };
    const currentList = pantry[activeTab] || [];
    currentList.forEach(item => {
      const storageType = item.storageType || StorageType.PANTRY; // Fallback for old data
      groups[storageType].push(item);
    });
    // Sort within groups by date (nulls first, then oldest)
    Object.values(groups).forEach(group => group.sort((a, b) => {
        if (a.dateAdded === null && b.dateAdded !== null) return -1;
        if (a.dateAdded !== null && b.dateAdded === null) return 1;
        if (a.dateAdded === null && b.dateAdded === null) return 0;
        return new Date(a.dateAdded!).getTime() - new Date(b.dateAdded!).getTime();
    }));
    return groups;
  }, [pantry, activeTab]);

  const storageTypeLabels: Record<StorageType, { label: string; icon: string }> = {
    [StorageType.FREEZER]: { label: "Fagyasztó", icon: "❄️" },
    [StorageType.REFRIGERATOR]: { label: "Hűtő", icon: "🧊" },
    [StorageType.PANTRY]: { label: "Kamra", icon: "🥫" },
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemText.trim()) {
      const itemsToAdd = newItemText.split(',').map(item => item.trim()).filter(Boolean);
      if (itemsToAdd.length > 0) {
        onAddItems(itemsToAdd, activeTab, isNewItemDateUnknown ? null : newItemDate, newItemStorageType);
        setNewItemText('');
      }
    }
  };

  const handleUpdateItem = (index: number, updatedItem: PantryItem) => {
    onUpdateItem(index, updatedItem, activeTab);
    setEditingItem(null);
    showNotification("Tétel sikeresen frissítve!", "success");
  };

  const handleExport = async () => {
    try {
      const dataToSave: BackupData = { favorites, shoppingList, pantry };
      const jsonString = JSON.stringify(dataToSave, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().split(' ')[0].substring(0, 5).replace(':', '-');
      const suggestedName = `konyhamiki_mentes_${date}_${time}.json`;

      if ('showSaveFilePicker' in window && window.self === window.top) {
        // ... (code omitted for brevity, it's unchanged)
      } else {
        // ... (code omitted for brevity, it's unchanged)
      }
    } catch (error: any) {
        showNotification('Hiba történt az adatok mentése közben.', 'info');
    }
  };

  const handleImportClick = () => { fileInputRef.current?.click(); };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // ... (code omitted for brevity, it's unchanged)
  };
  
  // FIX: Explicitly type `l` to `PantryItem[]` to resolve type error when accessing `.length`.
  const hasAnyData = Object.keys(favorites).length > 0 || shoppingList.length > 0 || Object.values(pantry).some((l: PantryItem[]) => l.length > 0);
  const checkedShoppingListItems = shoppingListItems.filter(item => item.checked).length;
  // FIX: This calculation was causing a type error due to complex inference. It's replaced with a simpler, equivalent calculation.
  const totalItemsInCurrentTab = (pantry[activeTab] || []).length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800">Kamra</h2>
      
      <div className="flex border-b border-gray-200">
        {PANTRY_LOCATIONS.map(location => (
          <button key={location} onClick={() => setActiveTab(location)} className={`-mb-px py-3 px-4 font-semibold text-sm sm:text-base transition-colors ${activeTab === location ? 'border-l border-t border-r rounded-t-lg bg-white text-primary-600' : 'border-b text-gray-500 hover:text-primary-600'}`}>
            Kamra {location}
          </button>
        ))}
      </div>
      
      <form onSubmit={handleAddItem} className="space-y-4 p-4 border rounded-lg bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-2">
            <input type="text" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="Új tétel (pl. liszt, cukor)..." className="flex-grow p-3 bg-white text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500" aria-label="Új kamra tétel"/>
            <button type="submit" className="bg-primary-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-primary-700 h-full">Hozzáad</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="item-date" className="block text-sm font-medium text-gray-700 mb-1">Betárolás dátuma</label>
                <input type="date" id="item-date" value={newItemDate} onChange={(e) => setNewItemDate(e.target.value)} disabled={isNewItemDateUnknown} className="w-full p-2 bg-white border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100"/>
                <label className="flex items-center mt-2">
                    <input type="checkbox" checked={isNewItemDateUnknown} onChange={(e) => setIsNewItemDateUnknown(e.target.checked)} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"/>
                    <span className="ml-2 text-sm text-gray-600">Ismeretlen dátum</span>
                </label>
            </div>
            <div>
                <span className="block text-sm font-medium text-gray-700 mb-1">Tárolás helye</span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                    {[StorageType.PANTRY, StorageType.REFRIGERATOR, StorageType.FREEZER].map(type => (
                        <label key={type} className="inline-flex items-center">
                            <input type="radio" name="newItemStorageType" value={type} checked={newItemStorageType === type} onChange={() => setNewItemStorageType(type)} className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"/>
                            <span className="ml-2 text-gray-700">{storageTypeLabels[type].label}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
      </form>

      {totalItemsInCurrentTab > 0 ? (
        <div className="space-y-4">
            {/* FIX: Explicitly type the destructured `items` to `PantryItem[]` to resolve errors on `.length` and `.map`. */}
            {Object.entries(groupedItems).map(([storageType, items]: [string, PantryItem[]]) => {
                if (items.length === 0) return null;
                const type = storageType as StorageType;
                const isExpanded = expandedGroups[type];

                return (
                <div key={type} className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <button onClick={() => setExpandedGroups(prev => ({...prev, [type]: !prev[type]}))} className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{storageTypeLabels[type].icon}</span>
                            <span className="font-bold text-lg text-primary-700">{storageTypeLabels[type].label}</span>
                            <span className="text-sm bg-primary-100 text-primary-800 font-semibold px-2 py-0.5 rounded-full">{items.length} tétel</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isExpanded && (
                    <ul className="divide-y divide-gray-200 bg-white p-2">
                        {items.map((item) => {
                             const originalIndex = (pantry[activeTab] || []).findIndex(p => p === item);
                             return (
                                <li key={originalIndex} className="flex items-center justify-between p-3 gap-2">
                                    <div>
                                        <span className="font-medium text-gray-800">{item.text}{item.quantity ? ` (${item.quantity})` : ''}</span>
                                        <span className="block text-xs text-gray-500">
                                            Betárolva: {item.dateAdded ? new Date(item.dateAdded).toLocaleDateString('hu-HU') : 'Ismeretlen dátum'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => setEditingItem({ item, index: originalIndex })} className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100" aria-label={`'${item.text}' szerkesztése`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        </button>
                                        <button onClick={() => onRemoveItem(originalIndex, activeTab)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100" aria-label={`'${item.text}' törlése`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </li>
                             );
                        })}
                    </ul>
                    )}
                </div>
                );
            })}
            <div className="pt-4 flex flex-col sm:flex-row gap-2 justify-end flex-wrap">
                <button onClick={onMoveCheckedToPantryRequest} disabled={checkedShoppingListItems === 0} className="text-sm bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed">Kipipáltak áthelyezése ide ({checkedShoppingListItems})</button>
                <button onClick={() => onClearAll(activeTab)} className="text-sm bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors">Kamra ({activeTab}) ürítése</button>
            </div>
        </div>
      ) : (
        <div className="text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">A(z) {activeTab} kamrád üres</h3>
            <p className="mt-1 text-sm text-gray-500">Add hozzá a meglévő alapanyagaidat.</p>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-dashed">
        <h3 className="text-lg font-bold text-center text-gray-700 mb-4">Receptötletek a kamrából</h3>
         <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* FIX: Explicitly type `l` to `PantryItem[]` to resolve type error when accessing `.length`. */}
            <button onClick={onGenerateFromPantryRequest} disabled={Object.values(pantry).every((l: PantryItem[]) => l.length === 0)} className="flex-1 bg-green-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">Meglepetés recept</button>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200">
        <h3 className="text-lg font-bold text-center text-gray-700 mb-4">Adatkezelés</h3>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={handleExport} disabled={!hasAnyData} className="flex-1 bg-blue-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-gray-400">Mentés Fájlba</button>
            <button onClick={handleImportClick} className="flex-1 bg-green-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-green-700">Betöltés Fájlból</button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" aria-hidden="true" />
        </div>
         <p className="text-xs text-center text-gray-500 mt-3">A betöltés összefésüli a meglévő adatokat az újonnan betöltöttekkel.</p>
      </div>

      {editingItem && (
        <EditPantryItemModal
          item={editingItem.item}
          onClose={() => setEditingItem(null)}
          onSave={(updatedItem) => handleUpdateItem(editingItem.index, updatedItem)}
        />
      )}
    </div>
  );
};

export default PantryView;