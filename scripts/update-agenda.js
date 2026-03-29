const fs = require('node:fs')
const path = require('node:path')

const TIME_ZONE = 'America/Sao_Paulo'

const MONTH_ALIASES = {
  janeiro: 1,
  jan: 1,
  fevereiro: 2,
  fev: 2,
  marco: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  maio: 5,
  mai: 5,
  junho: 6,
  jun: 6,
  julho: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  setembro: 9,
  set: 9,
  outubro: 10,
  out: 10,
  novembro: 11,
  nov: 11,
  dezembro: 12,
  dez: 12,
}

const WEEKDAY_ALIASES = [
  { day: 0, tokens: ['domingo', 'domingos', 'dom'] },
  { day: 1, tokens: ['segunda', 'segundas', 'segunda-feira', 'seg'] },
  { day: 2, tokens: ['terca', 'tercas', 'terca-feira', 'ter'] },
  { day: 3, tokens: ['quarta', 'quartas', 'quarta-feira', 'qua'] },
  { day: 4, tokens: ['quinta', 'quintas', 'quinta-feira', 'qui'] },
  { day: 5, tokens: ['sexta', 'sextas', 'sexta-feira', 'sex'] },
  { day: 6, tokens: ['sabado', 'sabados', 'sab'] },
]

const NOISE_PATTERNS = [
  /^photo (by|shared by)\b/i,
  /^rsa\b/i,
  /\bmay be an image\b/i,
  /\bwww\./i,
  /\bifood\b/i,
  /\bwhats(?:app)?\b/i,
  /\bdiskingressos\b/i,
  /\bingressos?\b/i,
  /\bav\.?\s/i,
  /\brua\s/i,
  /\bcentro\b/i,
  /\bcuritiba\b/i,
]

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeForMatch(text) {
  return `${text || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
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
    // Keep original string if decoding fails.
  }

  return value
}

function cleanWhitespace(text) {
  return repairText(text)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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

function getDateWindow() {
  const start = getStartDateForSchedule()
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

function getGuideVenues() {
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
    const id = slugify(name || instagram)
    const handle = instagram.split('/').filter(Boolean).pop()

    venues.push({
      id: id || slugify(instagram),
      name,
      instagram,
      handle,
    })
  }

  return venues
}

function readAgendaSource() {
  const sourcePath = path.join(process.cwd(), 'content', 'agenda-source.json')

  try {
    const raw = fs.readFileSync(sourcePath, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : { venues: {} }
  } catch {
    return { venues: {} }
  }
}

function buildDateMaps(days) {
  const byNumericToken = new Map()
  const byMonthName = new Map()
  const byWeekday = new Map()

  days.forEach((date) => {
    const dateKey = formatDateKey(date)
    const day = date.getDate()
    const month = date.getMonth() + 1
    const paddedDay = String(day).padStart(2, '0')
    const paddedMonth = String(month).padStart(2, '0')

    ;[
      `${day}/${month}`,
      `${paddedDay}/${paddedMonth}`,
      `${day}.${month}`,
      `${paddedDay}.${paddedMonth}`,
      `${day}-${month}`,
      `${paddedDay}-${paddedMonth}`,
    ].forEach((token) => {
      byNumericToken.set(token, dateKey)
    })

    Object.entries(MONTH_ALIASES).forEach(([alias, aliasMonth]) => {
      if (aliasMonth !== month) {
        return
      }

      byMonthName.set(`${day} ${alias}`, dateKey)
      byMonthName.set(`${day} de ${alias}`, dateKey)
      byMonthName.set(`${paddedDay} ${alias}`, dateKey)
      byMonthName.set(`${paddedDay} de ${alias}`, dateKey)
    })

    byWeekday.set(date.getDay(), dateKey)
  })

  return { byNumericToken, byMonthName, byWeekday }
}

function shouldIgnoreLine(line) {
  if (!line) {
    return true
  }

  if (line.length > 220) {
    return true
  }

  if (NOISE_PATTERNS.some((pattern) => pattern.test(line))) {
    return true
  }

  const letters = (line.match(/[a-zA-ZÀ-ÿ]/g) || []).length
  const digits = (line.match(/\d/g) || []).length
  if (letters < 3) {
    return true
  }

  if (digits > letters) {
    return true
  }

  return false
}

function stripNoise(line) {
  return cleanWhitespace(line)
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\bwww\.\S+/gi, ' ')
    .replace(/#[^\s#]+/g, ' ')
    .replace(/@[^\s@]+/g, ' ')
    .replace(/[|]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function cleanupLabel(line) {
  const cleaned = stripNoise(line)
    .replace(/\b(?:seg|ter|qua|qui|sex|sab|dom)\b\.?/gi, ' ')
    .replace(
      /\b(?:segunda(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sabado|domingo)s?\b/gi,
      ' '
    )
    .replace(/\b\d{1,2}[./-]\d{1,2}\b/g, ' ')
    .replace(
      /\b\d{1,2}(?:\s+de)?\s+(?:janeiro|jan|fevereiro|fev|marco|mar|abril|abr|maio|mai|junho|jun|julho|jul|agosto|ago|setembro|set|outubro|out|novembro|nov|dezembro|dez)\b/gi,
      ' '
    )
    .replace(/\b(?:todo|toda|todos|todas|nos|nas|aos|as)\b/gi, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const shortSentence = cleaned.split(/[.!?]/)[0].trim()
  const label = (shortSentence || cleaned)
    .replace(/^[,:;/-]+/, '')
    .replace(/[,:;/-]+$/, '')
    .trim()

  if (!label) {
    return ''
  }

  if (label.length > 90) {
    return `${label.slice(0, 87).trim()}...`
  }

  return label
}

function extractExplicitDateKeys(line, dateMaps) {
  const normalized = normalizeForMatch(line)
  const matches = new Set()
  let match

  const numericRegex = /\b(\d{1,2})[./-](\d{1,2})\b/g
  while ((match = numericRegex.exec(normalized)) !== null) {
    const day = Number(match[1])
    const month = Number(match[2])
    const dateKey =
      dateMaps.byNumericToken.get(`${day}/${month}`) ||
      dateMaps.byNumericToken.get(`${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`)

    if (dateKey) {
      matches.add(dateKey)
    }
  }

  const textualRegex =
    /\b(\d{1,2})(?:\s+de)?\s+(janeiro|jan|fevereiro|fev|marco|mar|abril|abr|maio|mai|junho|jun|julho|jul|agosto|ago|setembro|set|outubro|out|novembro|nov|dezembro|dez)\b/g
  while ((match = textualRegex.exec(normalized)) !== null) {
    const day = Number(match[1])
    const month = MONTH_ALIASES[match[2]]
    const dateKey =
      dateMaps.byNumericToken.get(`${day}/${month}`) ||
      dateMaps.byMonthName.get(`${day} ${match[2]}`) ||
      dateMaps.byMonthName.get(`${day} de ${match[2]}`)

    if (dateKey) {
      matches.add(dateKey)
    }
  }

  return Array.from(matches)
}

function extractRecurringWeekdayKeys(line, dateMaps) {
  const normalized = normalizeForMatch(line)
  const matches = []

  WEEKDAY_ALIASES.forEach((weekday) => {
    const hasRecurringPhrase = weekday.tokens.some((token) =>
      new RegExp(`\\b(?:todo|toda|todos|todas|nos|nas|aos|as)\\s+${token}\\b`).test(
        normalized
      )
    )

    if (hasRecurringPhrase) {
      const dateKey = dateMaps.byWeekday.get(weekday.day)
      if (dateKey) {
        matches.push(dateKey)
      }
    }
  })

  return matches
}

function extractDenseDateSegments(line, dateMaps) {
  const normalized = normalizeForMatch(line)
  const markerRegex =
    /\b(?:(?:seg|ter|qua|qui|sex|sab|dom)\s+)?\d{1,2}[./-]\d{1,2}\b/g
  const markers = Array.from(normalized.matchAll(markerRegex))

  if (markers.length < 2) {
    return []
  }

  return markers
    .map((marker, index) => {
      const tokenMatch = marker[0].match(/(\d{1,2}[./-]\d{1,2})/)
      if (!tokenMatch) {
        return null
      }

      const [dayRaw, monthRaw] = tokenMatch[1].split(/[./-]/)
      const dateKey =
        dateMaps.byNumericToken.get(`${Number(dayRaw)}/${Number(monthRaw)}`) ||
        null

      if (!dateKey) {
        return null
      }

      const start = marker.index + marker[0].length
      const end =
        index + 1 < markers.length ? markers[index + 1].index : normalized.length
      const segment = line.slice(start, end).trim()
      const label = cleanupLabel(segment)

      if (!label || shouldIgnoreLine(label)) {
        return null
      }

      return { dateKey, label }
    })
    .filter(Boolean)
}

function splitLines(text) {
  return cleanWhitespace(text)
    .replace(/\u2022/g, '\n')
    .split(/\n+/)
    .map((line) => stripNoise(line))
    .filter(Boolean)
}

function addEvent(eventsByDate, dateKey, label) {
  if (!dateKey || !label) {
    return
  }

  if (!eventsByDate[dateKey]) {
    eventsByDate[dateKey] = []
  }

  if (!eventsByDate[dateKey].includes(label)) {
    eventsByDate[dateKey].push(label)
  }
}

function extractEventsFromBlock(text, dateMaps) {
  const eventsByDate = {}
  const lines = splitLines(text)

  lines.forEach((line) => {
    const explicitKeys = extractExplicitDateKeys(line, dateMaps)
    const recurringKeys = extractRecurringWeekdayKeys(line, dateMaps)
    const denseSegments =
      explicitKeys.length > 1 ? extractDenseDateSegments(line, dateMaps) : []

    if (denseSegments.length > 0) {
      denseSegments.forEach((entry) => {
        addEvent(eventsByDate, entry.dateKey, entry.label)
      })
      return
    }

    const keys = explicitKeys.length > 0 ? explicitKeys : recurringKeys

    if (keys.length === 0) {
      extractDenseDateSegments(line, dateMaps).forEach((entry) => {
        addEvent(eventsByDate, entry.dateKey, entry.label)
      })
      return
    }

    const label = cleanupLabel(line)
    if (!label || shouldIgnoreLine(label)) {
      return
    }

    keys.forEach((dateKey) => {
      addEvent(eventsByDate, dateKey, label)
    })
  })

  return eventsByDate
}

function mergeEvents(target, source) {
  Object.entries(source).forEach(([dateKey, items]) => {
    if (!target[dateKey]) {
      target[dateKey] = []
    }

    items.forEach((item) => {
      if (!target[dateKey].includes(item)) {
        target[dateKey].push(item)
      }
    })
  })
}

function formatAnalysisEvent(event) {
  const title = cleanWhitespace(event.title || '')
  if (!title) {
    return ''
  }

  if (event.start_time && /^\d{2}:\d{2}$/.test(event.start_time)) {
    return `${event.start_time} - ${title}`
  }

  return title
}

function filterOutKnownDates(eventsByDate, blockedDates) {
  const filtered = {}

  Object.entries(eventsByDate).forEach(([dateKey, items]) => {
    if (blockedDates.has(dateKey)) {
      return
    }

    filtered[dateKey] = items
  })

  return filtered
}

function extractEventsFromAnalysis(posts) {
  const eventsByDate = {}

  posts.forEach((post) => {
    const analysis = post.analysis
    if (!analysis || !Array.isArray(analysis.events)) {
      return
    }

    analysis.events.forEach((event) => {
      if (!event || event.confidence === 'low') {
        return
      }

      const label = formatAnalysisEvent(event)
      if (!label) {
        return
      }

      addEvent(eventsByDate, event.date, label)
    })
  })

  return eventsByDate
}

function buildSchedule() {
  const venues = getGuideVenues()
  const source = readAgendaSource()
  const dateMaps = buildDateMaps(getDateWindow())
  const schedule = {}

  venues.forEach((venue) => {
    const data =
      (source.venues && (source.venues[venue.handle] || source.venues[venue.id])) ||
      null

    if (!data || !Array.isArray(data.posts)) {
      schedule[venue.id] = {}
      return
    }

    const eventsByDate = {}
    const analysisEvents = extractEventsFromAnalysis(data.posts.slice(0, 5))
    mergeEvents(eventsByDate, analysisEvents)

    data.posts.slice(0, 5).forEach((post) => {
      const hasAnalysisEvents =
        post.analysis &&
        Array.isArray(post.analysis.events) &&
        post.analysis.events.some((event) => event && event.confidence !== 'low')

      if (hasAnalysisEvents) {
        return
      }

      const captionEvents = post.caption
        ? extractEventsFromBlock(post.caption, dateMaps)
        : {}

      mergeEvents(eventsByDate, captionEvents)

      if (post.caption) {
        // Caption has priority whenever it already provides a concrete date.
      }

      if (Array.isArray(post.imagesText)) {
        const captionDates = new Set(Object.keys(captionEvents))
        post.imagesText.forEach((block) => {
          const imageEvents = extractEventsFromBlock(block, dateMaps)
          mergeEvents(eventsByDate, filterOutKnownDates(imageEvents, captionDates))
        })
      }
    })

    schedule[venue.id] = eventsByDate
  })

  return schedule
}

function writeAgenda(schedule) {
  const agendaPath = path.join(process.cwd(), 'content', 'agenda.json')
  const payload = {
    generatedAt: new Date().toISOString(),
    schedule,
  }

  fs.writeFileSync(agendaPath, JSON.stringify(payload, null, 2))
}

function main() {
  const schedule = buildSchedule()
  writeAgenda(schedule)
  console.log('Agenda atualizada.')
}

main()
