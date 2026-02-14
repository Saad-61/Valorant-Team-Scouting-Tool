/**
 * Team Required Prompt Component
 * 
 * Displays a message prompting users to select a team before viewing data.
 * Used on pages that require team context to show meaningful analytics.
 */

import { Users, Search, Target } from 'lucide-react';

export function TeamRequiredPrompt({ 
  title = "Select a Team to Begin",
  subtitle = "Choose a team from the dropdown above to view detailed analytics and insights.",
  icon: Icon = Users,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-c9-500/20 to-c9-600/20 flex items-center justify-center mb-6 shadow-c9-glow">
        <Icon className="w-10 h-10 text-c9-500" />
      </div>
      
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3 text-center">
        {title}
      </h2>
      
      <p className="text-[var(--text-secondary)] text-center max-w-md mb-8">
        {subtitle}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full">
        <FeatureCard
          icon={Search}
          title="Opponent Analysis"
          description="Discover exploitable weaknesses and tendencies"
        />
        <FeatureCard
          icon={Target}
          title="Performance Metrics"
          description="Deep dive into stats and win rates"
        />
        <FeatureCard
          icon={Users}
          title="Player Insights"
          description="Individual player breakdowns and comparisons"
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="p-4 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl text-center hover:border-c9-500/30 transition-colors">
      <Icon className="w-6 h-6 text-c9-500 mx-auto mb-2" />
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--text-tertiary)]">{description}</p>
    </div>
  );
}

export default TeamRequiredPrompt;
