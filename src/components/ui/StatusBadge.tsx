import React from 'react'
import { clsx } from 'clsx'
import type { ProjectStatus } from '@/types'
import { statusMap } from './statusConfig'

export interface StatusBadgeProps {
  status: ProjectStatus
  className?: string
  size?: 'sm' | 'md'
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  size = 'md',
}) => {
  const config = statusMap[status] || {
    label: status,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        config.bg,
        config.text,
        config.border,
        sizeClasses,
        className
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
      <span>{config.label}</span>
    </span>
  )
}
