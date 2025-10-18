import { NextRequest, NextResponse } from 'next/server'
import FormData from 'form-data'
import fetch from 'node-fetch'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    const form = new FormData()
    form.append('image_file', buffer, {
      filename: file.name,
      contentType: file.type
    })
    form.append('size', 'preview')

    const apiKey = (process.env.REMOVEBG_KEY || '').trim()
    if (!apiKey) {
      return NextResponse.json({ error: 'Server misconfigured: REMOVEBG_KEY missing' }, { status: 500 })
    }

    const headers = { ...form.getHeaders(), 'X-Api-Key': apiKey }
    const r = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers,
      body: form
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
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

