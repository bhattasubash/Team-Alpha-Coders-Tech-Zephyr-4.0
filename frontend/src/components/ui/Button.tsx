import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  let baseClasses =
    'inline-flex items-center justify-center font-ui text-[13px] font-medium tracking-tight h-9 px-4 rounded-[6px] select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-40 disabled:cursor-not-allowed';

  switch (variant) {
    case 'primary':
      baseClasses +=
        ' bg-violet text-white hover:bg-violet/90 hover:glow-violet active:scale-[0.98] shadow-sm';
      break;

    case 'secondary':
      baseClasses +=
        ' bg-surface/60 backdrop-blur-sm text-ink border border-line hover:border-violet/50 hover:text-violet active:bg-raised shadow-xs';
      break;

    case 'destructive':
      baseClasses +=
        ' bg-coral text-ink hover:bg-coral/90 hover:shadow-[0_0_15px_rgba(239,136,105,0.3)] active:scale-[0.98] font-medium shadow-xs';
      break;

    case 'ghost':
      baseClasses += ' bg-transparent text-ink hover:bg-surface/80 hover:text-violet';
      break;
  }

  return (
    <button className={`${baseClasses} ${className}`} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
