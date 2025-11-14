
import React from 'react';

interface ToggleSwitchProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  description?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, enabled, onChange, description }) => {
  return (
    <div>
      <label className="flex items-center justify-between cursor-pointer">
        <span className="block text-sm font-medium text-brand-text-secondary">{label}</span>
        <div className="relative">
          <input type="checkbox" className="sr-only" checked={enabled} onChange={() => onChange(!enabled)} />
          <div className={`block w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-brand-accent' : 'bg-brand-primary'}`}></div>
          <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enabled ? 'translate-x-6' : ''}`}></div>
        </div>
      </label>
      {description && <p className="mt-2 text-xs text-brand-text-secondary">{description}</p>}
    </div>
  );
};
