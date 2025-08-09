import React from 'react';
import { Link } from 'react-router-dom';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  _hover?: React.CSSProperties; // Pour la compatibilité avec Chakra UI
  _active?: React.CSSProperties; // Pour la compatibilité avec Chakra UI
  disabled?: boolean;
  loading?: boolean;
  color?: string; // Pour la compatibilité avec Chakra UI
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  as?: typeof Link;
  to?: string;
  href?: string;
  target?: string;
  fullWidth?: boolean;
  animate?: boolean;
  pulse?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button',
  as,
  to,
  href,
  target,
  fullWidth = false,
  animate = true,
  pulse = false,
  ...props
}) => {
  // Classes de base avec animations premium
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-xl 
    transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 
    disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden
    ${fullWidth ? 'w-full' : ''}
    ${animate ? 'btn-premium' : ''}
    ${pulse ? 'pulse-cta' : ''}
  `.replace(/\s+/g, ' ').trim();
  
  // Couleurs améliorées avec gradients et effets premium - Nouvelle palette violet/vert
  const variantClasses = {
    primary: `
      bg-gradient-to-r from-purple-600 to-purple-700 text-white 
      hover:from-purple-700 hover:to-purple-800 focus:ring-purple-500 
      shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
      border border-transparent
    `.replace(/\s+/g, ' ').trim(),
    
    secondary: `
      bg-gradient-to-r from-emerald-600 to-emerald-700 text-white 
      hover:from-emerald-700 hover:to-emerald-800 focus:ring-emerald-500 
      shadow-md hover:shadow-lg transform hover:-translate-y-0.5
      border border-transparent
    `.replace(/\s+/g, ' ').trim(),
    
    outline: `
      border-2 border-purple-600 text-purple-600 bg-white 
      hover:bg-purple-50 hover:border-purple-700 hover:text-purple-700 
      focus:ring-purple-500 shadow-sm hover:shadow-md
      transform hover:-translate-y-0.5
    `.replace(/\s+/g, ' ').trim(),
    
    danger: `
      bg-gradient-to-r from-rose-600 to-rose-700 text-white 
      hover:from-rose-700 hover:to-rose-800 focus:ring-rose-500 
      shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
      border border-transparent
    `.replace(/\s+/g, ' ').trim(),
    
    ghost: `
      text-neutral-700 bg-transparent hover:bg-neutral-100 
      focus:ring-neutral-500 hover:text-neutral-900
      border border-transparent
    `.replace(/\s+/g, ' ').trim(),
    
    gradient: `
      bg-gradient-to-r from-purple-500 via-emerald-500 to-amber-500 text-white 
      hover:from-purple-600 hover:via-emerald-600 hover:to-amber-600
      focus:ring-purple-500 shadow-lg hover:shadow-xl 
      transform hover:-translate-y-0.5 border border-transparent
    `.replace(/\s+/g, ' ').trim()
  };
  
  // Tailles optimisées pour tous les cas d'usage
  const sizeClasses = {
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg font-semibold',
    xl: 'px-10 py-5 text-xl font-bold'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  // Loading spinner amélioré
  const LoadingSpinner = () => (
    <div className="flex items-center">
      <svg 
        className="animate-spin -ml-1 mr-2 h-4 w-4" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span>Chargement...</span>
    </div>
  );

  const content = (
    <>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {leftIcon && <span className="mr-2 flex-shrink-0">{leftIcon}</span>}
          <span className="flex-1">{children}</span>
          {rightIcon && <span className="ml-2 flex-shrink-0">{rightIcon}</span>}
        </>
      )}
      
      {/* Effet shimmer pour les boutons premium */}
      {animate && !disabled && !loading && (
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </div>
      )}
    </>
  );

  // Analytics tracking pour les boutons importants
  const handleClick = (_event: React.MouseEvent) => {
    console.log(_event)
    if (onClick) {
      onClick();
    }
    
    // Track button clicks for analytics
    if (variant === 'primary' || variant === 'gradient') {
      // Analytics tracking sera intégré automatiquement
      console.log('Button clicked:', { variant, children: typeof children === 'string' ? children : 'complex' });
    }
  };

  // Si c'est un lien React Router
  if (as === Link && to) {
    return (
      <Link 
        to={to} 
        className={`${classes} group`} 
        {...props}
      >
        {content}
      </Link>
    );
  }

  // Si c'est un lien externe
  if (href) {
    return (
      <a 
        href={href} 
        target={target} 
        className={`${classes} group`} 
        {...props}
      >
        {content}
      </a>
    );
  }

  // Bouton standard
  return (
    <button
      type={type}
      className={`${classes} group`}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </button>
  );
};

export default Button;