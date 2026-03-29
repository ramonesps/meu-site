const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { getOcrProvider } = require('./lib/ocr-providers')

const OCR_PROVIDER = process.env.OCR_PROVIDER || 'tesseract-js'
const MAX_POSTS_PER_VENUE = Number(process.env.MAX_POSTS_PER_VENUE || '5')
const MAX_IMAGES_PER_POST = Number(process.env.MAX_IMAGES_PER_POST || '1')
const MAX_VENUES = Number(process.env.MAX_VENUES || '0')
const HANDLES_FILTER = (process.env.INSTAGRAM_HANDLES || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)


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
    // Keep the original text if re-decoding fails.
  }

  return value
}

function cleanTextBlock(text) {
  return repairText(text)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractAltText(alt) {
  const cleaned = cleanTextBlock(alt)
  if (!cleaned) {
    return ''
  }

  const quotedMatch = cleaned.match(/text that says '([\s\S]+)'\.?$/i)
  if (quotedMatch) {
    return cleanTextBlock(quotedMatch[1])
  }

  if (/^Photo (by|shared by)\b/i.test(cleaned)) {
    return ''
  }

  return cleaned
}

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

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function extractCaptionFromMeta(description, handle) {
  if (!description) {
    return ''
  }

  const cleaned = cleanTextBlock(description)
  const marker = `${handle} on `
  const markerIndex = cleaned.indexOf(marker)
  const quotedStart = cleaned.indexOf('"', markerIndex >= 0 ? markerIndex : 0)
  const quotedEnd = cleaned.lastIndexOf('"')

  if (quotedStart >= 0 && quotedEnd > quotedStart) {
    return cleanTextBlock(cleaned.slice(quotedStart + 1, quotedEnd))
  }

  return cleaned
}

async function extractPostLinks(page, handle) {
  await page.goto(`https://www.instagram.com/${handle}/`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  })
  await page.waitForTimeout(5000)

  if (page.url().includes('/accounts/login')) {
    throw new Error(`Instagram redirected @${handle} to login`)
  }

  const hrefs = await page
    .locator('a[href*="/p/"]')
    .evaluateAll((nodes) => nodes.map((node) => node.href))

  return Array.from(new Set(hrefs)).slice(0, MAX_POSTS_PER_VENUE)
}

async function extractImages(page) {
  const images = await page.locator('img').evaluateAll((nodes) =>
    nodes.map((node) => ({
      alt: node.alt || '',
      src: node.src || '',
    }))
  )

  const relevant = images.filter((image) => {
    if (!image.src) {
      return false
    }

    const alt = image.alt || ''
    return (
      alt.startsWith('Photo by ') ||
      alt.startsWith('Photo shared by ') ||
      alt.includes('May be an image')
    )
  })

  const unique = []
  const seen = new Set()

  relevant.forEach((image) => {
    if (!seen.has(image.src)) {
      seen.add(image.src)
      unique.push(image)
    }
  })

  return unique.slice(0, Math.max(1, MAX_IMAGES_PER_POST))
}

async function extractPostData(browser, url, handle, ocrImageFromUrl) {
  const page = await browser.newPage()

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    })
    await page.waitForTimeout(4000)

    const metaDescription = await page
      .locator('meta[property="og:description"]')
      .getAttribute('content')
      .catch(() => null)
    const publishedTime =
      (await page
        .locator('meta[property="article:published_time"]')
        .getAttribute('content')
        .catch(() => null)) ||
      (await page.locator('time').first().getAttribute('datetime').catch(() => null))

    const caption = extractCaptionFromMeta(metaDescription, handle)
    const images = await extractImages(page)
    const imagesText = []

    images.forEach((image) => {
      const altText = extractAltText(image.alt)
      if (altText) {
        imagesText.push(altText)
      }
    })

    for (const image of images) {
      try {
        const ocrText = await ocrImageFromUrl(image.src)
        if (ocrText) {
          imagesText.push(cleanTextBlock(ocrText))
        }
      } catch {
        // OCR is a best-effort enrichment on top of the page metadata.
      }
      await delay(250)
    }

    return {
      id: url.split('/').filter(Boolean).pop() || url,
      caption,
      mediaType: 'IMAGE',
      timestamp: publishedTime,
      permalink: url,
      images: images.map((image) => image.src),
      imagesText: Array.from(new Set(imagesText.filter(Boolean))),
    }
  } finally {
    await page.close()
  }
}

async function main() {
  const venues = selectVenues(parseGuideVenues())
  const ocrImageFromUrl = getOcrProvider(OCR_PROVIDER)
  const sourcePath = path.join(process.cwd(), 'content', 'agenda-source.json')
  const previousSource = fs.existsSync(sourcePath)
    ? fs.readFileSync(sourcePath, 'utf8')
    : null

  const output = {
    generatedAt: new Date().toISOString(),
    providers: {
      instagram: 'playwright_public_web',
      ocr: OCR_PROVIDER,
    },
    venues: {},
    errors: [],
  }

  const browser = await chromium.launch({
    headless: true,
  })

  try {
    const page = await browser.newPage()

    for (const venue of venues) {
      try {
        const postLinks = await extractPostLinks(page, venue.handle)
        const posts = []

        for (const postLink of postLinks) {
          const post = await extractPostData(browser, postLink, venue.handle, ocrImageFromUrl)
          posts.push(post)
          await delay(500)
        }

        output.venues[venue.handle] = {
          venueId: venue.id,
          name: venue.name,
          instagram: venue.instagram,
          handle: venue.handle,
          fetchedAt: new Date().toISOString(),
          posts,
        }

        console.log(`Fetched @${venue.handle} (${posts.length} posts)`)
        await delay(1200)
      } catch (error) {
        output.errors.push({
          handle: venue.handle,
          message: error instanceof Error ? error.message : 'Unknown error',
        })
        console.error(`Failed @${venue.handle}`)
      }
    }

    await page.close()
  } finally {
    await browser.close()
  }

  const totalPosts = Object.values(output.venues).reduce((sum, venueData) => {
    return sum + (Array.isArray(venueData.posts) ? venueData.posts.length : 0)
  }, 0)

  if (totalPosts === 0 && previousSource) {
    fs.writeFileSync(sourcePath, previousSource)
    throw new Error(
      'Instagram redirected to login and no posts were captured. Previous source was preserved.'
    )
  }

  fs.writeFileSync(sourcePath, JSON.stringify(output, null, 2))
  console.log('Instagram source updated from Playwright.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
