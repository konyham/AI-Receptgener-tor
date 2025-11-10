import React, { useState, useEffect } from 'react';
import { LOADING_TIPS } from '../constants';

interface LoadingSpinnerProps {
  message?: string;
  inline?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Recept generálása...', inline = false }) => {
  const [tip, setTip] = useState('');

  useEffect(() => {
    // Select an initial tip
    setTip(LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);

    // Change the tip every 5 seconds
    const intervalId = setInterval(() => {
      setTip(LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);
    }, 5000);

    // Clear the interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const content = (
    <>
      <svg className="animate-spin h-12 w-12 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="mt-4 text-lg text-gray-700 dark:text-gray-200 font-semibold text-center">{message}</p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center animate-fade-in">{tip}</p>
    </>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 flex flex-col items-center justify-center w-full max-w-md">{content}</div>
    </div>
  );
};

export default LoadingSpinner;