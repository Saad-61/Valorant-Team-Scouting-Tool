// Reusable Analytics Card Component - Cloud9 Themed
import { cn } from '../../utils/helpers';

export function AnalyticsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend,
  trendLabel,
  variant = 'default',
  className,
  children,
  onClick,
}) {
  const variants = {
    default: 'border-[var(--border-primary)]',
    success: 'border-success-500/30 bg-success-500/5',
    warning: 'border-warning-500/30 bg-warning-500/5',
    danger: 'border-danger-500/30 bg-danger-500/5',
    highlight: 'border-c9-500/30 bg-c9-500/5',
  };

  const trendColors = {
    up: 'text-success-500',
    down: 'text-danger-500',
    neutral: 'text-[var(--text-tertiary)]',
  };

  const getTrendDirection = (val) => {
    if (val > 0) return 'up';
    if (val < 0) return 'down';
    return 'neutral';
  };

  return (
    <div 
      className={cn(
        'bg-[var(--surface-primary)] rounded-xl border p-5 transition-all duration-300',
        'shadow-[var(--shadow-sm)]',
        variants[variant],
        onClick && 'cursor-pointer hover:border-c9-500/50 hover:shadow-[var(--shadow-md)] focus:outline-none focus:ring-2 focus:ring-c9-500/50',
        className
      )}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {title && (
            <p className="text-sm text-[var(--text-secondary)] uppercase tracking-wide mb-1">
              {title}
            </p>
          )}
          {value !== undefined && (
            <p className="text-3xl font-bold text-[var(--text-primary)]">
              {value}
            </p>
          )}
          {subtitle && (
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              {subtitle}
            </p>
          )}
          {trend !== undefined && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm',
              trendColors[getTrendDirection(trend)]
            )}>
              <span>{trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}</span>
              <span>{Math.abs(trend)}%</span>
              {trendLabel && <span className="text-[var(--text-tertiary)]">{trendLabel}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-c9-500/10 rounded-lg">
            <Icon className="w-6 h-6 text-c9-500" />
          </div>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export default AnalyticsCard;
