import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
      <div className="flex">
        <div className="py-1">
          <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 18a8 8 0 1 1 0 -16 8 8 0 0 1 0 16zm-1-5.414L7.586 11 10 8.586 12.414 11 11 12.414 8.586 10 11 7.586 10 5l-4 4 4 4zM10 0a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/></svg>
        </div>
        <div>
          <p className="font-bold">{t('modals.general.errorTitle', { defaultValue: 'Hiba történt' })}</p>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
