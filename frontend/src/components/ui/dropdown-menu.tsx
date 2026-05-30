import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
}

export function DropdownMenu({ trigger, children, align = 'right' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <div onClick={() => setOpen(!open)} className="inline-flex items-center justify-center cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          className={cn(
            'absolute top-full mt-2 rounded-md shadow-lg bg-white border border-slate-200 z-50 min-w-[200px]',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors',
        'border-b border-slate-100 last:border-0',
        className
      )}
      {...props}
    />
  )
)

DropdownMenuItem.displayName = 'DropdownMenuItem'

interface DropdownMenuCheckboxItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export const DropdownMenuCheckboxItem = React.forwardRef<HTMLInputElement, DropdownMenuCheckboxItemProps>(
  ({ className, label, checked, onChange, ...props }, ref) => (
    <label className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border-b border-slate-100 last:border-0">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mr-2 h-4 w-4 rounded border-slate-300"
        {...props}
      />
      {label}
    </label>
  )
)

DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem'

interface DropdownMenuSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('h-px bg-slate-200 my-1', className)} {...props} />
  )
)

DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'
