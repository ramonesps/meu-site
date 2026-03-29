import { getAgendaData } from '@/lib/agenda'
import { getGuideVenues } from '@/lib/venues'

const TIME_ZONE = 'America/Sao_Paulo'

function getNowInTimeZone(timeZone: string) {
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

  const map = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  ) as Record<string, string>

  // Build a local Date with the time-zone-adjusted values.
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

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatColumnLabel(date: Date) {
  const weekday = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    weekday: 'short',
  }).format(date)
  const dayMonth = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
  }).format(date)

  return `${weekday} ${dayMonth}`
}

export default function AgendaGptPage() {
  const venues = getGuideVenues()
  const { schedule, generatedAt } = getAgendaData()
  const startDate = getStartDateForSchedule()
  const hasRealData = Object.values(schedule).some((venueSchedule) =>
    Object.values(venueSchedule).some((items) => items.length > 0)
  )
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return date
  })

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 flex-1">
      <section className="mb-10">
        <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
          Agenda GPT
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 mt-3">
          Programacao semanal (7 dias)
        </h1>
        <p className="text-gray-600 mt-4 max-w-2xl">
          A virada do dia acontece as 06:00. Ate la, a agenda continua
          considerando o dia anterior.
        </p>
      </section>

      <section className="overflow-x-auto border border-gray-200 rounded-2xl">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-4 text-gray-500 font-medium">
                Locais
              </th>
              {days.map((day) => (
                <th
                  key={formatDateKey(day)}
                  className="text-left px-4 py-4 text-gray-600 font-medium"
                >
                  <span className="block text-xs uppercase tracking-wide text-gray-400">
                    {formatColumnLabel(day)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {venues.map((venue) => (
              <tr key={venue.id} className="align-top">
                <td className="px-4 py-5">
                  <div className="font-medium text-gray-900">{venue.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    @{venue.handle}
                  </div>
                </td>
                {days.map((day) => {
                  const key = formatDateKey(day)
                  const items = schedule[venue.id]?.[key] ?? []

                  return (
                    <td key={key} className="px-4 py-5">
                      {items.length === 0 ? (
                        <span className="text-xs text-gray-400">
                          Sem dados
                        </span>
                      ) : (
                        <ul className="space-y-2">
                          {items.map((item) => (
                            <li key={item} className="text-gray-700">
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 text-sm text-gray-500">
        <p>
          {hasRealData
            ? 'Agenda sincronizada a partir dos perfis monitorados.'
            : 'Aguardando a primeira sincronizacao com os dados reais do Instagram.'}
        </p>
        <p className="mt-2">
          Atualizacao: {generatedAt ? generatedAt : 'ainda nao executada'}
        </p>
        {venues.length === 0 && (
          <p className="mt-2">
            Nao foi possivel ler os locais do guia. Verifique o arquivo
            curitiba_rock_guide.html.
          </p>
        )}
      </section>
    </main>
  )
}
