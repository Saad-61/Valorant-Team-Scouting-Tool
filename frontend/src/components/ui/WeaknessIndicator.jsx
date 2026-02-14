// Weakness Indicator Component - Cloud9 Themed
import { cn, getSeverityColor } from '../../utils/helpers';
import { AlertTriangle, TrendingDown, Target, Info } from 'lucide-react';

const severityIcons = {
  HIGH: AlertTriangle,
  CRITICAL: AlertTriangle,
  MEDIUM: TrendingDown,
  LOW: Info,
};

export function WeaknessIndicator({
  severity = 'MEDIUM',
  category,
  finding,
  recommendation,
  details = [],
  expanded = false,
  onClick,
  className,
}) {
  const colors = getSeverityColor(severity);
  const Icon = severityIcons[severity?.toUpperCase()] || Info;
  const upperSeverity = severity?.toUpperCase();

  // More vivid severity-specific styles
  const severityStyles = {
    HIGH: 'border-l-4 border-l-red-500 bg-gradient-to-r from-red-950/50 via-red-900/20 to-transparent',
    CRITICAL: 'border-l-4 border-l-red-500 bg-gradient-to-r from-red-950/50 via-red-900/20 to-transparent',
    MEDIUM: 'border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-950/50 via-amber-900/20 to-transparent',
    LOW: 'border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-950/50 via-emerald-900/20 to-transparent',
  };

  const badgeStyles = {
    HIGH: 'bg-red-500/90 text-white shadow-lg shadow-red-500/30',
    CRITICAL: 'bg-red-600/90 text-white shadow-lg shadow-red-600/30',
    MEDIUM: 'bg-amber-500/90 text-black shadow-lg shadow-amber-500/30',
    LOW: 'bg-emerald-500/90 text-white shadow-lg shadow-emerald-500/30',
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-primary)] p-4 transition-all duration-300',
        severityStyles[upperSeverity] || 'bg-[var(--surface-secondary)]',
        onClick && 'cursor-pointer hover:scale-[1.01] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-c9-500/50',
        className
      )}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2.5 rounded-xl',
          upperSeverity === 'HIGH' || upperSeverity === 'CRITICAL' ? 'bg-red-500/20' :
          upperSeverity === 'MEDIUM' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
        )}>
          <Icon className={cn('w-5 h-5', colors.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              'text-xs font-bold uppercase px-2.5 py-1 rounded-md',
              badgeStyles[upperSeverity] || 'bg-slate-500/90 text-white'
            )}>
              {severity}
            </span>
            {category && (
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                {category}
              </span>
            )}
          </div>
          <p className="text-[var(--text-primary)] font-medium text-base">
            {finding}
          </p>
        </div>
      </div>

      {/* Details */}
      {expanded && details.length > 0 && (
        <div className="mt-4 ml-12 space-y-2">
          {details.map((detail, index) => (
            <p key={index} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
              <span className={colors.text}>•</span>
              <span>{detail}</span>
            </p>
          ))}
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="mt-4 ml-12 flex items-start gap-3 p-3.5 bg-c9-500/15 rounded-xl border border-c9-500/30">
          <Target className="w-4 h-4 text-c9-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-c9-400 font-medium">
            {recommendation}
          </p>
        </div>
      )}
    </div>
  );
}

export function WeaknessList({ weaknesses = [], className }) {
  if (!weaknesses.length) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-[var(--text-tertiary)]">No weaknesses identified</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          This team is well-rounded across all categories
        </p>
      </div>
    );
  }

  // Sort by severity
  const sortedWeaknesses = [...weaknesses].sort((a, b) => {
    const order = { HIGH: 0, CRITICAL: 0, MEDIUM: 1, LOW: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <div className={cn('space-y-3', className)}>
      {sortedWeaknesses.map((weakness, index) => (
        <WeaknessIndicator
          key={index}
          severity={weakness.severity}
          category={weakness.category}
          finding={weakness.finding}
          recommendation={weakness.recommendation}
          details={weakness.details}
          expanded={weakness.severity === 'HIGH'}
        />
      ))}
    </div>
  );
}

export default WeaknessIndicator;
