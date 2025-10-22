'use client'

import { useEffect, useState } from 'react'

export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile('matches' in e ? e.matches : (e as MediaQueryList).matches)
    onChange(mq)
    if (mq.addEventListener) mq.addEventListener('change', onChange as (e: MediaQueryListEvent) => void)
    else mq.addListener(onChange as any)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange as (e: MediaQueryListEvent) => void)
      else mq.removeListener(onChange as any)
    }
  }, [breakpoint])
  return isMobile
}


