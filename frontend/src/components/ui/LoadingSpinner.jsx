// Loading Spinner Component with Progress Bar
import { cn } from '../../utils/helpers';
import { motion } from 'framer-motion';

export function LoadingSpinner({ 
  message = 'Loading data...', 
  size = 'md',
  showProgress = false,
  className 
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 gap-4',
      className
    )}>
      {/* Spinning loader */}
      <div className="relative">
        <div className={cn(
          'animate-spin rounded-full border-4 border-[var(--surface-tertiary)] border-t-c9-500',
          sizeClasses[size]
        )} />
        <div className={cn(
          'absolute inset-0 animate-ping rounded-full border-2 border-c9-500 opacity-20',
          sizeClasses[size]
        )} />
      </div>
      
      {/* Message */}
      <p className="text-[var(--text-secondary)] text-sm animate-pulse">{message}</p>
      
      {/* Progress bar (indeterminate) */}
      {showProgress && (
        <div className="w-48 h-1 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-c9-500 to-c9-400 rounded-full"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'easeInOut',
            }}
            style={{ width: '50%' }}
          />
        </div>
      )}
    </div>
  );
}

export function PageLoader({ message = 'Loading...', showProgress = true }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <LoadingSpinner message={message} size="lg" showProgress={showProgress} />
    </div>
  );
}

export function InlineLoader({ message = 'Loading...' }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--surface-tertiary)] border-t-c9-500" />
      <span className="text-sm text-[var(--text-secondary)]">{message}</span>
    </div>
  );
}

export default LoadingSpinner;
