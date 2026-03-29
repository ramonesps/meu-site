const fs = require('node:fs')
const path = require('node:path')
const { getOcrProvider } = require('./lib/ocr-providers')

const IG_API_VERSION = process.env.IG_API_VERSION || 'v23.0'
const IG_USER_ID = process.env.IG_USER_ID
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN
const OCR_PROVIDER = process.env.OCR_PROVIDER || 'ocr-space'
const MAX_POSTS_PER_VENUE = Number(process.env.MAX_POSTS_PER_VENUE || '5')
const MAX_IMAGES_PER_POST = Number(process.env.MAX_IMAGES_PER_POST || '1')

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getFieldsForHandle(handle) {
  return `business_discovery.username(${handle}){username,name,media.limit(${MAX_POSTS_PER_VENUE}){id,caption,media_type,media_url,thumbnail_url,timestamp,permalink,children{media_type,media_url,thumbnail_url}}}`
}

async function fetchBusinessDiscovery(handle) {
  const fields = getFieldsForHandle(handle)
  const endpoint =
    `https://graph.facebook.com/${IG_API_VERSION}/${IG_USER_ID}` +
    `?fields=${encodeURIComponent(fields)}` +
    `&access_token=${encodeURIComponent(IG_ACCESS_TOKEN)}`

  const response = await fetch(endpoint)
  const data = await response.json()

  if (!response.ok || data.error) {
    const message = data.error?.message || `HTTP ${response.status}`
    throw new Error(`Instagram API error for @${handle}: ${message}`)
  }

  return data.business_discovery || null
}

function collectImageUrls(mediaItem) {
  const urls = []

  if (mediaItem.media_type === 'IMAGE' || mediaItem.media_type === 'CAROUSEL_ALBUM') {
    if (mediaItem.media_url) {
      urls.push(mediaItem.media_url)
    }
  }

  if (mediaItem.media_type === 'VIDEO' && mediaItem.thumbnail_url) {
    urls.push(mediaItem.thumbnail_url)
  }

  if (mediaItem.children && Array.isArray(mediaItem.children.data)) {
    mediaItem.children.data.forEach((child) => {
      if (child.media_type === 'IMAGE' && child.media_url) {
        urls.push(child.media_url)
      }
      if (child.media_type === 'VIDEO' && child.thumbnail_url) {
        urls.push(child.thumbnail_url)
      }
    })
  }

  const unique = Array.from(new Set(urls))
  return unique.slice(0, Math.max(1, MAX_IMAGES_PER_POST))
}

async function buildVenuePosts(handle, ocrImageFromUrl) {
  const profile = await fetchBusinessDiscovery(handle)
  if (!profile || !profile.media || !Array.isArray(profile.media.data)) {
    return {
      profileName: null,
      posts: [],
    }
  }

  const posts = []

  for (const mediaItem of profile.media.data.slice(0, MAX_POSTS_PER_VENUE)) {
    const imageUrls = collectImageUrls(mediaItem)
    const imagesText = []

    for (const imageUrl of imageUrls) {
      const text = await ocrImageFromUrl(imageUrl)
      if (text) {
        imagesText.push(text)
      }
      await delay(350)
    }

    posts.push({
      id: mediaItem.id,
      caption: mediaItem.caption || '',
      mediaType: mediaItem.media_type || '',
      timestamp: mediaItem.timestamp || '',
      permalink: mediaItem.permalink || '',
      images: imageUrls,
      imagesText,
    })
  }

  return {
    profileName: profile.name || profile.username || handle,
    posts,
  }
}

async function main() {
  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    throw new Error(
      'Missing env vars. Required: IG_USER_ID, IG_ACCESS_TOKEN.'
    )
  }

  const ocrImageFromUrl = getOcrProvider(OCR_PROVIDER)
  const venues = parseGuideVenues()
  const output = {
    generatedAt: new Date().toISOString(),
    providers: {
      instagram: 'instagram_graph_api',
      ocr: OCR_PROVIDER,
    },
    venues: {},
    errors: [],
  }

  for (const venue of venues) {
    try {
      const venueData = await buildVenuePosts(venue.handle, ocrImageFromUrl)
      output.venues[venue.handle] = {
        venueId: venue.id,
        name: venue.name,
        instagram: venue.instagram,
        handle: venue.handle,
        fetchedAt: new Date().toISOString(),
        posts: venueData.posts,
      }
      console.log(`Fetched @${venue.handle} (${venueData.posts.length} posts)`)
      await delay(500)
    } catch (error) {
      output.errors.push({
        handle: venue.handle,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      console.error(`Failed @${venue.handle}`)
      await delay(500)
    }
  }

  const sourcePath = path.join(process.cwd(), 'content', 'agenda-source.json')
  fs.writeFileSync(sourcePath, JSON.stringify(output, null, 2))
  console.log('Instagram + OCR source updated.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
