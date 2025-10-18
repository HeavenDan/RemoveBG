'use client'

import { useState, FormEvent, useRef, useEffect } from 'react'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  
  const [editMode, setEditMode] = useState(false)
  const [brushSize, setBrushSize] = useState(20)
  const [brushMode, setBrushMode] = useState<'erase' | 'restore'>('erase')
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null)
  
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!file) {
      setError('Choose a file')
      return
    }

    setLoading(true)
    setResult(null)
    setEditMode(false)

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
    setPreview(null)
    setResult(null)
    setError('')
    setEditMode(false)
    setOriginalImageData(null)
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)
    setResult(null)
    
    if (selectedFile) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  useEffect(() => {
    if (editMode && result && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const img = new Image()
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        setOriginalImageData(ctx.getImageData(0, 0, canvas.width, canvas.height))
      }
      img.src = result
    }
  }, [editMode, result])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.shiftKey) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY })
    } else {
      setIsDrawing(true)
      draw(e)
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    setIsPanning(false)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPanX(e.clientX - panStart.x)
      setPanY(e.clientY - panStart.y)
    } else if (isDrawing) {
      draw(e)
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5))
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    for (let i = -brushSize; i < brushSize; i++) {
      for (let j = -brushSize; j < brushSize; j++) {
        if (i * i + j * j <= brushSize * brushSize) {
          const px = Math.floor(x + i)
          const py = Math.floor(y + j)
          
          if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
            const index = (py * canvas.width + px) * 4
            
            if (brushMode === 'erase') {
              data[index + 3] = 0
            } else {
              if (originalImageData) {
                const origData = originalImageData.data
                data[index] = origData[index]
                data[index + 1] = origData[index + 1]
                data[index + 2] = origData[index + 2]
                data[index + 3] = origData[index + 3]
              }
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }

  const applyEdits = () => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const editedUrl = canvas.toDataURL('image/png')
    setResult(editedUrl)
    setEditMode(false)
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  const cancelEdits = () => {
    setEditMode(false)
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  const resetZoom = () => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,"Noto Sans",sans-serif', margin: 0, background: '#0b1021', color: '#e7e9ee', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '32px' }}>
      <div style={{ width: '100%', maxWidth: '1000px', background: '#121832', border: '1px solid #1e2748', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.35)', padding: '32px' }}>
        <h1 style={{ fontSize: '28px', margin: '0 0 12px' }}>Remove background</h1>
        <p style={{ margin: '0 0 24px', color: '#aab3c5', fontSize: '15px' }}>Upload an image and get a transparent PNG.</p>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '320px' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flexDirection: 'column' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ padding: '12px', border: '1px dashed #33406b', borderRadius: '10px', background: '#0d1430', color: '#e7e9ee', fontSize: '14px' }}
                />
                <button type="submit" disabled={loading || editMode} style={{ padding: '14px 20px', border: 0, borderRadius: '10px', background: '#4f6af7', color: 'white', fontWeight: 600, cursor: (loading || editMode) ? 'not-allowed' : 'pointer', opacity: (loading || editMode) ? 0.6 : 1, fontSize: '15px' }}>
                  {loading ? 'Processing...' : 'Remove'}
                </button>
              </div>
            </form>
            {error && <div style={{ color: '#ff6b6b', marginTop: '16px', fontSize: '14px' }}>{error}</div>}
            
            {result && !editMode && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <a href={result} download="no-bg.png" style={{ textDecoration: 'none', flex: 1 }}>
                    <button type="button" style={{ width: '100%', padding: '14px 20px', border: 0, borderRadius: '10px', background: '#4f6af7', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>Download PNG</button>
                  </a>
                  <button onClick={handleReset} type="button" style={{ padding: '14px 20px', border: 0, borderRadius: '10px', background: '#4f6af7', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>Reset</button>
                </div>
                <button onClick={() => setEditMode(true)} type="button" style={{ width: '100%', padding: '14px 20px', border: 0, borderRadius: '10px', background: '#10b981', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>✏️ Edit with Brush</button>
              </div>
            )}

            {editMode && (
              <div style={{ marginTop: '16px', padding: '16px', background: '#0d1430', borderRadius: '10px', border: '1px solid #1e2748' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aab3c5' }}>Zoom: {zoom.toFixed(1)}x</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))} style={{ padding: '8px 12px', border: 0, borderRadius: '6px', background: '#1e2748', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>−</button>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <button onClick={() => setZoom(prev => Math.min(prev + 0.25, 5))} style={{ padding: '8px 12px', border: 0, borderRadius: '6px', background: '#1e2748', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>+</button>
                    <button onClick={resetZoom} style={{ padding: '8px 12px', border: 0, borderRadius: '6px', background: '#1e2748', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>Reset</button>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '8px 0 0', lineHeight: '1.4' }}>💡 Scroll to zoom, hold Shift to pan or erase/restore</p>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aab3c5' }}>Brush Size: {brushSize}px</label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    onClick={() => setBrushMode('erase')}
                    style={{ flex: 1, padding: '10px', border: 0, borderRadius: '8px', background: brushMode === 'erase' ? '#ef4444' : '#1e2748', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
                  >
                    🗑️ Erase
                  </button>
                  <button
                    onClick={() => setBrushMode('restore')}
                    style={{ flex: 1, padding: '10px', border: 0, borderRadius: '8px', background: brushMode === 'restore' ? '#10b981' : '#1e2748', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
                  >
                    ↩️ Restore
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={applyEdits} type="button" style={{ flex: 1, padding: '12px', border: 0, borderRadius: '8px', background: '#10b981', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>✓ Apply</button>
                  <button onClick={cancelEdits} type="button" style={{ flex: 1, padding: '12px', border: 0, borderRadius: '8px', background: '#6b7280', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>✕ Cancel</button>
                </div>
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: '320px' }}>
            <div 
              ref={containerRef}
              onWheel={editMode ? handleWheel : undefined}
              style={{ border: '1px solid #1e2748', borderRadius: '12px', overflow: 'hidden', background: '#0d1430', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', position: 'relative' }}
            >
              {editMode && result ? (
                <div style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: 'center', transition: isPanning ? 'none' : 'transform 0.1s' }}>
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ maxWidth: '100%', height: 'auto', display: 'block', cursor: isPanning ? 'grabbing' : 'crosshair' }}
                  />
                </div>
              ) : result ? (
                <img src={result} alt="Result" style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
              ) : preview ? (
                <img src={preview} alt="Preview" style={{ maxWidth: '100%', height: 'auto', display: 'block', opacity: 0.7 }} />
              ) : (
                <span style={{ color: '#6b7280' }}>No image</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
