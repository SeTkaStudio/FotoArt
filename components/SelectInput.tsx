
import React from 'react';

interface Option {
    id: string | number;
    name: string;
}

interface SelectInputProps<T extends string | number> {
    label: string;
    value: T;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: Option[];
    disabled?: boolean;
    icon?: React.ReactNode;
}

export const SelectInput = <T extends string | number,>({ label, value, onChange, options, disabled = false, icon }: SelectInputProps<T>) => {
    return (
        <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
            <div className="relative">
                {icon && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        {icon}
                    </div>
                )}
                <select
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-10 py-2.5 text-base text-white bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out appearance-none`}
                >
                    {options.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.name}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                </div>
            </div>
        </div>
    );
};
