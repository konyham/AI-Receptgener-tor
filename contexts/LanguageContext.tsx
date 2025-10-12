import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Define the shape of the context
interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
  t: (key: string, options?: Record<string, string | number>) => string;
}

// Create the context with a default value
export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Create the provider component
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<string>(() => {
    try {
      const savedLang = localStorage.getItem('konyha-miki-lang');
      return savedLang && ['hu', 'en'].includes(savedLang) ? savedLang : 'hu';
    } catch {
      return 'hu';
    }
  });

  // State to hold the loaded translations
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [fallbackTranslations, setFallbackTranslations] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect ensures the essential fallback translations are loaded before the app renders.
    fetch('/locales/hu.json')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        setFallbackTranslations(data);
      })
      .catch(error => console.error('CRITICAL: Failed to load fallback translations (hu.json). App will use translation keys.', error))
      .finally(() => setIsLoading(false)); // Allow app to render after attempting to load fallback
  }, []);

  useEffect(() => {
    // This effect loads the translations for the selected language.
    // It runs after the fallback is loaded and whenever the language changes.
    if (isLoading) return; // Don't run until fallback has been attempted

    if (language === 'hu') {
      setTranslations(fallbackTranslations);
      return;
    }

    fetch(`/locales/${language}.json`)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => setTranslations(data))
      .catch(error => {
        console.error(`Failed to load translations for ${language}. Using fallback.`, error);
        setTranslations(fallbackTranslations); // Fallback to Hungarian on error
      });
  }, [language, fallbackTranslations, isLoading]);


  useEffect(() => {
    try {
      localStorage.setItem('konyha-miki-lang', language);
    } catch (error) {
        console.error("Could not save language to localStorage:", error);
    }
  }, [language]);

  const t = useCallback((key: string, options?: Record<string, string | number>): string => {
    const keys = key.split('.');
    
    // Function to traverse the object based on keys
    const getNestedValue = (obj: any, path: string[]): any => {
        return path.reduce((acc, currentKey) => (acc && acc[currentKey] !== undefined) ? acc[currentKey] : undefined, obj);
    };
    
    let result = getNestedValue(translations, keys);
    
    // If translation is not found in the current language, try the fallback
    if (result === undefined) {
      result = getNestedValue(fallbackTranslations, keys);
    }

    // If still not found, return the key itself
    if (result === undefined) {
      if (isLoading) return ""; // Return empty string during initial load to prevent flashing keys
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    let finalString = result;

    if (options && typeof finalString === 'string') {
        Object.keys(options).forEach(optKey => {
            finalString = finalString.replace(new RegExp(`{{${optKey}}}`, 'g'), String(options[optKey]));
        });
    }

    return finalString;
  }, [translations, fallbackTranslations, isLoading]);

  const value = { language, setLanguage, t };

  if (isLoading) {
    // Render a simple, unstyled loading message to prevent the rest of the app from rendering prematurely.
    // This avoids crashes if components rely on translations for their initial render.
    return React.createElement('div', {
        style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            fontFamily: 'sans-serif',
            fontSize: '1.2rem',
            color: '#4b5563'
        }
    }, 'Betöltés...');
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};