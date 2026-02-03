// Map Selector Component
import { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/helpers';
import { ChevronDown, Map, X } from 'lucide-react';

// Valorant map colors for visual distinction
const MAP_COLORS = {
  'Ascent': '#4ade80',
  'Bind': '#f59e0b',
  'Breeze': '#3b82f6',
  'Fracture': '#a855f7',
  'Haven': '#ef4444',
  'Icebox': '#06b6d4',
  'Lotus': '#ec4899',
  'Pearl': '#8b5cf6',
  'Split': '#10b981',
  'Sunset': '#f97316',
  'Abyss': '#6366f1',
};

export function MapSelector({
  maps = [],
  value,
  onChange,
  placeholder = 'All maps',
  multiple = false,
  showStats = false,
  mapStats = {},
  disabled = false,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (map) => {
    if (multiple) {
      const currentValue = value || [];
      const newValue = currentValue.includes(map)
        ? currentValue.filter(m => m !== map)
        : [...currentValue, map];
      onChange?.(newValue);
    } else {
      onChange?.(map);
      setIsOpen(false);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.(multiple ? [] : null);
  };

  const getDisplayValue = () => {
    if (multiple && Array.isArray(value) && value.length > 0) {
      return value.length === 1 ? value[0] : `${value.length} maps selected`;
    }
    return value || placeholder;
  };

  const isSelected = (map) => {
    if (multiple) {
      return (value || []).includes(map);
    }
    return value === map;
  };

  const hasValue = multiple ? (value || []).length > 0 : !!value;

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3',
          'bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg',
          'text-left transition-all duration-200',
          'hover:border-c9-500/30 focus:outline-none focus:ring-2 focus:ring-c9-500/50',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'border-c9-500/50 ring-2 ring-c9-500/20'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Map className="w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" />
          <span className={cn(
            'truncate',
            hasValue ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
          )}>
            {getDisplayValue()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasValue && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-[var(--surface-hover)] rounded focus:outline-none focus:ring-2 focus:ring-c9-500/50"
            >
              <X className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>
          )}
          <ChevronDown className={cn(
            'w-5 h-5 text-[var(--text-tertiary)] transition-transform',
            isOpen && 'rotate-180'
          )} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 py-2 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg shadow-[var(--shadow-lg)] animate-in">
          <div className="max-h-72 overflow-y-auto">
            {maps.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--text-tertiary)] text-center">
                No maps available
              </div>
            ) : (
              maps.map((map) => {
                const stats = mapStats[map];
                return (
                  <button
                    key={map}
                    onClick={() => handleSelect(map)}
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                      'hover:bg-c9-500/10 focus:outline-none focus:bg-c9-500/10',
                      isSelected(map) && 'bg-c9-500/10'
                    )}
                  >
                    {/* Map color indicator */}
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: MAP_COLORS[map] || '#666' }}
                    />

                    {/* Map name */}
                    <span className={cn(
                      'flex-1 text-sm',
                      isSelected(map) ? 'text-c9-500' : 'text-[var(--text-primary)]'
                    )}>
                      {map}
                    </span>

                    {/* Optional stats */}
                    {showStats && stats && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className={cn(
                          'px-2 py-0.5 rounded',
                          stats.winRate >= 50 ? 'bg-success-500/20 text-success-500' : 'bg-danger-500/20 text-danger-500'
                        )}>
                          {stats.winRate?.toFixed(0)}%
                        </span>
                        <span className="text-[var(--text-tertiary)]">
                          {stats.played} games
                        </span>
                      </div>
                    )}

                    {/* Checkbox for multiple */}
                    {multiple && (
                      <div className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center',
                        isSelected(map) 
                          ? 'border-c9-500 bg-c9-500' 
                          : 'border-[var(--border-secondary)]'
                      )}>
                        {isSelected(map) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer for multiple selection */}
          {multiple && (value || []).length > 0 && (
            <div className="border-t border-[var(--border-primary)] mt-2 pt-2 px-4">
              <button
                onClick={() => onChange?.([])}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MapSelector;
