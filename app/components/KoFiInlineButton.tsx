'use client'

import posthog from 'posthog-js'

export default function KoFiInlineButton() {
  const onClick = () => {
    if (process.env.NODE_ENV === 'production') {
      posthog.capture('kofi_clicked', { placement: 'page' })
    }
    window.open('https://ko-fi.com/dksheaven', '_blank', 'noopener,noreferrer')
  }
  return (
    <button
      onClick={onClick}
      type="button"
      style={{ width: '100%', padding: '12px 16px', border: '1px solid #33406b', borderRadius: '10px', background: '#1e2748', color: '#aab3c5', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}
    >
      ☕ Support on Ko‑fi
    </button>
  )
}


