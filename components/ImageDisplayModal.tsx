import React, { useEffect, useRef } from 'react';

interface ImageDisplayModalProps {
  imageUrl: string;
  recipeName: string;
  onClose: () => void;
}

const ImageDisplayModal: React.FC<ImageDisplayModalProps> = ({ imageUrl, recipeName, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (modalRef.current && event.target === modalRef.current) {
            onClose();
        }
    };

    const safeFilename = recipeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  return (
    <div
        ref={modalRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-title"
    >
      <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-3xl text-center relative mx-4">
        <h2 id="image-title" className="text-xl font-bold text-gray-800 mb-3">{recipeName} - Ételfotó</h2>
        <img
            src={imageUrl}
            alt={`Generált ételfotó a következő receptről: ${recipeName}`}
            className="w-full rounded-lg aspect-auto max-h-[70vh] object-contain"
        />
        <div className="mt-4 flex flex-col sm:flex-row justify-center gap-3">
             <a
                href={imageUrl}
                download={`${safeFilename}_etelfoto.jpeg`}
                className="flex-1 bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.293a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Letöltés
            </a>
            <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
                Bezárás
            </button>
        </div>
        
      </div>
    </div>
  );
};

export default ImageDisplayModal;