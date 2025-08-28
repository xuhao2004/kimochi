'use client';

import React, { forwardRef } from 'react';

interface AppleTextareaProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  textareaClassName?: string;
  rows?: number;
  maxLength?: number;
  autoFocus?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const AppleTextarea = forwardRef<HTMLTextAreaElement, AppleTextareaProps>(({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  error,
  helperText,
  className = '',
  textareaClassName = '',
  rows = 4,
  maxLength,
  autoFocus = false,
  resize = 'vertical',
  ...props
}, ref) => {
  const hasError = !!error;
  const currentLength = value?.length || 0;
  
  return (
    <div className={`w-full ${className}`}>
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* 文本域容器 */}
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          autoFocus={autoFocus}
          rows={rows}
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
            shadow-sm text-gray-900 placeholder-gray-400
            text-base leading-relaxed
            ${resize === 'none' ? 'resize-none' : 
              resize === 'vertical' ? 'resize-y' : 
              resize === 'horizontal' ? 'resize-x' : 'resize'
            }
            ${textareaClassName}
          `}
          style={{ minHeight: `${rows * 1.5}rem` }}
          {...props}
        />

        {/* 字符计数 */}
        {maxLength && (
          <div className={`absolute bottom-3 right-4 text-xs font-medium ${
            currentLength > maxLength * 0.8 
              ? currentLength >= maxLength
                ? 'text-red-500'
                : 'text-orange-500'
              : 'text-gray-400'
          }`}>
            {currentLength}/{maxLength}
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

AppleTextarea.displayName = 'AppleTextarea';

export default AppleTextarea;
