import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'outline', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50 disabled:pointer-events-none';
    
    const variants = {
      primary: 'bg-gold text-bg-deep hover:bg-parchment',
      outline: 'border border-gold-dim text-gold hover:border-gold hover:text-parchment hover:shadow-glow-gold bg-bg-surface bg-opacity-50 backdrop-blur-sm',
      danger: 'border border-crimson text-crimson-bright hover:border-crimson-bright hover:shadow-glow-crimson hover:text-white bg-bg-surface bg-opacity-50 backdrop-blur-sm',
      ghost: 'text-parchment-dim hover:text-parchment hover:bg-bg-surface',
    };

    const sizes = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-6 text-base min-w-[44px]', // 44px min for mobile touch target
      lg: 'h-14 px-8 text-lg min-w-[44px]',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
