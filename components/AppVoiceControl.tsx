import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

type PermissionState = 'prompt' | 'granted' | 'denied' | 'checking';

interface AppVoiceControlProps {
  isSupported: boolean;
  isListening: boolean;
  isProcessing: boolean;
  onClick: () => void;
  permissionState: PermissionState;
  isRateLimited: boolean;
}

const AppVoiceControl: React.FC<AppVoiceControlProps> = ({
  isSupported,
  isListening,
  isProcessing,
  onClick,
  permissionState,
  isRateLimited,
}) => {
  const { t } = useTranslation();
  if (!isSupported) {
    return null;
  }

  let statusText = t('voiceControl.appTitle');
  if (isRateLimited) statusText = t('voiceControl.rateLimit');
  else if (isProcessing) statusText = t('voiceControl.processing');
  else if (isListening) statusText = t('voiceControl.listening');

  if (permissionState === 'denied') {
    statusText = t('voiceControl.micDisabled');
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={onClick}
        disabled={permissionState === 'denied' || isRateLimited}
        className={`w-full text-center p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          permissionState === 'denied'
            ? 'bg-red-50 border-red-200 cursor-not-allowed'
            : isRateLimited
            ? 'bg-yellow-50 border-yellow-300 cursor-not-allowed'
            : 'bg-primary-100 border-primary-200 hover:bg-primary-200'
        }`}
        aria-label={t('voiceControl.appTitle')}
      >
        <div className="flex justify-center items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${permissionState === 'denied' ? 'text-red-500' : (isListening && !isProcessing ? 'text-red-500 animate-pulse' : 'text-primary-700')}`} viewBox="0 0 20 20" fill="currentColor">
                {permissionState === 'denied' ? (
                    <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.523L13.477 14.89zm-2.02-2.02l-7.07-7.07A6.024 6.024 0 004 10v.789l.375.375 2.121 2.121L8.28 15h.789a6.002 6.002 0 006.33-4.885l-1.99 1.99zM10 18a8 8 0 100-16 8 8 0 000 16z" clipRule="evenodd" />
                ) : (
                    <>
                        <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                        <path fillRule="evenodd" d="M7 2a4 4 0 00-4 4v6a4 4 0 108 0V6a4 4 0 00-4-4zM5 6a2 2 0 012-2h2a2 2 0 110 4H7a2 2 0 01-2-2zm10 4a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM4 11a1 1 0 100 2h12a1 1 0 100-2H4z" clipRule="evenodd" />
                    </>
                )}
            </svg>
            <p className={`font-semibold ${permissionState === 'denied' ? 'text-red-800' : 'text-primary-800'}`}>
                {statusText}
            </p>
        </div>
        {permissionState === 'denied' ? (
             <p className="text-sm mt-1 text-red-700">{t('voiceControl.micDisabledHint')}</p>
        ) : (
             <p className="text-sm mt-1 text-primary-600">
                {isRateLimited ? t('voiceControl.rateLimitHint') : t('voiceControl.appHint')}
            </p>
        )}
      </button>
    </div>
  );
};

export default AppVoiceControl;
