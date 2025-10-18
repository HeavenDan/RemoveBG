import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    const apiKey = (process.env.REMOVEBG_KEY || '').trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'Server misconfigured: REMOVEBG_KEY missing' }, { status: 500 })
    }

    const apiFormData = new FormData()
    apiFormData.append('image_file', file)
    apiFormData.append('size', 'preview')

    const r = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey
      },
      body: apiFormData
    })

    if (!r.ok) {
      const text = await r.text()
      return NextResponse.json({ error: 'Upstream error', detail: text }, { status: 502 })
    }

    const buf = Buffer.from(await r.arrayBuffer())
    return new NextResponse(buf, {
      status: 200,
      headers: { 'Content-Type': 'image/png' }
    })
  } catch (e) {
    console.error('API Error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
