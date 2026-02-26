// Settings Page - Application Configuration
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  Sun, Moon, Monitor, Palette, Eye,
  Check, ChevronRight,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function SettingSection({ title, description, icon: Icon, children }) {
  return (
    <motion.div
      variants={itemVariants}
      className="p-6 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)]"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-c9-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-c9-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
      <div className="space-y-4 ml-14">
        {children}
      </div>
    </motion.div>
  );
}

function ToggleSwitch({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-[var(--text-primary)]">{label}</div>
        {description && <div className="text-xs text-[var(--text-tertiary)]">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          enabled ? 'bg-c9-500' : 'bg-[var(--surface-tertiary)]'
        }`}
      >
        <motion.div
          animate={{ x: enabled ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}

function ThemeOption({ theme, currentTheme, onSelect, icon: Icon, label }) {
  const isSelected = currentTheme === theme;
  
  return (
    <button
      onClick={() => onSelect(theme)}
      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
        isSelected 
          ? 'border-c9-500 bg-c9-500/10' 
          : 'border-[var(--border-primary)] hover:border-c9-500/50'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        isSelected ? 'bg-c9-500/20' : 'bg-[var(--surface-secondary)]'
      }`}>
        <Icon className={`w-6 h-6 ${isSelected ? 'text-c9-500' : 'text-[var(--text-secondary)]'}`} />
      </div>
      <span className={`text-sm font-medium ${isSelected ? 'text-c9-500' : 'text-[var(--text-secondary)]'}`}>
        {label}
      </span>
      {isSelected && <Check className="w-4 h-4 text-c9-500" />}
    </button>
  );
}

export function SettingsPage() {
  const { theme, setTheme, resetToSystem } = useTheme();
  
  // Local settings state
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem('c9-scout-settings');
    return stored ? JSON.parse(stored) : {
      animations: true,
      compactMode: false,
      showDataTables: true,
      autoRefresh: false,
    };
  });

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('c9-scout-settings', JSON.stringify(newSettings));
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-3xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Settings</h1>
        <p className="text-[var(--text-secondary)]">
          Customize your dashboard experience
        </p>
      </motion.div>

      {/* Appearance Section */}
      <SettingSection
        title="Appearance"
        description="Customize the look and feel of the dashboard"
        icon={Palette}
      >
        <div className="mb-4">
          <div className="text-sm font-medium text-[var(--text-primary)] mb-3">Theme</div>
          <div className="flex gap-3">
            <ThemeOption
              theme="light"
              currentTheme={theme}
              onSelect={setTheme}
              icon={Sun}
              label="Light"
            />
            <ThemeOption
              theme="dark"
              currentTheme={theme}
              onSelect={setTheme}
              icon={Moon}
              label="Dark"
            />
          </div>
          <button
            onClick={resetToSystem}
            className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-c9-500 transition-colors"
          >
            <Monitor className="w-4 h-4" />
            Use system preference
          </button>
        </div>

        <ToggleSwitch
          enabled={settings.animations}
          onChange={(v) => updateSetting('animations', v)}
          label="Enable animations"
          description="Smooth transitions and motion effects"
        />
        
        <ToggleSwitch
          enabled={settings.compactMode}
          onChange={(v) => updateSetting('compactMode', v)}
          label="Compact mode"
          description="Reduce spacing for more data density"
        />
      </SettingSection>

      {/* Data Display Section */}
      <SettingSection
        title="Data Display"
        description="Configure how data is shown in analytics"
        icon={Eye}
      >
        <ToggleSwitch
          enabled={settings.showDataTables}
          onChange={(v) => updateSetting('showDataTables', v)}
          label="Show data tables"
          description="Display raw data alongside visualizations"
        />
        
        <ToggleSwitch
          enabled={settings.autoRefresh}
          onChange={(v) => updateSetting('autoRefresh', v)}
          label="Auto-refresh data"
          description="Automatically update data every 5 minutes"
        />
      </SettingSection>
    </motion.div>
  );
}

export default SettingsPage;
