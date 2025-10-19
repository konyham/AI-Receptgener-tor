import React, { useEffect, useState } from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'info';
  duration?: number;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true); // Animate in

    const timer = setTimeout(() => {
      setVisible(false);
      // Wait for the fade-out animation to complete before calling onClose
      setTimeout(onClose, 300);
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [message, type, duration, onClose]);

  const typeClasses = {
    success: 'bg-primary-600',
    info: 'bg-blue-500',
  };

  const baseClasses = 'fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg text-white font-semibold transition-all duration-300 ease-in-out text-center';
  const visibilityClasses = visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5';

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${visibilityClasses}`} role="alert">
      {message}
    </div>
  );
};

export default Notification;