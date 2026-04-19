const fs = require('node:fs')
const path = require('node:path')

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || ''
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID || 'apify/instagram-api-scraper'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const MAX_POSTS_PER_VENUE = Number(process.env.MAX_POSTS_PER_VENUE || '5')
const MAX_IMAGES_PER_POST = Number(process.env.MAX_IMAGES_PER_POST || '1')
const MAX_VENUES = Number(process.env.MAX_VENUES || '0')
const GEMINI_REQUEST_DELAY_MS = Number(process.env.GEMINI_REQUEST_DELAY_MS || '6500')
const HANDLES_FILTER = (process.env.INSTAGRAM_HANDLES || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

const TIME_ZONE = 'America/Sao_Paulo'

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function repairText(text) {
  const value = `${text || ''}`.replace(/\u0000/g, '').trim()
  if (!value) {
    return ''
  }

  if (!/[ÃÂâð]/.test(value)) {
    return value
  }

  try {
    return Buffer.from(value, 'latin1').toString('utf8').trim()
  } catch {
    return value
  }
}

function cleanTextBlock(text) {
  return repairText(text)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseGuideVenues() {
  const guidePath = path.join(process.cwd(), 'curitiba_rock_guide.html')
  const html = fs.readFileSync(guidePath, 'utf8')
  const localsMatch = html.match(/const LOCAIS = \[[\s\S]*?\];/)

  if (!localsMatch) {
    return []
  }

  const venues = []
  const entryRegex = /nome:"([^"]+)"[\s\S]*?ig:"([^"]+)"/g
  let match

  while ((match = entryRegex.exec(localsMatch[0])) !== null) {
    const name = match[1].trim()
    const instagram = match[2].trim()
    const handle = instagram.split('/').filter(Boolean).pop()
    const id = slugify(name || instagram)

    venues.push({
      id: id || slugify(instagram),
      name,
      instagram,
      handle: handle || slugify(instagram),
    })
  }

  return venues
}

function selectVenues(venues) {
  let filtered = venues

  if (HANDLES_FILTER.length > 0) {
    filtered = filtered.filter((venue) =>
      HANDLES_FILTER.includes(venue.handle.toLowerCase())
    )
  }

  if (MAX_VENUES > 0) {
    filtered = filtered.slice(0, MAX_VENUES)
  }

  return filtered
}

function getNowInTimeZone(timeZone) {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now)

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return new Date(
    `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`
  )
}

function getStartDateForSchedule() {
  const now = getNowInTimeZone(TIME_ZONE)
  const start = new Date(now)

  if (start.getHours() < 6) {
    start.setDate(start.getDate() - 1)
  }

  start.setHours(0, 0, 0, 0)
  return start
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getScheduleWindow() {
  const start = getStartDateForSchedule()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return formatDateKey(date)
  })
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getActorApiPath(actorId) {
  return actorId.replace('/', '~')
}

function readExistingSource() {
  const sourcePath = path.join(process.cwd(), 'content', 'agenda-source.json')

  try {
    return JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
  } catch {
    return null
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    const detail =
      typeof data === 'string'
        ? data
        : JSON.stringify(data && data.error ? data.error : data)
    throw new Error(`${response.status} ${response.statusText}: ${detail}`)
  }

  return data
}

async function runApifyForVenue(venue) {
  const actorPath = getActorApiPath(APIFY_ACTOR_ID)
  const url = `https://api.apify.com/v2/acts/${actorPath}/run-sync-get-dataset-items?clean=1&format=json`
  const input = {
    directUrls: [venue.instagram],
    resultsType: 'posts',
    resultsLimit: MAX_POSTS_PER_VENUE,
    searchType: 'user',
    searchLimit: 1,
  }

  return fetchJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${APIFY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}

function normalizeTimestamp(value) {
  if (!value) {
    return null
  }

  if (typeof value === 'number') {
    const milliseconds = value > 1_000_000_000_000 ? value : value * 1000
    return new Date(milliseconds).toISOString()
  }

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString()
  }

  return null
}

function extractMediaUrlsFromItem(item) {
  const urls = []

  const pushUrl = (value) => {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
      urls.push(value)
    }
  }

  pushUrl(item.displayUrl)
  pushUrl(item.imageUrl)
  pushUrl(item.thumbnailSrc)
  pushUrl(item.mediaDownloadUrl)

  if (Array.isArray(item.images)) {
    item.images.forEach((image) => {
      if (typeof image === 'string') {
        pushUrl(image)
        return
      }

      if (image && typeof image === 'object') {
        pushUrl(image.url)
        pushUrl(image.displayUrl)
        pushUrl(image.src)
      }
    })
  }

  if (Array.isArray(item.childPosts)) {
    item.childPosts.forEach((child) => {
      if (child && typeof child === 'object') {
        pushUrl(child.displayUrl)
        pushUrl(child.imageUrl)
        pushUrl(child.url)
      }
    })
  }

  return Array.from(new Set(urls)).slice(0, Math.max(1, MAX_IMAGES_PER_POST))
}

function normalizeApifyPost(item) {
  const permalink = item.url || item.postUrl || item.inputUrl || null
  const handle =
    item.ownerUsername ||
    item.username ||
    item.author ||
    item.owner?.username ||
    null

  return {
    id: item.shortCode || item.id || permalink || `post-${Date.now()}`,
    caption: cleanTextBlock(item.caption || ''),
    mediaType: item.type || item.mediaType || item.productType || 'UNKNOWN',
    timestamp: normalizeTimestamp(item.timestamp || item.takenAt || item.createdAt),
    permalink,
    images: extractMediaUrlsFromItem(item),
    handle: handle ? handle.toLowerCase() : null,
    raw: {
      ownerUsername: item.ownerUsername || null,
      type: item.type || null,
      shortCode: item.shortCode || null,
    },
  }
}

async function downloadInlineImagePart(imageUrl) {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image ${imageUrl} (${response.status})`)
  }

  const mimeType = response.headers.get('content-type') || 'image/jpeg'
  const buffer = Buffer.from(await response.arrayBuffer())

  return {
    inline_data: {
      mime_type: mimeType.split(';')[0].trim(),
      data: buffer.toString('base64'),
    },
  }
}

function buildGeminiPrompt(venue, post, scheduleWindow) {
  return [
    'Voce extrai agenda de shows e eventos de bares de Curitiba a partir de posts do Instagram.',
    `Local: ${venue.name} (@${venue.handle})`,
    `Janela valida da agenda: ${scheduleWindow.join(', ')}`,
    'Extraia somente eventos que acontecem dentro dessas datas.',
    'Use apenas informacoes explicitamente visiveis na legenda e/ou no flyer.',
    'Ignore endereco, telefone, links, hashtags, patrocinadores e textos promocionais gerais.',
    'Se for uma agenda semanal com varias datas, crie um item por data.',
    'Se o post nao trouxer evento claro nessa janela, retorne events vazio.',
    'O titulo deve ser curto, objetivo e sem o nome do local.',
    'Use horario HH:MM apenas quando estiver explicito. Caso contrario, null.',
    'Considere eventos recorrentes como "todo sabado" apenas para a data correspondente dentro da janela.',
    '',
    'Legenda do post:',
    post.caption || '(sem legenda util)',
  ].join('\n')
}

function buildGeminiSchema() {
  return {
    type: 'object',
    properties: {
      relevant: {
        type: 'boolean',
        description:
          'True only when the post clearly contains at least one event inside the provided date window.',
      },
      events: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            date: {
              type: 'string',
              format: 'date',
              description: 'Event date in YYYY-MM-DD and only within the provided window.',
            },
            title: {
              type: 'string',
              description: 'Short event title or attraction name in PT-BR.',
            },
            start_time: {
              type: ['string', 'null'],
              format: 'time',
              description: 'Start time in HH:MM when explicit, otherwise null.',
            },
            confidence: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Confidence in the extraction.',
            },
            evidence: {
              type: 'string',
              description: 'Very short evidence phrase supporting the extraction.',
            },
          },
          required: ['date', 'title', 'start_time', 'confidence', 'evidence'],
        },
      },
    },
    required: ['relevant', 'events'],
    additionalProperties: false,
  }
}

async function analyzePostWithGemini(venue, post, scheduleWindow) {
  const parts = [{ text: buildGeminiPrompt(venue, post, scheduleWindow) }]

  for (const imageUrl of post.images.slice(0, Math.max(1, MAX_IMAGES_PER_POST))) {
    try {
      const imagePart = await downloadInlineImagePart(imageUrl)
      parts.push(imagePart)
    } catch {
      // Image download is best-effort. Caption-only extraction still works.
    }
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseJsonSchema: buildGeminiSchema(),
    },
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  const body = await response.json()
  if (!response.ok) {
    throw new Error(
      `Gemini ${response.status}: ${JSON.stringify(body.error || body)}`
    )
  }

  const text = body?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim()

  if (!text) {
    return {
      relevant: false,
      events: [],
    }
  }

  const parsed = JSON.parse(text)
  return {
    relevant: Boolean(parsed.relevant),
    events: Array.isArray(parsed.events)
      ? parsed.events.map((event) => ({
          date: event.date,
          title: cleanTextBlock(event.title || ''),
          start_time: event.start_time || null,
          confidence: event.confidence || 'low',
          evidence: cleanTextBlock(event.evidence || ''),
        }))
      : [],
  }
}

function filterPostsForVenue(items, venue) {
  return items
    .map(normalizeApifyPost)
    .filter((post) => {
      if (post.handle && post.handle !== venue.handle.toLowerCase()) {
        return false
      }

      return Boolean(post.permalink || post.caption || post.images.length > 0)
    })
    .slice(0, MAX_POSTS_PER_VENUE)
}

function assertRequiredEnv() {
  const missing = []

  if (!APIFY_API_TOKEN) {
    missing.push('APIFY_API_TOKEN')
  }

  if (!GEMINI_API_KEY) {
    missing.push('GEMINI_API_KEY')
  }

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }
}

async function main() {
  assertRequiredEnv()

  const venues = selectVenues(parseGuideVenues())
  const previousSource = readExistingSource()
  const scheduleWindow = getScheduleWindow()
  const output = previousSource && typeof previousSource === 'object'
    ? {
        ...previousSource,
        generatedAt: new Date().toISOString(),
        providers: {
          instagram: APIFY_ACTOR_ID,
          ai: GEMINI_MODEL,
        },
        errors: [],
      }
    : {
        generatedAt: new Date().toISOString(),
        providers: {
          instagram: APIFY_ACTOR_ID,
          ai: GEMINI_MODEL,
        },
        venues: {},
        errors: [],
      }

  let updatedVenues = 0

  for (const venue of venues) {
    try {
      const items = await runApifyForVenue(venue)
      const posts = filterPostsForVenue(Array.isArray(items) ? items : [], venue)
      const analyzedPosts = []

      for (const post of posts) {
        let analysis = { relevant: false, events: [] }

        try {
          analysis = await analyzePostWithGemini(venue, post, scheduleWindow)
        } catch (error) {
          output.errors.push({
            handle: venue.handle,
            postId: post.id,
            provider: 'gemini',
            message: error instanceof Error ? error.message : 'Gemini analysis failed',
          })
        }

        analyzedPosts.push({
          ...post,
          analysis,
        })

        await sleep(GEMINI_REQUEST_DELAY_MS)
      }

      output.venues[venue.handle] = {
        venueId: venue.id,
        name: venue.name,
        instagram: venue.instagram,
        handle: venue.handle,
        fetchedAt: new Date().toISOString(),
        posts: analyzedPosts,
      }

      updatedVenues += 1
      console.log(`Fetched @${venue.handle} (${analyzedPosts.length} posts)`)
    } catch (error) {
      if (previousSource?.venues?.[venue.handle]) {
        output.venues[venue.handle] = previousSource.venues[venue.handle]
      }

      const message = error instanceof Error ? error.message : 'Apify scrape failed'
      output.errors.push({
        handle: venue.handle,
        provider: 'apify',
        message,
      })
      console.error(`Failed @${venue.handle}: ${message}`)
    }
  }

  if (updatedVenues === 0 && previousSource) {
    const sourcePath = path.join(process.cwd(), 'content', 'agenda-source.json')
    fs.writeFileSync(sourcePath, JSON.stringify(previousSource, null, 2))
    throw new Error('No venue could be refreshed. Previous agenda source was preserved.')
  }

  const sourcePath = path.join(process.cwd(), 'content', 'agenda-source.json')
  fs.writeFileSync(sourcePath, JSON.stringify(output, null, 2))
  console.log('Instagram source updated from Apify + Gemini.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
