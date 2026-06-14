import { useEffect, useRef } from 'react'

export function useEscapeKey(onEscape: () => void, enabled = true) {
  const callbackRef = useRef(onEscape)
  callbackRef.current = onEscape

  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') callbackRef.current()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [enabled])
}
