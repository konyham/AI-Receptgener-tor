import React, { useState } from 'react';

interface StarRatingProps {
  rating: number | undefined;
  onRatingChange?: (rating: number | undefined) => void;
  readOnly?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, readOnly = false }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (index: number) => {
    if (!readOnly && onRatingChange) {
      // If clicking the same star, un-rate it (pass undefined). Otherwise, set new rating.
      const newRating = rating === index ? undefined : index;
      onRatingChange(newRating);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (!readOnly) {
      setHoverRating(index);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(0);
    }
  };

  return (
    <div className="flex items-center" aria-label={`Értékelés: ${rating || 0} az 5-ből`}>
      {[1, 2, 3, 4, 5].map((index) => {
        const starColor = (hoverRating || rating || 0) >= index ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600';
        const interactionClasses = readOnly ? '' : 'cursor-pointer hover:scale-110 transition-transform';

        return (
          <button
            key={index}
            type="button"
            className={`focus:outline-none ${interactionClasses}`}
            onClick={() => handleClick(index)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
            disabled={readOnly}
            aria-label={`Értékelés ${index} csillag`}
            aria-pressed={rating === index}
          >
            <svg
              className={`w-6 h-6 ${starColor}`}
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;