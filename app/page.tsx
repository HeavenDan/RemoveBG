'use client'

import { useState, FormEvent, useRef, useEffect } from 'react'
import posthog from 'posthog-js'
import KoFiInlineButton from './components/KoFiInlineButton'

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
  const [sourceImageData, setSourceImageData] = useState<ImageData | null>(null)
  
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null)

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
      const t0 = performance.now()
      if (process.env.NODE_ENV === 'production') {
        posthog.capture('upload_started', {
          mode: 'preview',
          mime: file.type,
          size_kb: Math.round(file.size / 1024),
          deviceMemory: (navigator as any).deviceMemory || null,
          userAgent: navigator.userAgent,
          viewport: { w: window.innerWidth, h: window.innerHeight },
          is_mobile: /Mobi|Android/i.test(navigator.userAgent)
        })
      }
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/remove-bg', { method: 'POST', body: fd })
      if (!r.ok) {
        const t = await r.text()
        if (process.env.NODE_ENV === 'production') {
          const t1 = performance.now()
          posthog.capture('upload_failed', {
            stage: 'api',
            error: t || 'Request failed',
            duration_ms: Math.round(t1 - t0)
          })
        }
        throw new Error(t || 'Request failed')
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      setResult(url)
      if (process.env.NODE_ENV === 'production') {
        const t1 = performance.now()
        posthog.capture('upload_succeeded', {
          mode: 'api',
          engine: 'api',
          duration_ms: Math.round(t1 - t0)
        })
      }
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
    setSourceImageData(null)
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
    if (editMode && result && preview && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const resultImg = new Image()
      resultImg.onload = () => {
        canvas.width = resultImg.width
        canvas.height = resultImg.height
        ctx.drawImage(resultImg, 0, 0)
        setOriginalImageData(ctx.getImageData(0, 0, canvas.width, canvas.height))
        
        const sourceImg = new Image()
        sourceImg.onload = () => {
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = resultImg.width
          tempCanvas.height = resultImg.height
          const tempCtx = tempCanvas.getContext('2d')
          if (tempCtx) {
            tempCtx.drawImage(sourceImg, 0, 0, tempCanvas.width, tempCanvas.height)
            setSourceImageData(tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height))
          }
        }
        sourceImg.src = preview
      }
      resultImg.src = result
    }
  }, [editMode, result, preview])

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

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return null

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY
    
    return { x, y }
  }

  const drawAtCoordinates = (x: number, y: number) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

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
              if (sourceImageData) {
                const sourceData = sourceImageData.data
                data[index] = sourceData[index]
                data[index + 1] = sourceData[index + 1]
                data[index + 2] = sourceData[index + 2]
                data[index + 3] = sourceData[index + 3]
              }
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY)
    if (!coords) return
    drawAtCoordinates(coords.x, coords.y)
  }

  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const startTouchDrawing = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      setIsDrawing(true)
      const touch = e.touches[0]
      const coords = getCanvasCoordinates(touch.clientX, touch.clientY)
      if (coords) drawAtCoordinates(coords.x, coords.y)
    } else if (e.touches.length === 2) {
      setIsDrawing(false)
      const distance = getTouchDistance(e.touches[0], e.touches[1])
      setLastPinchDistance(distance)
      setIsPanning(true)
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      setPanStart({ x: midX - panX, y: midY - panY })
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      if (isDrawing) {
        const touch = e.touches[0]
        const coords = getCanvasCoordinates(touch.clientX, touch.clientY)
        if (coords) drawAtCoordinates(coords.x, coords.y)
      }
    } else if (e.touches.length === 2) {
      const distance = getTouchDistance(e.touches[0], e.touches[1])
      if (lastPinchDistance) {
        const scale = distance / lastPinchDistance
        setZoom(prev => Math.min(Math.max(prev * scale, 0.5), 5))
      }
      setLastPinchDistance(distance)
      
      if (isPanning) {
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        setPanX(midX - panStart.x)
        setPanY(midY - panStart.y)
      }
    }
  }

  const stopTouchDrawing = () => {
    setIsDrawing(false)
    setIsPanning(false)
    setLastPinchDistance(null)
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

  const handleDownload = () => {
    if (!result) return
    if (process.env.NODE_ENV === 'production') {
      posthog.capture('download_clicked')
    }
    
    fetch(result)
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = 'no-bg.png'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      })
      .catch(err => {
        console.error('Download error:', err)
        setError('Failed to download image')
      })
  }

  return (
    <div className="main-container" style={{ fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,"Noto Sans",sans-serif', margin: 0, background: '#0b1021', color: '#e7e9ee', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '32px' }}>
      <div className="card-container" style={{ width: '100%', maxWidth: '1000px', background: '#121832', border: '1px solid #1e2748', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.35)', padding: '32px' }}>
        <h1 style={{ fontSize: '28px', margin: '0 0 12px' }}>Remove background</h1>
        <p style={{ margin: '0 0 24px', color: '#aab3c5', fontSize: '15px' }}>Upload an image and get a transparent PNG.</p>
        <div className="content-wrapper" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div className="section" style={{ flex: 1, minWidth: '320px' }}>
            {!result && (
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
            )}
            {error && <div style={{ color: '#ff6b6b', marginTop: '16px', fontSize: '14px' }}>{error}</div>}
            {!result && (
              <div style={{ marginTop: '24px' }}>
                <KoFiInlineButton />
              </div>
            )}
            
            {result && !editMode && (
              <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleDownload} type="button" style={{ flex: 1, padding: '14px 20px', border: 0, borderRadius: '10px', background: '#4f6af7', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>Download PNG</button>
                  <button onClick={handleReset} type="button" style={{ padding: '14px 20px', border: 0, borderRadius: '10px', background: '#4f6af7', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>Reset</button>
                </div>
                <button onClick={() => setEditMode(true)} type="button" style={{ width: '100%', padding: '14px 20px', border: 0, borderRadius: '10px', background: '#10b981', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>✏️ Edit with Brush</button>
              </div>
            )}

            {editMode && (
              <div style={{ padding: '16px', background: '#0d1430', borderRadius: '10px', border: '1px solid #1e2748' }}>
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
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '8px 0 0', lineHeight: '1.4' }}>💡 Desktop: Hold Shift + move/scroll | Mobile: Two fingers to zoom/pan</p>
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
                    ✨ Restore
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={applyEdits} type="button" style={{ flex: 1, padding: '12px', border: 0, borderRadius: '8px', background: '#10b981', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>✓ Apply</button>
                  <button onClick={cancelEdits} type="button" style={{ flex: 1, padding: '12px', border: 0, borderRadius: '8px', background: '#6b7280', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>✕ Cancel</button>
                </div>
              </div>
            )}
          </div>
          <div className="section" style={{ flex: 1, minWidth: '320px' }}>
            <div 
              ref={containerRef}
              className="preview-container"
              onWheel={editMode ? handleWheel : undefined}
              style={{ border: '1px solid #1e2748', borderRadius: '12px', overflow: 'hidden', background: '#0d1430', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', maxHeight: '600px', position: 'relative' }}
            >
              {editMode && result ? (
                <div style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: 'center', transition: isPanning ? 'none' : 'transform 0.1s' }}>
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startTouchDrawing}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={stopTouchDrawing}
                    onTouchCancel={stopTouchDrawing}
                    style={{ maxWidth: '100%', maxHeight: '100%', height: 'auto', width: 'auto', display: 'block', cursor: isPanning ? 'grabbing' : 'crosshair', touchAction: 'none' }}
                  />
                </div>
              ) : result ? (
                <img src={result} alt="Result" style={{ maxWidth: '100%', maxHeight: '100%', height: 'auto', width: 'auto', display: 'block', objectFit: 'contain' }} />
              ) : preview ? (
                <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', height: 'auto', width: 'auto', display: 'block', opacity: 0.7, objectFit: 'contain' }} />
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
