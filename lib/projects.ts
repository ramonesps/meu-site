export type Project = {
  title: string
  description: string
  tags: string[]
  githubUrl?: string
  liveUrl?: string
}

export const projects: Project[] = [
  {
    title: 'Monitor Imobiliário',
    description:
      'Sistema pessoal que monitora anúncios de venda e aluguel em prédios específicos. Scraping diário de ZAP, VivaReal, OLX, ImovelWeb e imobiliárias locais. Deduplicação por fingerprint + phash, galeria de fotos, histórico de preços.',
    tags: ['Next.js', 'SQLite', 'Playwright', 'Scraping', 'Docker'],
    liveUrl: 'http://137.131.148.77:3000',
    githubUrl: 'https://github.com/ramonepsps/monitor-imobiliario',
  },
  {
    title: 'Claude Agenda',
    description:
      'Agenda semanal dos shows e eventos dos bares de rock de Curitiba. Posts do Instagram analisados por IA (Gemini 2.5 Flash) via Apify, atualização diária automática.',
    tags: ['Curitiba', 'Rock', 'IA', 'Agenda'],
    liveUrl: '/agenda_rock.html',
  },
  {
    title: 'Guia Rock Curitiba',
    description: 'O guia dos bares e casas de rock de Curitiba.',
    tags: ['Curitiba', 'Música', 'Rock', 'Mapa'],
    liveUrl: '/curitiba_rock_guide.html',
  },
  {
    title: 'Pão com Bolinho 2026',
    description:
      'Mapa interativo com os 36 estabelecimentos participantes do 24° Festival de Pão com Bolinho de Curitiba (18 mar – 12 abr 2026). Busca por nome ou bairro, pins numerados e popup com endereço, horário e link para o Google Maps.',
    tags: ['Curitiba', 'Gastronomia', 'Mapa', 'Leaflet'],
    liveUrl: '/festival-pao-bolinho-2026.html',
  },
]
