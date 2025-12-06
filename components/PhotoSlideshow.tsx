
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Favorites, Recipe } from '../types';
import * as imageStore from '../services/imageStore';
import { getNameday } from '../utils/namedays';

interface PhotoSlideshowProps {
  favorites: Favorites;
  onClose: () => void;
  manualLocation?: string;
  onUpdateLocation?: (location: string) => void;
}

interface Slide {
  imageUrl: string;
  id: string;
}

const PhotoSlideshow: React.FC<PhotoSlideshowProps> = ({ favorites, onClose, manualLocation, onUpdateLocation }) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageData, setCurrentImageData] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [intervalDuration, setIntervalDuration] = useState(10000);
  
  const [weather, setWeather] = useState<{ temp: number; description: string; icon: string; city: string } | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [locationError, setLocationError] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [tempLocation, setTempLocation] = useState('');
  
  const controlsTimeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Initialize slides list
  useEffect(() => {
    const allSlides: Slide[] = [];
    Object.values(favorites).forEach((recipes: Recipe[]) => {
      recipes.forEach(recipe => {
        if (recipe.imageUrl) {
          allSlides.push({
            imageUrl: recipe.imageUrl,
            id: recipe.recipeName + (recipe.dateAdded || Math.random())
          });
        }
      });
    });
    
    // Shuffle
    for (let i = allSlides.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allSlides[i], allSlides[j]] = [allSlides[j], allSlides[i]];
    }
    setSlides(allSlides);
  }, [favorites]);

  // Load image data helper
  const loadImage = useCallback(async (url: string) => {
    if (url.startsWith('indexeddb:')) {
      const id = url.substring(10);
      return await imageStore.getImage(id);
    }
    return url;
  }, []);

  // Load current image
  useEffect(() => {
    if (slides.length === 0) return;

    const loadCurrent = async () => {
      const data = await loadImage(slides[currentIndex].imageUrl);
      setCurrentImageData(data || null);
    };

    loadCurrent();
  }, [currentIndex, slides, loadImage]);

  // Navigation
  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const changeInterval = (amount: number) => {
    setIntervalDuration(prev => {
        const newDuration = prev + amount;
        // Clamp between 3 seconds and 30 seconds
        return Math.max(3000, Math.min(30000, newDuration));
    });
  };

  // Timer
  useEffect(() => {
    if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    }
    if (isPlaying && slides.length > 1) {
      intervalRef.current = window.setInterval(nextSlide, intervalDuration);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, nextSlide, slides.length, intervalDuration]);

  // Clock Timer
  useEffect(() => {
      const timer = setInterval(() => {
          setCurrentDateTime(new Date());
      }, 1000);
      return () => clearInterval(timer);
  }, []);

  const fetchWeatherByCoords = async (latitude: number, longitude: number, cityName?: string) => {
      try {
          // Fetch City Name (if not provided)
          let city = cityName || "Jelenlegi hely";
          if (!cityName) {
              try {
                  const cityRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=hu`);
                  const cityData = await cityRes.json();
                  if (cityData.city) city = cityData.city;
                  else if (cityData.locality) city = cityData.locality;
              } catch (e) {
                  console.warn("City fetch failed", e);
              }
          }

          // Fetch Weather (Open-Meteo)
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const weatherData = await weatherRes.json();
          const { temperature, weathercode } = weatherData.current_weather;

          // Map WMO Weather Codes to Description & Icon
          let description = "Ismeretlen";
          let icon = "☁️";

          if (weathercode === 0) { description = "Tiszta égbolt"; icon = "☀️"; }
          else if ([1, 2, 3].includes(weathercode)) { description = "Részben felhős"; icon = "⛅"; }
          else if ([45, 48].includes(weathercode)) { description = "Ködös"; icon = "🌫️"; }
          else if ([51, 53, 55].includes(weathercode)) { description = "Szitálás"; icon = "🌧️"; }
          else if ([61, 63, 65].includes(weathercode)) { description = "Eső"; icon = "🌧️"; }
          else if ([71, 73, 75].includes(weathercode)) { description = "Havazás"; icon = "❄️"; }
          else if ([95, 96, 99].includes(weathercode)) { description = "Zivatar"; icon = "⛈️"; }

          setWeather({ temp: temperature, description, icon, city });
          setLocationError(false);

      } catch (e) {
          console.error("Weather fetch failed", e);
          setLocationError(true);
      }
  };

  const fetchWeatherByManualLocation = async (location: string) => {
      try {
          // Geocoding
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=hu&format=json`);
          const geoData = await geoRes.json();
          
          if (geoData.results && geoData.results.length > 0) {
              const { latitude, longitude, name } = geoData.results[0];
              await fetchWeatherByCoords(latitude, longitude, name);
          } else {
              console.warn("Location not found");
              setLocationError(true);
          }
      } catch (e) {
          console.error("Geocoding failed", e);
          setLocationError(true);
      }
  };

  // Weather Fetching Strategy
  useEffect(() => {
      const loadWeather = async () => {
          // 1. Try Browser Geolocation
          if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                  (position) => {
                      fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
                  },
                  (err) => {
                      console.warn("Geolocation denied or failed", err);
                      // 2. Fallback to Manual Location if Geolocation fails
                      if (manualLocation) {
                          fetchWeatherByManualLocation(manualLocation);
                      } else {
                          setLocationError(true);
                      }
                  },
                  { timeout: 5000 }
              );
          } else {
               // 2. Fallback to Manual Location if Geolocation not supported
               if (manualLocation) {
                  fetchWeatherByManualLocation(manualLocation);
              } else {
                  setLocationError(true);
              }
          }
      };

      loadWeather();
      
      // Refresh weather every 30 minutes
      const weatherInterval = setInterval(loadWeather, 30 * 60 * 1000);
      return () => clearInterval(weatherInterval);
  }, [manualLocation]);

  // Auto-show edit mode if location is missing and error occurs
  useEffect(() => {
      if (locationError && !manualLocation) {
          setIsEditingLocation(true);
      }
  }, [locationError, manualLocation]);

  const handleEditClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setTempLocation(manualLocation || '');
      setIsEditingLocation(true);
  };

  const handleSaveLocation = (e: React.FormEvent) => {
      e.preventDefault();
      if (tempLocation.trim()) {
          if (onUpdateLocation) {
              onUpdateLocation(tempLocation.trim());
          }
          setIsEditingLocation(false);
          // Re-trigger weather fetch logic by changing manualLocation prop
      }
  };

  const toggleFullscreen = () => {
    const elem = document.documentElement as any;
    const doc = document as any;

    if (!document.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
        const requestMethod = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
        if (requestMethod) {
            requestMethod.call(elem).catch((err: any) => console.log("Fullscreen request denied", err));
        }
    } else {
        const exitMethod = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
        if (exitMethod) {
            exitMethod.call(doc).catch((err: any) => console.log("Exit fullscreen failed", err));
        }
    }
  };

  // Sync fullscreen state
  useEffect(() => {
      const handleFullscreenChange = () => {
          const doc = document as any;
          setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement));
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', handleFullscreenChange);

      // Auto-enter fullscreen on mount
      const elem = document.documentElement as any;
      const doc = document as any;
      if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
           const requestMethod = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
           if (requestMethod) {
               setTimeout(() => {
                   requestMethod.call(elem).catch(() => {});
               }, 100);
           }
      }

      return () => {
          document.removeEventListener('fullscreenchange', handleFullscreenChange);
          document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
          document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
          document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      };
  }, []);

  // Keyboard interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (slides.length > 1) {
        if (e.key === 'ArrowRight') nextSlide();
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'ArrowUp') changeInterval(1000);
        if (e.key === 'ArrowDown') changeInterval(-1000);
        if (e.key === ' ') {
            e.preventDefault();
            setIsPlaying(p => !p);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, nextSlide, prevSlide, slides.length]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 3000);
  };

  if (slides.length === 0) {
     return (
         <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center text-white p-4 text-center">
             <p className="text-xl mb-4">Nincsenek megjeleníthető képek a mentett receptek között.</p>
             <button onClick={onClose} className="bg-white/20 px-6 py-2 rounded-full hover:bg-white/40 transition">Bezárás</button>
         </div>
     );
  }

  const days = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
  const formattedDate = currentDateTime.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  const dayName = days[currentDateTime.getDay()];
  const formattedTime = currentDateTime.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  const nameday = getNameday(currentDateTime);

  return (
    <div 
        className="fixed inset-0 bg-black z-[100] flex items-center justify-center overflow-hidden"
        onMouseMove={handleMouseMove}
        onClick={() => setShowControls(true)}
    >
        {/* Image */}
        {currentImageData ? (
            <img 
                src={currentImageData} 
                alt="Slideshow" 
                className="w-full h-full object-contain animate-fade-in transition-opacity duration-1000"
                key={currentIndex} // Key forces remount for animation
            />
        ) : (
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        )}

        {/* Info Overlay Background Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

        {/* Left Side: Weather Info - Positioned at 23% from bottom with 3% left margin */}
        {/* Added scale-[1.31] and origin-bottom-left to increase size by 31% */}
        {/* Updated shadow for stronger contrast */}
        <div className="absolute bottom-[23%] left-[3%] z-40 text-white drop-shadow-[0_4px_3px_rgba(0,0,0,0.9)] flex items-center gap-4 animate-fade-in pointer-events-auto scale-[1.31] origin-bottom-left">
             {isEditingLocation ? (
                 <div className="bg-black/50 p-3 rounded-lg backdrop-blur-md pointer-events-auto" onClick={e => e.stopPropagation()}>
                     <form onSubmit={handleSaveLocation} className="flex flex-col gap-2">
                         <label className="text-xs font-bold uppercase text-gray-300">Település beállítása</label>
                         <div className="flex gap-2">
                             <input
                                 type="text"
                                 value={tempLocation}
                                 onChange={e => setTempLocation(e.target.value)}
                                 className="bg-white/20 text-white px-2 py-1 rounded border border-white/30 focus:outline-none focus:border-white w-40"
                                 placeholder="Budapest..."
                                 autoFocus
                             />
                             <button type="submit" className="bg-primary-600 hover:bg-primary-500 text-white px-3 py-1 rounded text-sm font-bold">OK</button>
                             <button type="button" onClick={() => setIsEditingLocation(false)} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm">Mégse</button>
                         </div>
                     </form>
                 </div>
             ) : (
                 <>
                    {weather ? (
                        <div className="group relative">
                            <div className="flex items-center gap-4 cursor-pointer" onClick={handleEditClick} title="Helyszín módosítása">
                                <div className="text-6xl">{weather.icon}</div>
                                <div>
                                    <div className="text-4xl font-bold">{weather.temp}°C</div>
                                    <div className="text-lg opacity-90 font-semibold flex items-center gap-2">
                                        {weather.city}
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </div>
                                    <div className="text-sm opacity-75">{weather.description}</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 cursor-pointer" onClick={handleEditClick}>
                            {locationError ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    <span className="text-sm font-semibold underline">Hely megadása</span>
                                </>
                            ) : (
                                <>
                                    <div className="animate-pulse w-8 h-8 bg-white/20 rounded-full"></div>
                                    <span className="text-sm">Helymeghatározás...</span>
                                </>
                            )}
                        </div>
                    )}
                 </>
             )}
        </div>

        {/* Right Side: Date/Time/Nameday - Positioned at 23% from bottom with 3% right margin */}
        {/* Updated shadow for stronger contrast */}
        <div className="absolute bottom-[23%] right-[3%] z-40 text-white text-right drop-shadow-[0_4px_3px_rgba(0,0,0,0.9)] animate-fade-in">
            <div className="text-6xl font-bold font-mono tracking-wider mb-2">{formattedTime}</div>
            <div className="text-xl font-semibold">{formattedDate}</div>
            <div className="text-lg opacity-90 mb-1">{dayName}</div>
            <div className="text-sm opacity-80 mt-2 inline-block">
                Mai névnapos: <strong>{nameday}</strong>
            </div>
        </div>

        {/* Controls Overlay - Increased z-index to 50 to be above navigation targets */}
        <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center transition-opacity duration-500 z-50 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
             <div className="text-white bg-black/50 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                 {currentIndex + 1} / {slides.length}
             </div>
             <div className="flex gap-4 bg-black/30 p-2 rounded-full backdrop-blur-sm pointer-events-auto relative">
                 <button 
                    onClick={(e) => { e.stopPropagation(); setIsPlaying(p => !p); }} 
                    className="text-white hover:text-primary-400 transition p-1 disabled:opacity-50 disabled:cursor-not-allowed" 
                    title={isPlaying ? "Szünet" : "Lejátszás"}
                    disabled={slides.length <= 1}
                 >
                     {isPlaying ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     )}
                 </button>

                <div className="flex flex-col items-center text-white p-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); changeInterval(1000); }} 
                        className="hover:text-primary-400 p-1 disabled:opacity-50 disabled:cursor-not-allowed" 
                        title="Lassítás (idő növelése)"
                        disabled={slides.length <= 1}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <span className={`font-mono w-8 text-center text-lg ${slides.length <= 1 ? 'opacity-50' : ''}`}>{intervalDuration / 1000}s</span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); changeInterval(-1000); }} 
                        className="hover:text-primary-400 p-1 disabled:opacity-50 disabled:cursor-not-allowed" 
                        title="Gyorsítás (idő csökkentése)"
                        disabled={slides.length <= 1}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                </div>

                 <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white hover:text-primary-400 transition p-1" title={isFullscreen ? "Kilépés teljes képernyőből" : "Teljes képernyő"}>
                    {isFullscreen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 5a1 1 0 011-1h2a1 1 0 110 2H6v1a1 1 0 11-2 0V6a1 1 0 011-1zm10 0a1 1 0 011 1v1a1 1 0 11-2 0V6h-1a1 1 0 110-2h2zM5 14a1 1 0 011 1v1h1a1 1 0 110 2H6a1 1 0 01-1-1v-2zm10 0a1 1 0 011 1v2a1 1 0 01-1 1h-1a1 1 0 110-2h1v-1z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h2a1 1 0 110 2H5v1a1 1 0 11-2 0V4zm14 0a1 1 0 00-1-1h-2a1 1 0 100 2h1v1a1 1 0 102 0V4zM4 17a1 1 0 01-1-1v-2a1 1 0 112 0v1h1a1 1 0 110 2H4zM16 17a1 1 0 001-1v-1a1 1 0 10-2 0v1h-1a1 1 0 100 2h2z" clipRule="evenodd" />
                        </svg>
                    )}
                 </button>
                 <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-white hover:text-red-400 transition p-1" title="Bezárás">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
             </div>
        </div>
        
        {/* Manual Nav Nav Targets (Invisible but clickable) - z-index 10 is below controls */}
        {slides.length > 1 && (
            <>
                <div className="absolute inset-y-0 left-0 w-1/6 cursor-pointer z-10" onClick={(e) => { e.stopPropagation(); prevSlide(); }} title="Előző"></div>
                <div className="absolute inset-y-0 right-0 w-1/6 cursor-pointer z-10" onClick={(e) => { e.stopPropagation(); nextSlide(); }} title="Következő"></div>
            </>
        )}
    </div>
  );
};

export default PhotoSlideshow;