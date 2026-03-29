import fs from 'node:fs'
import path from 'node:path'

export type AgendaData = {
  generatedAt: string | null
  schedule: Record<string, Record<string, string[]>>
}

export function getAgendaData(): AgendaData {
  const agendaPath = path.join(process.cwd(), 'content', 'agenda.json')

  try {
    const raw = fs.readFileSync(agendaPath, 'utf8')
    const parsed = JSON.parse(raw) as AgendaData
    return {
      generatedAt: parsed.generatedAt ?? null,
      schedule: parsed.schedule ?? {},
    }
  } catch {
    return {
      generatedAt: null,
      schedule: {},
    }
  }
}
