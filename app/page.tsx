'use client'

import { useState, FormEvent } from 'react'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!file) {
      setError('Choose a file')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/remove-bg', { method: 'POST', body: fd })
      if (!r.ok) {
        const t = await r.text()
        throw new Error(t || 'Request failed')
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      setResult(url)
    } catch (err: any) {
      setError('Error: ' + (err?.message || 'Unknown'))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError('')
  }

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,"Noto Sans",sans-serif', margin: 0, background: '#0b1021', color: '#e7e9ee', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '720px', background: '#121832', border: '1px solid #1e2748', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.35)', padding: '24px' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 16px' }}>Remove background</h1>
        <p style={{ margin: '0 0 16px', color: '#aab3c5' }}>Upload an image and get a transparent PNG.</p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ flex: 1, padding: '10px', border: '1px dashed #33406b', borderRadius: '10px', background: '#0d1430', color: '#e7e9ee' }}
                />
                <button type="submit" disabled={loading} style={{ padding: '12px 16px', border: 0, borderRadius: '10px', background: '#4f6af7', color: 'white', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Processing...' : 'Remove'}
                </button>
              </div>
            </form>
            {error && <div style={{ color: '#ff6b6b', marginTop: '12px' }}>{error}</div>}
            {result && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <a href={result} download="no-bg.png" style={{ textDecoration: 'none' }}>
                  <button type="button" style={{ padding: '12px 16px', border: 0, borderRadius: '10px', background: '#4f6af7', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Download PNG</button>
                </a>
                <button onClick={handleReset} type="button" style={{ padding: '12px 16px', border: 0, borderRadius: '10px', background: '#4f6af7', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Reset</button>
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ marginTop: '16px', border: '1px solid #1e2748', borderRadius: '12px', overflow: 'hidden', background: '#0d1430', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px' }}>
              {result ? (
                <img src={result} alt="" style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
              ) : (
                <span>No image</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

