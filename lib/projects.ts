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
]
