"use client";

import React from 'react';

interface AppleSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; icon?: string }[];
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  size?: 'default' | 'compact';
  iconOnly?: boolean;
}

export default function AppleSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = "请选择", 
  label,
  className = "",
  disabled = false,
  size = 'default',
  iconOnly = false
}: AppleSelectProps) {
  const isCompact = size === 'compact';
  return (
    <div className={`relative inline-flex ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            ${iconOnly ? 'w-auto max-w-[64px] px-2 py-2 pr-7 min-h-[34px] text-base text-center' : (isCompact ? 'w-full px-3 py-2.5 pr-9 min-h-[40px] text-sm' : 'w-full px-4 py-4 pr-10 min-h-[56px] text-sm')}
            bg-gray-50/80 backdrop-blur-md
            border border-gray-200/80
            rounded-2xl
            text-gray-900 font-medium
            focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500/40
            focus:outline-none focus:bg-white
            transition-all duration-300 ease-in-out
            appearance-none
            shadow-sm hover:shadow-lg hover:bg-white
            hover:border-gray-300/70
            ${value ? 'text-gray-900' : 'text-gray-500'}
            ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100/60' : ''}
          `}
        >
          <option value="" className="text-gray-500">
            {placeholder}
          </option>
          {options.map((option) => {
            const text = iconOnly
              ? (option.icon ? `${option.icon}` : option.label)
              : (option.icon ? `${option.icon} ${option.label}` : option.label);
            return (
              <option
                key={option.value}
                value={option.value}
                className={iconOnly ? 'text-gray-900 py-1 text-base' : 'text-gray-900 py-2'}
              >
                {text}
              </option>
            );
          })}
        </select>
        
        {/* 自定义下拉箭头 */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 pointer-events-none">
          <div className={`${iconOnly ? 'w-5 h-5' : (isCompact ? 'w-6 h-6' : 'w-6 h-6')} rounded-full bg-gray-100/80 flex items-center justify-center`}>
            <svg 
              className={`${iconOnly ? 'w-3.5 h-3.5' : (isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4')} text-gray-500 transition-all duration-300 ease-in-out`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M19 9l-7 7-7-7" 
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}