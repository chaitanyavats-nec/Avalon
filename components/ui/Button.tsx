import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'text-sm px-3 py-2',
  md: '',
  lg: 'text-lg px-8 py-4',
};

const variantMap = {
  primary: 'btn-wax',
  outline: 'btn-scroll',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'outline', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${variantMap[variant]} ${sizeMap[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
