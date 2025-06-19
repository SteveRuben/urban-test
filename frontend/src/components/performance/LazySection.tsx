// src/components/LazySection.tsx

import type { ReactNode } from "react";
import { useIntersectionObserver } from "../../hooks/useIntersectionObserver";


interface LazySectionProps {
  children: ReactNode;
  className?: string;
  animationType?: 'fade' | 'slideUp' | 'slideLeft' | 'scale';
  threshold?: number;
}

export const LazySection: React.FC<LazySectionProps> = ({
  children,
  className = '',
  animationType = 'slideUp',
  threshold = 0.1
}) => {
  const { elementRef, hasIntersected } = useIntersectionObserver({
    threshold
  });

  const getAnimationClass = () => {
    const base = 'transition-all duration-700 ease-out';
    
    if (!hasIntersected) {
      switch (animationType) {
        case 'fade':
          return `${base} opacity-0`;
        case 'slideUp':
          return `${base} opacity-0 translate-y-8`;
        case 'slideLeft':
          return `${base} opacity-0 translate-x-8`;
        case 'scale':
          return `${base} opacity-0 scale-95`;
        default:
          return `${base} opacity-0 translate-y-8`;
      }
    }
    
    return `${base} opacity-100 translate-y-0 translate-x-0 scale-100`;
  };

  return (
    <div 
    // @ts-ignore
      ref={elementRef}
      className={`${getAnimationClass()} ${className}`}
    >
      {children}
    </div>
  );
};