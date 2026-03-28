export type Project = {
  title: string
  description: string
  tags: string[]
  githubUrl?: string
  liveUrl?: string
}

export const projects: Project[] = [
  {
    title: 'Concierge Bitcoin',
    description:
      'Serviço de educação e assessoria em Bitcoin co-fundado com Paulo Fuchs. Ajuda clientes a comprar, transferir e armazenar Bitcoin com segurança, além de oferecer conteúdo educacional e suporte personalizado.',
    tags: ['Bitcoin', 'Finanças', 'Educação', 'Empreendedorismo'],
    liveUrl: 'https://conciergebitcoin.com.br',
  },
  {
    title: 'Pão com Bolinho 2026',
    description:
      'Mapa interativo com os 36 estabelecimentos participantes do 24° Festival de Pão com Bolinho de Curitiba (18 mar – 12 abr 2026). Busca por nome ou bairro, pins numerados e popup com endereço, horário e link para o Google Maps.',
    tags: ['Curitiba', 'Gastronomia', 'Mapa', 'Leaflet'],
    liveUrl: '/festival-pao-bolinho-2026.html',
  },
]
