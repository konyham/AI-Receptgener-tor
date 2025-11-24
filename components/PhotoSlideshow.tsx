import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Favorites, Recipe } from '../types';
import * as imageStore from '../services/imageStore';

interface PhotoSlideshowProps {
  favorites: Favorites;
  onClose: () => void;
}

interface Slide {
  imageUrl: string;
  id: string;
}

const PhotoSlideshow: React.FC<PhotoSlideshowProps> = ({ favorites, onClose }) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageData, setCurrentImageData] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);
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

  // Timer
  useEffect(() => {
    if (isPlaying && slides.length > 0) {
      intervalRef.current = window.setInterval(nextSlide, 10000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, nextSlide, slides.length]);

  // Keyboard & Fullscreen interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === ' ') {
          e.preventDefault();
          setIsPlaying(p => !p);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Request Fullscreen
    const elem = document.documentElement as any;
    const requestMethod = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;

    if (requestMethod) {
        requestMethod.call(elem).catch((err: any) => console.log("Fullscreen request denied/failed", err));
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const doc = document as any;
      const exitMethod = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
        if (exitMethod) {
            exitMethod.call(doc).catch((err: any) => console.log("Exit fullscreen failed", err));
        }
      }
    };
  }, [onClose, nextSlide, prevSlide]);

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
                className="max-w-full max-h-full object-contain animate-fade-in transition-opacity duration-1000"
                key={currentIndex} // Key forces remount for animation
            />
        ) : (
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        )}

        {/* Controls Overlay */}
        <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
             <div className="text-white bg-black/50 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                 {currentIndex + 1} / {slides.length}
             </div>
             <div className="flex gap-4 bg-black/30 p-2 rounded-full backdrop-blur-sm">
                 <button onClick={(e) => { e.stopPropagation(); setIsPlaying(p => !p); }} className="text-white hover:text-primary-400 transition p-1" title={isPlaying ? "Szünet" : "Lejátszás"}>
                     {isPlaying ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     )}
                 </button>
                 <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-white hover:text-red-400 transition p-1" title="Bezárás">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
             </div>
        </div>
        
        {/* Manual Nav Targets (Invisible but clickable) */}
        <div className="absolute inset-y-0 left-0 w-1/6 cursor-pointer z-10" onClick={(e) => { e.stopPropagation(); prevSlide(); }} title="Előző"></div>
        <div className="absolute inset-y-0 right-0 w-1/6 cursor-pointer z-10" onClick={(e) => { e.stopPropagation(); nextSlide(); }} title="Következő"></div>
    </div>
  );
};

export default PhotoSlideshow;