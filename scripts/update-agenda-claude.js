/**
 * update-agenda-claude.js
 *
 * Reads content/agenda-source.json (enriched by fetch-instagram-apify-gemini.js
 * with Gemini-extracted analysis.events per post) and assembles the 7-day schedule
 * into public/agenda_rock.json consumed by the Claude Agenda HTML page.
 *
 * No extra API calls — analysis is already done in the fetch step.
 */

const fs = require('node:fs')
const path = require('node:path')

const TIME_ZONE = 'America/Sao_Paulo'

function getNowBRT() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(now)
  const m = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return new Date(`${m.year}-${m.month}-${m.day}T${m.hour}:${m.minute}:${m.second}`)
}

function getWeekWindow() {
  const now = getNowBRT()
  const start = new Date(now)
  if (start.getHours() < 6) start.setDate(start.getDate() - 1)
  start.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function formatDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function readSource() {
  const p = path.join(process.cwd(), 'content', 'agenda-source.json')
  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : { venues: {} }
  } catch { return { venues: {} } }
}

function readCurrentAgenda() {
  const p = path.join(process.cwd(), 'public', 'agenda_rock.json')
  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'))
    return parsed && Array.isArray(parsed.venues) ? parsed : null
  } catch { return null }
}

function aggregateEvents(venueData, validDates) {
  const validSet = new Set(validDates.map(formatDateKey))
  const byDate = {}
  if (!venueData || !Array.isArray(venueData.posts)) return byDate

  for (const post of venueData.posts.slice(0, 5)) {
    const events = post?.analysis?.events
    if (!Array.isArray(events)) continue

    for (const ev of events) {
      if (!ev.date || !validSet.has(ev.date)) continue
      if (ev.confidence === 'low') continue

      if (!byDate[ev.date]) byDate[ev.date] = []
      const isDupe = byDate[ev.date].some(
        (e) => e.name.toLowerCase() === (ev.title || '').toLowerCase()
      )
      if (!isDupe) {
        byDate[ev.date].push({
          name: (ev.title || '').slice(0, 80).trim(),
          time: ev.start_time || null,
          description: null,
        })
      }
    }
  }
  return byDate
}

function main() {
  const weekDates = getWeekWindow()
  const source = readSource()
  const current = readCurrentAgenda()

  if (!current) throw new Error('public/agenda_rock.json not found.')

  const updatedVenues = current.venues.map((venue) => {
    const handle = venue.ig.split('/').filter(Boolean).pop()
    const venueData = source.venues?.[handle] || null
    return { ...venue, events: aggregateEvents(venueData, weekDates) }
  })

  const output = {
    updated_at: new Date().toISOString(),
    week_start: formatDateKey(weekDates[0]),
    model: source.providers?.ai || 'gemini',
    venues: updatedVenues,
  }

  fs.writeFileSync(
    path.join(process.cwd(), 'public', 'agenda_rock.json'),
    JSON.stringify(output, null, 2)
  )

  const total = updatedVenues.reduce((s, v) => s + Object.values(v.events).flat().length, 0)
  console.log(`Agenda Claude atualizada. ${total} eventos encontrados.`)
}

main()
