
import React, { useEffect, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface ShareFallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  textToCopy: string;
  isUrl?: boolean;
}

const ShareFallbackModal: React.FC<ShareFallbackModalProps> = ({ isOpen, onClose, textToCopy, isUrl = false }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.select();
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const modalElement = modalRef.current;
    
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
        
        if (event.key === 'Tab' && modalElement) {
            const focusableElements = Array.from(modalElement.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )).filter((el: HTMLElement) => el.offsetParent !== null);
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) { // Shift+Tab
                if (document.activeElement === firstElement) {
                    if (lastElement instanceof HTMLElement) {
                        lastElement.focus();
                    }
                    event.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === lastElement) {
                    if (firstElement instanceof HTMLElement) {
                        firstElement.focus();
                    }
                    event.preventDefault();
                }
            }
        }
    };
    
    document.addEventListener('keydown', handleKeyDown);

    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
}, [isOpen, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      showNotification(isUrl ? 'Link a vágólapra másolva!' : 'Recept a vágólapra másolva!', 'success');
    } catch (err) {
      showNotification('A másolás nem sikerült.', 'info');
    }
  };


  if (!isOpen) return null;

  const title = isUrl ? 'Link Másolása' : 'Recept Megosztása';
  const instruction = isUrl 
    ? "A böngészője nem támogatja a natív megosztást. Másolja ki az alábbi linket."
    : "A böngészője nem támogatja a közvetlen alkalmazás-megosztást. Másolja ki a lenti receptet és illessze be az üzenetbe.";

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="share-fallback-title">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 m-4 w-full max-w-lg">
        <h2 id="share-fallback-title" className="text-xl font-bold text-primary-800 dark:text-primary-300 mb-2">{title}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">{instruction}</p>
        
        <textarea
          ref={textareaRef}
          readOnly
          value={textToCopy}
          className={`w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-sans ${isUrl ? 'h-24' : 'h-80'}`}
          aria-label="Megosztandó tartalom"
        />

        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
            {navigator.clipboard && (
                <button onClick={handleCopy} className="flex-1 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
                    Szöveg másolása
                </button>
            )}
          <button onClick={onClose} className="flex-1 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors">
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareFallbackModal;
