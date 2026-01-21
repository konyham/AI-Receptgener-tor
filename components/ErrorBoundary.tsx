
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch rendering errors in the component tree.
 * FIX: Using React.Component explicitly with generic types to ensure 'props' and 'state' are correctly recognized by TypeScript.
 */
class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // FIX: Accessing this.state which is now correctly recognized.
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900 p-4 font-sans">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-200">
            <div className="mb-4 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Hoppá! Valami hiba történt.</h1>
            <p className="text-gray-600 mb-6">Az alkalmazás nem tudott elindulni vagy váratlanul leállt. Az alábbi hibaüzenet segíthet a megoldásban:</p>
            
            <div className="text-left bg-red-50 p-4 rounded-lg text-sm text-red-800 overflow-auto mb-6 border border-red-100 max-h-64 shadow-inner font-mono">
              <strong>Hibaüzenet:</strong> {this.state.error?.message || 'Ismeretlen hiba'}
              {this.state.error?.stack && (
                  <details className="mt-2 cursor-pointer">
                      <summary className="font-semibold underline mb-1">Részletek (Stack Trace)</summary>
                      <pre className="whitespace-pre-wrap text-xs text-gray-700">{this.state.error.stack}</pre>
                  </details>
              )}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 ease-in-out w-full sm:w-auto"
            >
              Oldal újratöltése
            </button>
            <p className="mt-4 text-xs text-gray-400">
                Tipp: Ellenőrizze az internetkapcsolatot és a böngésző konzolját (F12) további információkért.
            </p>
          </div>
        </div>
      );
    }

    // FIX: Inherited props are now correctly recognized by extending React.Component.
    return this.props.children || null;
  }
}

export default ErrorBoundary;
