// Team Selector Component
import { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/helpers';
import { ChevronDown, Search, X, Users } from 'lucide-react';

export function TeamSelector({
  teams = [],
  value,
  onChange,
  placeholder = 'Select team...',
  loading = false,
  disabled = false,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  // Filter teams by search
  const filteredTeams = teams.filter(team =>
    team.toLowerCase().includes(search.toLowerCase())
  );

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

  const handleSelect = (team) => {
    onChange?.(team);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.(null);
    setSearch('');
  };

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || loading}
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
          <Users className="w-5 h-5 text-[var(--text-tertiary)] flex-shrink-0" />
          <span className={cn(
            'truncate',
            value ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
          )}>
            {value || placeholder}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {value && (
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
          {/* Search */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teams..."
                className="w-full pl-9 pr-4 py-2 bg-[var(--surface-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-c9-500/50 focus:border-c9-500"
                autoFocus
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {filteredTeams.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--text-tertiary)] text-center">
                No teams found
              </div>
            ) : (
              filteredTeams.map((team) => (
                <button
                  key={team}
                  onClick={() => handleSelect(team)}
                  className={cn(
                    'w-full px-4 py-2.5 text-left text-sm transition-colors',
                    'hover:bg-c9-500/10 focus:outline-none focus:bg-c9-500/10',
                    team === value ? 'text-c9-500 bg-c9-500/5' : 'text-[var(--text-primary)]'
                  )}
                >
                  {team}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamSelector;
