import { forwardRef } from 'react'
import { clsx } from 'clsx'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 tracking-wide uppercase"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-[10px] border text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-0 px-3.5 py-2.5 min-h-[90px]',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-200 focus:border-[#1463FF] focus:ring-[#1463FF]/20',
            props.disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-red-600 mt-1">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-slate-500 mt-1">{helperText}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
