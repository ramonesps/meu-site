const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || 'helloworld'
const OCR_SPACE_ENGINE = process.env.OCR_SPACE_ENGINE || '2'
const TESSERACT_LANG = process.env.TESSERACT_LANG || 'por'

function normalizeText(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function ocrWithOcrSpaceFromUrl(imageUrl) {
  const body = new URLSearchParams({
    apikey: OCR_SPACE_API_KEY,
    language: 'por',
    OCREngine: OCR_SPACE_ENGINE,
    isOverlayRequired: 'false',
    url: imageUrl,
  })

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const data = await response.json()
  if (!response.ok || data.IsErroredOnProcessing) {
    return ''
  }

  if (!Array.isArray(data.ParsedResults)) {
    return ''
  }

  const text = data.ParsedResults.map((result) => (result.ParsedText || '').trim())
    .filter(Boolean)
    .join('\n')
  return normalizeText(text)
}

async function getTesseract() {
  try {
    // Optional dependency for local OCR benchmarking.
    return require('tesseract.js')
  } catch {
    return null
  }
}

async function downloadImage(imageUrl) {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed download ${imageUrl} (HTTP ${response.status})`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const filePath = path.join(os.tmpdir(), `ocr-${Date.now()}-${Math.random()}.img`)
  fs.writeFileSync(filePath, buffer)
  return filePath
}

async function ocrWithTesseractFromUrl(imageUrl) {
  const Tesseract = await getTesseract()
  if (!Tesseract) {
    throw new Error('tesseract.js not installed')
  }

  const filePath = await downloadImage(imageUrl)

  try {
    const result = await Tesseract.recognize(filePath, TESSERACT_LANG)
    return normalizeText(result.data?.text || '')
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }
}

function getOcrProvider(name) {
  if (name === 'ocr-space') {
    return ocrWithOcrSpaceFromUrl
  }
  if (name === 'tesseract-js') {
    return ocrWithTesseractFromUrl
  }
  throw new Error(`Unsupported OCR provider: ${name}`)
}

module.exports = {
  getOcrProvider,
  normalizeText,
}
