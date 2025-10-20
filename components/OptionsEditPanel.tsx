import React, { useState, useEffect, useRef } from 'react';
import { OptionItem, TRADITIONAL_COOKING_METHOD } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface OptionsEditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    mealTypes: OptionItem[],
    cuisineOptions: OptionItem[],
    cookingMethods: OptionItem[],
    capacities: Record<string, number | null>
  ) => void;
  initialMealTypes: OptionItem[];
  initialCuisineOptions: OptionItem[];
  initialCookingMethods: OptionItem[];
  initialCapacities: Record<string, number | null>;
}

const EditableOptionList: React.FC<{
    title: string;
    items: OptionItem[];
    setItems: React.Dispatch<React.SetStateAction<OptionItem[]>>;
    isCookingMethodList?: boolean;
    capacities?: Record<string, number | null>;
    setCapacities?: React.Dispatch<React.SetStateAction<Record<string, number | null>>>;
}> = ({ title, items, setItems, isCookingMethodList = false, capacities, setCapacities }) => {
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const { showNotification } = useNotification();

    const handleDragSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const newItems = [...items];
        const draggedItemContent = newItems.splice(dragItem.current, 1)[0];
        newItems.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setItems(newItems);
    };

    const handleUpdateLabel = (index: number, newLabel: string) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], label: newLabel };
        setItems(newItems);
    };
    
    const handleUpdateCapacity = (value: string, newCapacity: string) => {
        if (!setCapacities) return;
        const capacityNum = parseInt(newCapacity, 10);
        setCapacities(prev => ({
            ...prev,
            [value]: isNaN(capacityNum) || capacityNum <= 0 ? null : capacityNum,
        }));
    };

    const handleDelete = (index: number) => {
        const itemToDelete = items[index];
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);

        if (isCookingMethodList && setCapacities && capacities && capacities.hasOwnProperty(itemToDelete.value)) {
            const newCapacities = { ...capacities };
            delete newCapacities[itemToDelete.value];
            setCapacities(newCapacities);
        }
    };

    const handleAddItem = () => {
        const newLabel = `Új opció ${items.length + 1}`;
        const newValue = `${newLabel.toLowerCase().replace(/ /g, '-')}-${Date.now()}`;
        
        if (items.some(item => item.label.toLowerCase() === newLabel.toLowerCase())) {
            showNotification('Már létezik ilyen nevű opció.', 'info');
            return;
        }

        setItems([...items, { value: newValue, label: newLabel }]);
        if(isCookingMethodList && setCapacities) {
            setCapacities(prev => ({...prev, [newValue]: null }));
        }
    };

    return (
        <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <ul className="space-y-2">
                {items.map((item, index) => (
                    <li
                        key={item.value}
                        draggable
                        onDragStart={() => (dragItem.current = index)}
                        onDragEnter={() => (dragOverItem.current = index)}
                        onDragEnd={handleDragSort}
                        onDragOver={(e) => e.preventDefault()}
                        className="flex items-center gap-2 p-2 bg-white border rounded-md shadow-sm"
                    >
                        <span className="cursor-grab text-gray-400 hover:text-gray-600" aria-label="Elem mozgatása">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M5 3a1 1 0 000 2h10a1 1 0 100-2H5zM5 7a1 1 0 000 2h10a1 1 0 100-2H5zM5 11a1 1 0 000 2h10a1 1 0 100-2H5zM5 15a1 1 0 000 2h10a1 1 0 100-2H5z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            value={item.label}
                            onChange={(e) => handleUpdateLabel(index, e.target.value)}
                            className="flex-grow p-1 border border-gray-300 rounded-md"
                        />
                        {isCookingMethodList && (
                             <input
                                type="number"
                                placeholder="Fő"
                                value={capacities?.[item.value] || ''}
                                onChange={(e) => handleUpdateCapacity(item.value, e.target.value)}
                                className="w-20 p-1 border border-gray-300 rounded-md disabled:bg-gray-100"
                                disabled={item.value === TRADITIONAL_COOKING_METHOD}
                                aria-label={`${item.label} kapacitása`}
                            />
                        )}
                        <button onClick={() => handleDelete(index)} className="text-red-500 hover:text-red-700 p-1" aria-label={`'${item.label}' törlése`}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                    </li>
                ))}
            </ul>
            <button onClick={handleAddItem} className="text-sm font-semibold text-primary-600 hover:text-primary-800">+ Új opció hozzáadása</button>
        </div>
    );
};


const OptionsEditPanel: React.FC<OptionsEditPanelProps> = ({ isOpen, onClose, onSave, initialMealTypes, initialCuisineOptions, initialCookingMethods, initialCapacities }) => {
    const [mealTypes, setMealTypes] = useState<OptionItem[]>([]);
    const [cuisineOptions, setCuisineOptions] = useState<OptionItem[]>([]);
    const [cookingMethods, setCookingMethods] = useState<OptionItem[]>([]);
    const [capacities, setCapacities] = useState<Record<string, number | null>>({});
    
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setMealTypes([...initialMealTypes]);
            setCuisineOptions([...initialCuisineOptions]);
            setCookingMethods([...initialCookingMethods]);
            setCapacities({...initialCapacities});
        }
    }, [isOpen, initialMealTypes, initialCuisineOptions, initialCookingMethods, initialCapacities]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleSave = () => {
        onSave(mealTypes, cuisineOptions, cookingMethods, capacities);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="options-editor-title"
            onClick={onClose}
        >
            <div
                ref={modalRef}
                className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="options-editor-title" className="text-2xl font-bold text-primary-800 mb-4 flex-shrink-0">
                    Opciók Testreszabása
                </h2>
                <div className="overflow-y-auto space-y-6 pr-2 -mr-2">
                    <EditableOptionList
                        title="Étkezés típusok"
                        items={mealTypes}
                        setItems={setMealTypes}
                    />
                    <EditableOptionList
                        title="Nemzetközi konyhák"
                        items={cuisineOptions}
                        setItems={setCuisineOptions}
                    />
                    <EditableOptionList
                        title="Elkészítés módja"
                        items={cookingMethods}
                        setItems={setCookingMethods}
                        isCookingMethodList={true}
                        capacities={capacities}
                        setCapacities={setCapacities}
                    />
                </div>
                <div className="mt-6 flex justify-end gap-3 border-t pt-4 flex-shrink-0">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">
                        Mégse
                    </button>
                    <button onClick={handleSave} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700">
                        Mentés
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OptionsEditPanel;