import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import fetch from 'node-fetch'
import FormData from 'form-data'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.static(path.join(__dirname, 'public')))

app.post('/api/remove-bg', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' })

    const form = new FormData()
    form.append('image_file', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype })
    form.append('size', 'preview')

    const apiKey = (process.env.REMOVEBG_KEY || '').trim()
    if (!apiKey) {
      return res.status(500).json({ error: 'Server misconfigured: REMOVEBG_KEY missing' })
    }
    
    const headers = { ...form.getHeaders(), 'X-Api-Key': apiKey }

    const r = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers,
      body: form
    })

    if (!r.ok) {
      const text = await r.text()
      return res.status(502).json({ error: 'Upstream error', detail: text })
    }

    const buf = Buffer.from(await r.arrayBuffer())
    res.setHeader('Content-Type', 'image/png')
    res.send(buf)
  } catch (e) {
    res.status(500).json({ error: 'Server error' })
  }
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`http://localhost:${port}`)
})


