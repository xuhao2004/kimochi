'use client';

import React, { forwardRef } from 'react';

interface AppleInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  maxLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
}

const AppleInput = forwardRef<HTMLInputElement, AppleInputProps>(({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  type = 'text',
  disabled = false,
  required = false,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  inputClassName = '',
  maxLength,
  autoComplete,
  autoFocus = false,
  ...props
}, ref) => {
  const hasError = !!error;
  
  return (
    <div className={`w-full ${className}`}>
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* 输入框容器 */}
      <div className="relative">
        {/* 左侧图标 */}
        {leftIcon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10">
            {leftIcon}
          </div>
        )}

        {/* 输入框 */}
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className={`
            w-full px-4 py-4 bg-gray-50/80 border border-gray-200/80 rounded-2xl
            focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500/60 
            transition-all duration-200
            ${disabled 
              ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500' 
              : 'hover:bg-gray-50 hover:border-gray-300/80'
            }
            ${hasError 
              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500/60 bg-red-50/30' 
              : ''
            }
            ${leftIcon ? 'pl-12' : ''}
            ${rightIcon ? 'pr-12' : ''}
            shadow-sm text-gray-900 placeholder-gray-400
            text-base leading-tight
            ${inputClassName}
          `}
          {...props}
        />

        {/* 右侧图标 */}
        {rightIcon && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 z-10">
            {rightIcon}
          </div>
        )}
      </div>

      {/* 错误信息和帮助文本 */}
      {(error || helperText) && (
        <div className="mt-2">
          {error && (
            <p className="text-sm text-red-600 flex items-center space-x-1">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </p>
          )}
          {!error && helperText && (
            <p className="text-sm text-gray-500">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
});

AppleInput.displayName = 'AppleInput';

export default AppleInput;
