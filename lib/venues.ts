import fs from 'node:fs'
import path from 'node:path'

type Venue = {
  id: string
  name: string
  instagram: string
  handle: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getGuideVenues(): Venue[] {
  const guidePath = path.join(process.cwd(), 'curitiba_rock_guide.html')
  const html = fs.readFileSync(guidePath, 'utf8')

  const localsMatch = html.match(/const LOCAIS = \[[\s\S]*?\];/)
  if (!localsMatch) {
    return []
  }

  const venues: Venue[] = []
  const entryRegex = /nome:"([^"]+)"[\s\S]*?ig:"([^"]+)"/g
  let match: RegExpExecArray | null

  while ((match = entryRegex.exec(localsMatch[0])) !== null) {
    const name = match[1].trim()
    const instagram = match[2].trim()
    const handle = instagram.split('/').filter(Boolean).pop() ?? instagram
    const id = slugify(name || instagram)

    venues.push({
      id: id || slugify(instagram),
      name,
      instagram,
      handle,
    })
  }

  return venues
}
