import fetch from 'node-fetch'
import FormData from 'form-data'
import Busboy from 'busboy'

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { file, filename, mimetype } = await parseMultipart(req)
    if (!file) return res.status(400).json({ error: 'No file' })

    const form = new FormData()
    form.append('image_file', file, { filename, contentType: mimetype })
    form.append('size', 'preview')

    const apiKey = (process.env.REMOVEBG_KEY || '').trim()
    if (!apiKey) return res.status(500).json({ error: 'Server misconfigured: REMOVEBG_KEY missing' })

    const headers = { ...form.getHeaders(), 'X-Api-Key': apiKey }
    const r = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers, body: form })

    if (!r.ok) {
      const text = await r.text()
      return res.status(502).json({ error: 'Upstream error', detail: text })
    }

    const buf = Buffer.from(await r.arrayBuffer())
    res.setHeader('Content-Type', 'image/png')
    return res.status(200).send(buf)
  } catch (e) {
    return res.status(500).json({ error: 'Server error' })
  }
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers })
    let chunks = []
    let filename = ''
    let mimetype = ''

    busboy.on('file', (_name, file, info) => {
      filename = info.filename
      mimetype = info.mimeType
      file.on('data', d => chunks.push(d))
    })

    busboy.on('finish', () => {
      resolve({ file: Buffer.concat(chunks), filename, mimetype })
    })

    busboy.on('error', reject)
    req.pipe(busboy)
  })
}


