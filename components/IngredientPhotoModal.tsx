
import React, { useRef, useState, useEffect } from 'react';

interface IngredientPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcess: (file: File) => Promise<string[]>;
  onAccept: (ingredients: string[]) => void;
}

const IngredientPhotoModal: React.FC<IngredientPhotoModalProps> = ({ isOpen, onClose, onProcess, onAccept }) => {
  const [step, setStep] = useState<'upload' | 'processing' | 'edit'>('upload');
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setRecognizedText('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStep('processing');
    setError(null);

    try {
      // Várunk egy kicsit, hogy a rendszer befejezze az UI frissítést
      await new Promise(res => setTimeout(res, 300));
      const identified = await onProcess(file);
      if (identified.length === 0) {
          setError("Nem sikerült alapanyagokat felismerni a képen. Kérjük, próbálja újra egy jobb minőségű fotóval, vagy gépelje be őket.");
          setStep('upload');
      } else {
          setRecognizedText(identified.join(', '));
          setStep('edit');
      }
    } catch (err: any) {
      setError(err.message || "Hiba történt a kép feldolgozása közben.");
      setStep('upload');
    }

    // Reset input value to allow re-selection
    if (event.target) event.target.value = '';
  };

  const handleAccept = () => {
    const list = recognizedText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    onAccept(list);
    onClose();
  };

  if (!isOpen) return null;

  // Stílus a rejtett inputhoz
  const hiddenInputStyle: React.CSSProperties = {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0,0,0,0)',
      border: '0',
      opacity: 0,
      pointerEvents: 'none'
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ingredient-photo-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 m-4 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="ingredient-photo-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Alapanyagok felismerése fotóról
        </h2>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-800">
                <p className="text-primary-800 dark:text-primary-200 font-semibold mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Javasolt módszer a legjobb eredményért:
                </p>
                <ol className="text-sm text-primary-700 dark:text-primary-300 list-decimal list-inside space-y-1">
                    <li>Készítsen fotót az alapanyagokról a telefonja <strong>saját kamera alkalmazásával</strong>.</li>
                    <li>Lépjen vissza ide, és kattintson a <strong>"Kép betöltése"</strong> gombra.</li>
                    <li>Válassza ki az imént készített fotót a galériából.</li>
                </ol>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                    {error}
                </div>
            )}

            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-primary-600 text-white font-bold py-4 px-4 rounded-lg shadow-md hover:bg-primary-700 flex flex-col items-center justify-center gap-2 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Kép betöltése a galériából
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileSelect}
              style={hiddenInputStyle}
              aria-hidden="true"
            />
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center p-10 space-y-4">
            <svg className="animate-spin h-12 w-12 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Alapanyagok beazonosítása...</p>
            <p className="text-sm text-gray-500 text-center">Ez eltarthat pár másodpercig.</p>
          </div>
        )}

        {step === 'edit' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
                Az AI a következőket ismerte fel. Kérjük, javítsa ki a hibákat vagy adjon hozzá továbbiakat vesszővel elválasztva:
            </p>
            <textarea
                value={recognizedText}
                onChange={(e) => setRecognizedText(e.target.value)}
                rows={5}
                className="w-full p-3 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 font-medium"
                placeholder="Alapanyagok listája..."
                autoFocus
            />
            <div className="flex gap-3">
                 <button
                    onClick={() => setStep('upload')}
                    className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    Új kép választása
                </button>
                <button
                    onClick={handleAccept}
                    className="flex-1 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors"
                >
                    Hozzáadás az űrlaphoz
                </button>
            </div>
          </div>
        )}

        <div className="mt-4 border-t dark:border-gray-700 pt-4 flex justify-end">
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 font-semibold hover:underline">
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientPhotoModal;
