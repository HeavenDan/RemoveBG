'use client'

import posthog from 'posthog-js'

export default function KoFiButton() {
  const onClick = () => {
    if (process.env.NODE_ENV === 'production') {
      posthog.capture('kofi_clicked', { placement: 'floating' })
    }
  }
  return (
    <a
      href="https://ko-fi.com/dksheaven"
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      style={{ position: 'fixed', right: '16px', bottom: '16px', zIndex: 50, padding: '10px 14px', background: '#1e2748', color: '#aab3c5', borderRadius: '999px', textDecoration: 'none', fontWeight: 700, border: '1px solid #33406b', boxShadow: '0 6px 18px rgba(0,0,0,.25)', opacity: 0.95 }}
      aria-label="Support on Ko-fi"
    >
      ☕ Support on Ko‑fi
    </a>
  )
}


