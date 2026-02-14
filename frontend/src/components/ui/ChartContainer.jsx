// Chart Container with loading and error states - Cloud9 Themed
import { cn } from '../../utils/helpers';
import { Loader2, AlertCircle } from 'lucide-react';

export function ChartContainer({
  title,
  subtitle,
  loading = false,
  error = null,
  empty = false,
  emptyMessage = 'No data available',
  height = 300,
  className,
  headerActions,
  children,
}) {
  return (
    <div className={cn(
      'bg-[var(--surface-primary)] rounded-xl border border-[var(--border-primary)] overflow-hidden',
      'shadow-[var(--shadow-sm)] transition-colors duration-300',
      className
    )}>
      {/* Header */}
      {(title || headerActions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div 
        className="p-5"
        style={{ minHeight: height }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ minHeight: height - 40 }}>
            <Loader2 className="w-8 h-8 text-c9-500 animate-spin" />
            <p className="text-sm text-[var(--text-secondary)] mt-3">Loading data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ minHeight: height - 40 }}>
            <AlertCircle className="w-8 h-8 text-danger-500" />
            <p className="text-sm text-danger-500 mt-3">{error}</p>
          </div>
        ) : empty ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ minHeight: height - 40 }}>
            <p className="text-sm text-[var(--text-tertiary)]">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default ChartContainer;
