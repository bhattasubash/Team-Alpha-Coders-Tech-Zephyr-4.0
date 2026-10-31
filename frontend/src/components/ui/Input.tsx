import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isAiGuessed?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  isAiGuessed = false,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="font-ui text-[13px] font-medium text-ink leading-tight"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={`w-full h-10 px-3 bg-raised border font-ui text-[14px] text-ink placeholder:text-ink-2/60 rounded-[6px] transition-colors focus:outline-none focus:border-violet focus:ring-1 focus:ring-violet disabled:opacity-50 ${
          error
            ? 'border-coral focus:border-coral focus:ring-coral'
            : isAiGuessed
            ? 'border-line-strong border-b-2 border-b-dashed border-b-pink'
            : 'border-line-strong hover:border-ink'
        } ${className}`}
        {...props}
      />

      {error ? (
        <span className="text-[12px] text-coral font-medium leading-tight">
          {error}
        </span>
      ) : helperText ? (
        <span className="flex items-center gap-1.5 font-serif italic text-[12px] text-ink-2 leading-tight">
          {isAiGuessed && <span className="w-1.5 h-1.5 rounded-full bg-pink flex-shrink-0" />}
          <span>{helperText}</span>
        </span>
      ) : null}
    </div>
  );
}
