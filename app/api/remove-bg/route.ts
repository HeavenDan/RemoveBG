import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { phCapture } from '@/app/lib/ph-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const mode = (formData.get('mode') as string) || 'preview'
    
    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    const apiKey = (process.env.REMOVEBG_KEY || '').trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'Server misconfigured: REMOVEBG_KEY missing' }, { status: 500 })
    }

    const cookieStore = await cookies()
    let deviceId = cookieStore.get('deviceId')?.value
    const shouldSetDeviceId = !deviceId
    if (!deviceId) deviceId = crypto.randomUUID()

    const apiFormData = new FormData()
    apiFormData.append('image_file', file)
    apiFormData.append('size', mode === 'full' ? 'auto' : 'preview')

    const t0 = Date.now()
    const r = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey
      },
      body: apiFormData
    })
    const duration = Date.now() - t0

    if (!r.ok) {
      const text = await r.text()
      phCapture(deviceId, 'api_call_failed', { provider: 'removebg', status: r.status, duration_ms: duration })
      let userMessage = "We couldn't process this image. Please try a different photo."
      let status = 502
      try {
        const data = JSON.parse(text)
        const first = (data && (data.errors?.[0] || data.error)) || null
        const code = first?.code
        const title = first?.title || data?.error || ''
        if (code === 'unknown_foreground') {
          userMessage = 'Could not detect a subject. Use a photo with a clear subject and contrasting background.'
          status = 400
        } else if (code === 'file_too_large') {
          userMessage = 'File is too large. Please upload a smaller image.'
          status = 400
        } else if (code === 'usage_limit_exceeded') {
          userMessage = 'API usage limit reached. Please try again later.'
          status = 429
        } else if (typeof title === 'string' && title.trim()) {
          userMessage = title
          status = 400
        }
      } catch {}
      return NextResponse.json({ error: userMessage }, { status })
    }

    const buf = Buffer.from(await r.arrayBuffer())
    phCapture(deviceId, 'api_call_succeeded', { provider: 'removebg', duration_ms: duration, bytes_in: file.size })
    const res = new NextResponse(buf, {
      status: 200,
      headers: { 'Content-Type': 'image/png' }
    })
    if (shouldSetDeviceId && deviceId) {
      res.cookies.set('deviceId', deviceId, { httpOnly: true, sameSite: 'lax', path: '/' })
    }
    return res
  } catch (e) {
    console.error('API Error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
