import React, { useEffect, useRef } from 'react';

interface ShareFallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  textToCopy: string;
}

const ShareFallbackModal: React.FC<ShareFallbackModalProps> = ({ isOpen, onClose, textToCopy }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.select();
      textareaRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="share-fallback-title">
      <div className="bg-white rounded-2xl shadow-xl p-6 m-4 w-full max-w-lg">
        <h2 id="share-fallback-title" className="text-xl font-bold text-primary-800 mb-2">Recept manuális másolása</h2>
        <p className="text-gray-600 mb-4">A böngészője nem támogatja az automatikus másolást. Kérjük, jelölje ki a szöveget és használja a <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Ctrl+C</kbd> (vagy <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Cmd+C</kbd>) billentyűkombinációt.</p>
        
        <textarea
          ref={textareaRef}
          readOnly
          value={textToCopy}
          className="w-full h-64 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Recept szövege"
        />

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors">
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareFallbackModal;
