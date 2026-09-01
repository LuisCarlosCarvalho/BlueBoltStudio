import React from 'react'
import { clsx } from 'clsx'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'bordered'
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white rounded-[12px] border border-slate-200/80 shadow-xs',
    flat: 'bg-slate-50/70 rounded-[12px] border border-slate-200',
    bordered: 'bg-white rounded-[12px] border-2 border-slate-200',
  }

  return (
    <div className={clsx(variantStyles[variant], className)} {...props}>
      {children}
    </div>
  )
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={clsx('p-5 border-b border-slate-100 flex items-center justify-between', className)} {...props}>
      {children}
    </div>
  )
}

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <h3 className={clsx('text-base font-semibold text-slate-900', className)} {...props}>
      {children}
    </h3>
  )
}

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <p className={clsx('text-xs text-slate-500 mt-0.5', className)} {...props}>
      {children}
    </p>
  )
}

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={clsx('p-5', className)} {...props}>
      {children}
    </div>
  )
}

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={clsx('px-5 py-3.5 bg-slate-50/50 rounded-b-[12px] border-t border-slate-100 flex items-center', className)} {...props}>
      {children}
    </div>
  )
}
