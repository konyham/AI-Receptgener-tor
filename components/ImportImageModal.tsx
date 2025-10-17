import React, { useRef, useEffect } from 'react';

interface ImportImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParse: (file: File) => void;
  isParsing: boolean;
  error: string | null;
}

const ImportImageModal: React.FC<ImportImageModalProps> = ({ isOpen, onClose, onParse, isParsing, error }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && e.target === modalRef.current) {
      onClose();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onParse(file);
    }
    // Reset the input value to allow selecting the same file again
    event.target.value = '';
  };
  
  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-image-title"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="import-image-title" className="text-xl font-bold text-gray-800 mb-4">Recept Importálása Képből</h2>
        
        {isParsing ? (
             <div className="flex flex-col items-center justify-center p-10">
                <svg className="animate-spin h-12 w-12 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-lg text-gray-600">Recept beolvasása a képről...</p>
            </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">Fotózzon le egy receptet (pl. kézzel írott cetlit, szakácskönyvet), vagy töltsön fel egy már meglévő képet a beolvasáshoz.</p>
            
            <div className="space-y-4">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 flex items-center justify-center gap-3"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                    Kép Beolvasása (Fájl/Fotó)
                </button>
                <p className="text-center text-sm text-gray-500 mt-2">Tipp: A gombra kattintva választhat meglévő fájlt, vagy készíthet új fotót a telefon kamerájával.</p>
                
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>

             {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            
            <div className="mt-6 flex justify-end">
              <button onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">
                Mégse
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportImageModal;