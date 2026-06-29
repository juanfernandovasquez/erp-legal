import React, { useId, useRef, useState, useCallback } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  helpText?: string
  // value: yyyy-mm-dd  |  onChange: e.target.value = yyyy-mm-dd  (igual que input nativo)
}

/** yyyy-mm-dd → dd/mm/yyyy */
function toDisplay(iso: string | undefined): string {
  if (!iso) return ''
  const d = String(iso).slice(0, 10)
  if (d.length < 10 || d[4] !== '-' || d[7] !== '-') return ''
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    { label, error, helpText, value, id: idProp, onFocus, onBlur, onChange, name, required, disabled, ...props },
    ref
  ) => {
    const uid = useId()
    const inputId = idProp || uid
    const [focused, setFocused] = useState(false)
    const internalRef = useRef<HTMLInputElement>(null)

    // Combina la ref externa (de RHF u otros) con la interna
    const mergedRef = useCallback(
      (el: HTMLInputElement | null) => {
        ;(internalRef as React.MutableRefObject<HTMLInputElement | null>).current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el
      },
      [ref]
    )

    const displayValue = toDisplay(value as string)

    const openPicker = () => {
      if (disabled) return
      internalRef.current?.focus()
      try {
        // showPicker() abre el calendario nativo del navegador
        ;(internalRef.current as any)?.showPicker()
      } catch {
        // Fallback para navegadores sin showPicker
        internalRef.current?.click()
      }
    }

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 mb-1.5 cursor-pointer"
          >
            {label}
          </label>
        )}

        {/* Wrapper relativo: el input nativo se superpone al div visual para anclar el picker en el lugar correcto */}
        <div className="relative">
          {/* Área visual — el click abre el calendario */}
          <div
            onClick={openPicker}
            className={cn(
              'flex items-center gap-2 px-3 py-2 border rounded-md transition-colors cursor-pointer bg-white select-none',
              focused
                ? 'ring-2 ring-primary-500 border-transparent'
                : error
                  ? 'border-red-500'
                  : 'border-slate-300',
              disabled && 'opacity-50 cursor-not-allowed bg-slate-50'
            )}
          >
            <span className={cn('flex-1 text-sm', displayValue ? 'text-slate-900' : 'text-slate-400')}>
              {displayValue || 'dd/mm/yyyy'}
            </span>
            <Calendar size={15} className="text-slate-400 flex-shrink-0" />
          </div>

          {/* Input nativo posicionado encima del div visual — el browser ancla el picker aquí */}
          <input
            ref={mergedRef}
            id={inputId}
            type="date"
            name={name}
            required={required}
            disabled={disabled}
            value={value !== undefined ? String(value) : ''}
            onChange={onChange}
            onFocus={(e) => { setFocused(true); onFocus?.(e) }}
            onBlur={(e) => { setFocused(false); onBlur?.(e) }}
            tabIndex={-1}
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' }}
            {...props}
          />
        </div>

        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helpText && !error && <p className="mt-1 text-sm text-slate-500">{helpText}</p>}
      </div>
    )
  }
)

DateInput.displayName = 'DateInput'
