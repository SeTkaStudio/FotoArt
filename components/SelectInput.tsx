
import React from 'react';

interface SelectInputProps<T extends string> {
  label: string;
  description?: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
}

export const SelectInput = <T extends string,>({ label, description, options, value, onChange }: SelectInputProps<T>) => {
  return (
    <div>
      <label htmlFor={label} className="block text-sm font-medium text-brand-text-secondary">
        {label}
      </label>
      <select
        id={label}
        name={label}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-brand-secondary border-gray-600 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm rounded-md text-brand-text-primary"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      {description && <p className="mt-2 text-xs text-brand-text-secondary">{description}</p>}
    </div>
  );
};
