import React, { useEffect, useRef, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';

interface GestureControllerProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onClose: () => void;
}

const CANVAS_WIDTH = 160;
const CANVAS_HEIGHT = 120;
const MOTION_THRESHOLD = 1500; // Lower value = more sensitive
const COOLDOWN_MS = 1500;

const GestureController: React.FC<GestureControllerProps> = ({ onSwipeLeft, onSwipeRight, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [error, setError] = useState<string | null>(null);
  const { showNotification } = useNotification();

  const onSwipeLeftRef = useRef(onSwipeLeft);
  onSwipeLeftRef.current = onSwipeLeft;
  const onSwipeRightRef = useRef(onSwipeRight);
  onSwipeRightRef.current = onSwipeRight;
  
  const lastFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const motionSequenceRef = useRef<('left' | 'center' | 'right')[]>([]);
  const sequenceTimeoutRef = useRef<number | null>(null);
  const cooldownTimeoutRef = useRef<number | null>(null);


  useEffect(() => {
    showNotification('Kézmozdulat vezérlés aktív! Legyintsen a kamera előtt a lapozáshoz.', 'info', 5000);
  }, [showNotification]);


  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    const detectSwipe = (zone: 'left' | 'center' | 'right') => {
      if (cooldownTimeoutRef.current) return;
  
      if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current);
      sequenceTimeoutRef.current = window.setTimeout(() => motionSequenceRef.current = [], 800);
  
      const sequence = motionSequenceRef.current;
      if (sequence.length === 0 || sequence[sequence.length - 1] !== zone) {
        sequence.push(zone);
      }
      
      if (sequence.length > 3) sequence.shift();
  
      const triggerSwipe = (callback: () => void, direction: string) => {
        callback();
        showNotification(`${direction} lapozás`, 'success', 1000);
        motionSequenceRef.current = [];
        if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current);
        if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
        cooldownTimeoutRef.current = window.setTimeout(() => {
            cooldownTimeoutRef.current = null;
        }, COOLDOWN_MS);
      };
  
      const sequenceStr = sequence.join(',');
      if (sequenceStr.includes('right,center,left')) {
        triggerSwipe(onSwipeLeftRef.current, 'Következő'); // Swipe from right to left -> next
      } else if (sequenceStr.includes('left,center,right')) {
        triggerSwipe(onSwipeRightRef.current, 'Előző'); // Swipe from left to right -> previous
      }
    };

    const processFrame = () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const currentFrame = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const data = currentFrame.data;
      let motionScore = 0;
      let motionX = 0;
      let motionCount = 0;

      if (lastFrameDataRef.current) {
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
          const gray_last = (lastFrameDataRef.current[i] * 0.299) + (lastFrameDataRef.current[i + 1] * 0.587) + (lastFrameDataRef.current[i + 2] * 0.114);
          
          const diff = Math.abs(gray - gray_last);
          if (diff > 30) { // Difference threshold for a pixel
            motionScore++;
            motionX += (i / 4) % CANVAS_WIDTH;
            motionCount++;
          }
        }
      }
      
      if (motionScore > MOTION_THRESHOLD && motionCount > 0) {
        const avgMotionX = motionX / motionCount;
        const third = CANVAS_WIDTH / 3;
        if (avgMotionX < third) detectSwipe('left');
        else if (avgMotionX < third * 2) detectSwipe('center');
        else detectSwipe('right');
      }

      lastFrameDataRef.current = new Uint8ClampedArray(data);
      animationFrameId = requestAnimationFrame(processFrame);
    };

    const setupCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, facingMode: 'user' },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => {
            if (err.name !== 'AbortError') {
              console.warn('Video play interrupted:', err);
            }
          });
          animationFrameId = requestAnimationFrame(processFrame);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Nem sikerült elérni a kamerát. Engedélyezze a böngészőben, majd próbálja újra.");
        onClose(); // Close the component if camera fails
      }
    };

    setupCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      stream?.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    };
  }, [onClose]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    isDraggingRef.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    
    // Ensure the draggable window stays within the viewport
    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;
    const { offsetWidth, offsetHeight } = containerRef.current;
    
    const constrainedX = Math.max(0, Math.min(newX, window.innerWidth - offsetWidth));
    const constrainedY = Math.max(0, Math.min(newY, window.innerHeight - offsetHeight));

    setPosition({ x: constrainedX, y: constrainedY });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed z-[80] w-48 bg-white/80 dark:bg-black/80 backdrop-blur-md rounded-lg shadow-2xl border border-gray-300 dark:border-gray-600 overflow-hidden"
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
    >
      <div
        className="h-8 bg-gray-200 dark:bg-gray-700 flex items-center justify-between px-2 cursor-grab"
        onMouseDown={handleMouseDown}
      >
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Kézmozdulatok</span>
        <button onClick={onClose} className="text-gray-500 hover:text-red-500" aria-label="Vezérlő bezárása">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="relative aspect-[4/3]">
        {error ? (
          <div className="p-2 text-center text-xs text-red-600 dark:text-red-400">{error}</div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-cover transform scale-x-[-1]" // Mirrored for intuitive movement
            playsInline
            muted
            aria-label="Kamera képe a gesztusvezérléshez"
          />
        )}
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="hidden" />
      </div>
    </div>
  );
};

export default GestureController;