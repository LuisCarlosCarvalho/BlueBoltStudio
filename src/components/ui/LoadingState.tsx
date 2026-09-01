import React from 'react'
import { Loader2 } from 'lucide-react'

export interface LoadingStateProps {
  message?: string
  fullPage?: boolean
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'A carregar...',
  fullPage = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-blue-100 border-t-[#1463FF] rounded-full animate-spin" />
        <Loader2 className="w-4 h-4 text-[#1463FF] absolute" />
      </div>
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  )

  if (fullPage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        {content}
      </div>
    )
  }

  return content
}
