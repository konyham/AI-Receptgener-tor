import React from 'react';

interface VoiceFeedbackBubbleProps {
  message: string;
  isProcessing: boolean;
}

const VoiceFeedbackBubble: React.FC<VoiceFeedbackBubbleProps> = ({ message, isProcessing }) => {
  return (
    <div 
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full shadow-lg bg-primary-800 text-white font-semibold transition-all duration-300 ease-in-out"
      role="status"
      aria-live="assertive"
    >
      {isProcessing ? (
        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
            <path d="M5.5 10.5a.5.5 0 01.5-.5h8a.5.5 0 010 1H6a.5.5 0 01-.5-.5z"/>
            <path d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
        </svg>
      )}
      
      <span>
        {message}
        {isProcessing && <span className="ml-2 font-normal opacity-80">Feldolgozás... Várjon...</span>}
      </span>
    </div>
  );
};

export default VoiceFeedbackBubble;
