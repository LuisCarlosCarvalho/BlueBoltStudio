import React from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-[10px]'

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  }

  const variantStyles = {
    primary:
      'bg-[#1463FF] hover:bg-[#0D4ED8] text-white shadow-sm hover:shadow focus:ring-[#1463FF] active:scale-[0.98]',
    secondary:
      'bg-[#064B88] hover:bg-[#042A4D] text-white shadow-sm focus:ring-[#064B88] active:scale-[0.98]',
    outline:
      'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-[#1463FF]',
    danger:
      'bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-red-500 active:scale-[0.98]',
    ghost:
      'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-300',
  }

  return (
    <button
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  )
}
