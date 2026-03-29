export type Project = {
  title: string
  description: string
  tags: string[]
  githubUrl?: string
  liveUrl?: string
}

export const projects: Project[] = [
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
