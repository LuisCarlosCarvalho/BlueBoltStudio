import type { ProjectStatus } from '@/types'

export interface StatusConfig {
  label: string
  bg: string
  text: string
  border: string
  dot: string
}

export const statusMap: Record<ProjectStatus, StatusConfig> = {
  briefing: {
    label: 'Briefing',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  building: {
    label: 'Em Desenvolvimento',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-[#1463FF]',
  },
  internal_review: {
    label: 'Em Revisão (Interna)',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  client_review: {
    label: 'Em Revisão (Cliente)',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
  },
  approved: {
    label: 'Aprovado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  changes_requested: {
    label: 'Ajustes Solicitados',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  delivered: {
    label: 'Entregue',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
  },
}
