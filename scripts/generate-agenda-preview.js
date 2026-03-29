const fs = require('node:fs')
const path = require('node:path')

const TIME_ZONE = 'America/Sao_Paulo'

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
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

    venues.push({
      id: id || slugify(instagram),
      name,
    })
  }

  return venues
}

const TITLES = [
  'Tributo Rock 90',
  'Noite Autoral',
  'Especial Classic Rock',
  'Jam Session',
  'Indie e Garage',
  'Acustico no Pub',
  'Hard Night',
  'Banda Convidada',
]

const EXTRA = [
  'DJ after',
  'Double ate 22h',
  'Entrada colaborativa',
  'Happy hour',
  'Couvert no local',
  'Promocao de chopp',
]

function buildSchedule() {
  const venues = getGuideVenues()
  const startDate = getStartDateForSchedule()
  const schedule = {}

  venues.forEach((venue, venueIndex) => {
    const perVenue = {}

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + dayIndex)
      const dateKey = formatDateKey(date)

      const shouldHaveEvent = (venueIndex + dayIndex) % 3 !== 0
      if (!shouldHaveEvent) {
        continue
      }

      const firstTitle = TITLES[(venueIndex + dayIndex) % TITLES.length]
      const secondTitle = EXTRA[(venueIndex + dayIndex) % EXTRA.length]
      const startHour = 19 + ((venueIndex + dayIndex) % 4)
      const items = [`${String(startHour).padStart(2, '0')}:00 - ${firstTitle}`]

      if ((venueIndex + dayIndex) % 2 === 0) {
        items.push(`${String(startHour + 2).padStart(2, '0')}:30 - ${secondTitle}`)
      }

      perVenue[dateKey] = items
    }

    schedule[venue.id] = perVenue
  })

  return schedule
}

function main() {
  const agendaPath = path.join(process.cwd(), 'content', 'agenda.json')
  const payload = {
    generatedAt: `${new Date().toISOString()} (preview)`,
    schedule: buildSchedule(),
  }

  fs.writeFileSync(agendaPath, JSON.stringify(payload, null, 2))
  console.log('Preview da agenda gerado.')
}

main()
