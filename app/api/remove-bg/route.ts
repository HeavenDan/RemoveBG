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
      return NextResponse.json({ error: 'Upstream error', detail: text }, { status: 502 })
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
