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
            )).filter((el: HTMLElement) => el.offsetParent !== null); // Filter for visible elements
            
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
      showNotification(isUrl ? 'Link a vágólapra másolva!' : 'Szöveg a vágólapra másolva!', 'success');
    } catch (err) {
      showNotification('A másolás nem sikerült.', 'info');
    }
  };


  if (!isOpen) return null;

  const title = isUrl ? 'Recept Linkjének Másolása' : 'Recept Manuális Másolása';
  const instruction = isUrl 
    ? "A böngészője nem támogatja a natív megosztást. Másolja ki az alábbi linket és küldje el manuálisan."
    : "A böngészője nem támogatja az automatikus másolást. Kérjük, jelölje ki a szöveget és használja a Ctrl+C (vagy Cmd+C) billentyűkombinációt.";

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="share-fallback-title">
      <div className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-lg">
        <h2 id="share-fallback-title" className="text-xl font-bold text-primary-800 mb-2">{title}</h2>
        <p className="text-gray-600 mb-4">{instruction}</p>
        
        <textarea
          ref={textareaRef}
          readOnly
          value={textToCopy}
          className={`w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${isUrl ? 'h-24' : 'h-64'}`}
          aria-label="Megosztandó tartalom"
        />

        <div className="mt-6 flex justify-end gap-3">
            {navigator.clipboard && (
                <button onClick={handleCopy} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                    Másolás
                </button>
            )}
          <button onClick={onClose} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors">
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareFallbackModal;