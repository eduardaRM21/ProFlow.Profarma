import { useRef, useCallback } from 'react'

interface UseLongPressOptions {
  onLongPress: (event: MouseEvent | TouchEvent) => void
  onClick?: (event: MouseEvent | TouchEvent) => void
  delay?: number
  shouldPreventDefault?: boolean
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 1000, // 1 segundo por padrão
  shouldPreventDefault = true,
}: UseLongPressOptions) {
  const timeout = useRef<NodeJS.Timeout | null>(null)
  const target = useRef<EventTarget | null>(null)

  const start = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (shouldPreventDefault && event.target) {
        event.preventDefault()
      }
      target.current = event.target
      timeout.current = setTimeout(() => {
        onLongPress(event.nativeEvent)
      }, delay)
    },
    [onLongPress, delay, shouldPreventDefault]
  )

  const clear = useCallback(
    (event: React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current)
      if (shouldTriggerClick && onClick && event.target === target.current) {
        onClick(event.nativeEvent)
      }
    },
    [onClick]
  )

  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
  }
}

